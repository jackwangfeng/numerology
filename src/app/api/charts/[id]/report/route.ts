import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { chartMemories, readings } from '@/db/schema';
import { getUser } from '@/lib/session';
import { ownedChart } from '@/lib/charts';
import { sseResponse } from '@/lib/sse';
import { buildReportMessages, renderChartText } from '@/llm/prompts';
import { arkModel, streamChat } from '@/llm/ark';
import { checkAndConsumeQuota } from '@/llm/quota';
import type { BaziChart, Gender, ZiweiChart } from '@/core/types';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const { id } = await params;
  const chart = await ownedChart(id, user.id);
  if (!chart) return Response.json({ error: '命盘不存在' }, { status: 404 });

  const quota = await checkAndConsumeQuota(db, user.id);
  if (!quota.ok) {
    return Response.json({ error: `今日解读次数已用完（${quota.limit} 次），明天再来吧` }, { status: 429 });
  }

  const bazi = JSON.parse(chart.baziData) as BaziChart;
  const chartText = renderChartText(bazi, JSON.parse(chart.ziweiData) as ZiweiChart, { name: chart.name, gender: chart.gender as Gender });

  // 重新生成报告时带上命主事实库，越用越懂命主
  const facts = await db
    .select({ content: chartMemories.content })
    .from(chartMemories)
    .where(eq(chartMemories.chartId, chart.id))
    .orderBy(desc(chartMemories.createdAt))
    .limit(20);

  const upcoming = (bazi.upcomingYears ?? []).map((y) => y.year);
  return sseResponse(streamChat(buildReportMessages(chartText, facts.map((f) => f.content).reverse(), upcoming)), async (full) => {
    await db.insert(readings).values({
      id: crypto.randomUUID(),
      chartId: chart.id,
      content: full,
      model: arkModel(),
      createdAt: new Date(),
    });
  });
}
