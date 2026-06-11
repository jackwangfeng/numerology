import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { charts } from '@/db/schema';
import { computeUpcomingYears } from '@/core/bazi';
import type { BaziChart } from '@/core/types';

/** 取命盘并校验归属，非本人或不存在返回 null */
export async function ownedChart(id: string, userId: string) {
  const [chart] = await db.select().from(charts).where(eq(charts.id, id));
  if (!chart || chart.userId !== userId) return null;
  return chart;
}

/** 解析 baziData；老快照缺 upcomingYears 时按当前时间实时补算（流年永远指向当年起的未来三年） */
export function parseBazi(baziJson: string, now: Date): BaziChart {
  const bazi = JSON.parse(baziJson) as BaziChart;
  const birthYear = Number(bazi.solarDateTime.slice(0, 4));
  if (!bazi.upcomingYears?.length) {
    bazi.upcomingYears = computeUpcomingYears(bazi.daYun, birthYear, now);
  }
  return bazi;
}
