import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { charts } from '@/db/schema';

/** 取命盘并校验归属，非本人或不存在返回 null */
export async function ownedChart(id: string, userId: string) {
  const [chart] = await db.select().from(charts).where(eq(charts.id, id));
  if (!chart || chart.userId !== userId) return null;
  return chart;
}
