import { after } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { chartMemories, charts, messages, readings } from '@/db/schema';
import { getUser } from '@/lib/session';
import { ownedChart, parseBazi } from '@/lib/charts';
import { sseResponse } from '@/lib/sse';
import { buildChatMessages, renderChartText, type ChatMemory } from '@/llm/prompts';
import { streamChat } from '@/llm/ark';
import { checkAndConsumeQuota } from '@/llm/quota';
import { bufToVec, embedText, topKByCosine, vecToBuf } from '@/llm/embeddings';
import { extractNewFacts, summarizeHistory, type RoundMessage } from '@/llm/memory';
import type { Gender, ZiweiChart } from '@/core/types';

const bodySchema = z.object({ content: z.string().min(1).max(500) });

/** 最近对话窗口：窗口内消息原文进上下文，窗口外靠摘要与向量召回 */
const RECENT_WINDOW = 20;
/** 向量召回条数与相似度下限 */
const RECALL_K = 4;
const RECALL_MIN_SCORE = 0.35;
/** 窗口外未摘要消息攒到这个数就滚动并入摘要 */
const SUMMARIZE_BATCH = 10;
/** 注入上下文的事实条数上限 */
const FACTS_LIMIT = 20;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const { id } = await params;
  const chart = await ownedChart(id, user.id);
  if (!chart) return Response.json({ error: '命盘不存在' }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: '请输入 1-500 字的问题' }, { status: 400 });
  const question = parsed.data.content;

  const quota = await checkAndConsumeQuota(db, user.id);
  if (!quota.ok) {
    return Response.json({ error: `今日解读次数已用完（${quota.limit} 次），明天再来吧` }, { status: 429 });
  }

  const history = await db
    .select({ role: messages.role, content: messages.content, embedding: messages.embedding })
    .from(messages)
    .where(eq(messages.chartId, chart.id))
    .orderBy(asc(messages.createdAt));

  const recent = history.slice(-RECENT_WINDOW) as RoundMessage[];
  const older = history.slice(0, Math.max(0, history.length - RECENT_WINDOW));

  // 第三层：向量召回（embedding 模型未开通时 queryVec 为 null，整层静默跳过）
  const queryVec = await embedText(question);
  const recalled = queryVec
    ? topKByCosine(
        older
          .filter((m) => m.embedding)
          .map((m) => ({ vec: bufToVec(m.embedding as Buffer), item: { role: m.role as 'user' | 'assistant', content: m.content } })),
        queryVec,
        RECALL_K,
        RECALL_MIN_SCORE,
      )
    : [];

  // 第二层：命主事实库
  const facts = await db
    .select({ content: chartMemories.content })
    .from(chartMemories)
    .where(eq(chartMemories.chartId, chart.id))
    .orderBy(desc(chartMemories.createdAt))
    .limit(FACTS_LIMIT);

  const memory: ChatMemory = {
    facts: facts.map((f) => f.content).reverse(),
    summary: chart.memorySummary, // 第一层：滚动摘要
    recalled,
  };

  await db.insert(messages).values({
    id: crypto.randomUUID(),
    chartId: chart.id,
    role: 'user',
    content: question,
    embedding: queryVec ? vecToBuf(queryVec) : null,
    createdAt: new Date(),
  });

  const [latestReading] = await db
    .select({ content: readings.content })
    .from(readings)
    .where(eq(readings.chartId, chart.id))
    .orderBy(desc(readings.createdAt))
    .limit(1);

  const chartText = renderChartText(
    parseBazi(chart.baziData, new Date()),
    JSON.parse(chart.ziweiData) as ZiweiChart,
    { name: chart.name, gender: chart.gender as Gender },
    new Date(),
  );

  const chatMsgs = buildChatMessages(chartText, latestReading?.content ?? null, [...recent, { role: 'user', content: question }], memory);

  return sseResponse(streamChat(chatMsgs), async (full) => {
    await db.insert(messages).values({
      id: crypto.randomUUID(),
      chartId: chart.id,
      role: 'assistant',
      content: full,
      embedding: null, // 响应后异步补
      createdAt: new Date(),
    });

    // 记忆沉淀放在响应结束后执行，不阻塞用户看到 done 事件
    after(async () => {
      try {
        // 补 assistant 消息向量（取最新一条无向量的 assistant 消息）
        const [lastAssistant] = await db
          .select({ id: messages.id, content: messages.content })
          .from(messages)
          .where(eq(messages.chartId, chart.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);
        if (lastAssistant) {
          const v = await embedText(lastAssistant.content);
          if (v) await db.update(messages).set({ embedding: vecToBuf(v) }).where(eq(messages.id, lastAssistant.id));
        }

        // 第二层：从本轮对话抽取新事实
        const newFacts = await extractNewFacts(
          [
            { role: 'user', content: question },
            { role: 'assistant', content: full },
          ],
          memory.facts,
        );
        if (newFacts.length) {
          await db.insert(chartMemories).values(
            newFacts.map((content) => ({ id: crypto.randomUUID(), chartId: chart.id, content, createdAt: new Date() })),
          );
        }

        // 第一层：窗口外未摘要消息攒够一批就滚动并入摘要
        const total = history.length + 2;
        const unsummarized = total - RECENT_WINDOW - chart.summarizedCount;
        if (unsummarized >= SUMMARIZE_BATCH) {
          const batch = history.slice(chart.summarizedCount, total - RECENT_WINDOW) as RoundMessage[];
          const summary = await summarizeHistory(chart.memorySummary, batch);
          await db
            .update(charts)
            .set({ memorySummary: summary, summarizedCount: chart.summarizedCount + batch.length })
            .where(eq(charts.id, chart.id));
        }
      } catch (e) {
        console.error('记忆沉淀失败（不影响对话）:', e);
      }
    });
  });
}
