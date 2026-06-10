import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { messages, readings } from '@/db/schema';
import { getUser } from '@/lib/session';
import { ownedChart } from '@/lib/charts';
import { sseResponse } from '@/lib/sse';
import { buildChatMessages, renderChartText } from '@/llm/prompts';
import { streamChat } from '@/llm/ark';
import { checkAndConsumeQuota } from '@/llm/quota';
import type { BaziChart, Gender, ZiweiChart } from '@/core/types';

const bodySchema = z.object({ content: z.string().min(1).max(500) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const { id } = await params;
  const chart = await ownedChart(id, user.id);
  if (!chart) return Response.json({ error: '命盘不存在' }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: '请输入 1-500 字的问题' }, { status: 400 });

  const quota = await checkAndConsumeQuota(db, user.id);
  if (!quota.ok) {
    return Response.json({ error: `今日解读次数已用完（${quota.limit} 次），明天再来吧` }, { status: 429 });
  }

  const history = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.chartId, chart.id))
    .orderBy(asc(messages.createdAt));

  await db.insert(messages).values({
    id: crypto.randomUUID(),
    chartId: chart.id,
    role: 'user',
    content: parsed.data.content,
    createdAt: new Date(),
  });

  const [latestReading] = await db
    .select({ content: readings.content })
    .from(readings)
    .where(eq(readings.chartId, chart.id))
    .orderBy(desc(readings.createdAt))
    .limit(1);

  const chartText = renderChartText(
    JSON.parse(chart.baziData) as BaziChart,
    JSON.parse(chart.ziweiData) as ZiweiChart,
    { name: chart.name, gender: chart.gender as Gender },
  );

  const chatMsgs = buildChatMessages(chartText, latestReading?.content ?? null, [
    ...(history as { role: 'user' | 'assistant'; content: string }[]),
    { role: 'user', content: parsed.data.content },
  ]);

  return sseResponse(streamChat(chatMsgs), async (full) => {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      chartId: chart.id,
      role: 'assistant',
      content: full,
      createdAt: new Date(),
    });
  });
}
