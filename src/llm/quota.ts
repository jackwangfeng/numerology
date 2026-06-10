import { and, count, eq, gte } from 'drizzle-orm';
import type { Db } from '@/db';
import { llmUsage } from '@/db/schema';

export interface QuotaResult {
  ok: boolean;
  used: number;
  limit: number;
}

/** 检查并消耗一次当日配额。达到上限返回 ok:false 且不消耗。 */
export async function checkAndConsumeQuota(
  db: Db,
  userId: string,
  limit = Number(process.env.DAILY_LLM_LIMIT ?? 20),
): Promise<QuotaResult> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ value: used }] = await db
    .select({ value: count() })
    .from(llmUsage)
    .where(and(eq(llmUsage.userId, userId), gte(llmUsage.createdAt, startOfDay)));

  if (used >= limit) return { ok: false, used, limit };

  await db.insert(llmUsage).values({ id: crypto.randomUUID(), userId, createdAt: new Date() });
  return { ok: true, used: used + 1, limit };
}
