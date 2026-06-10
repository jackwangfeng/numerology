import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { charts, messages, readings } from '@/db/schema';
import { getUser } from '@/lib/session';
import { ownedChart } from '@/lib/charts';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const { id } = await params;
  const chart = await ownedChart(id, user.id);
  if (!chart) return Response.json({ error: '命盘不存在' }, { status: 404 });

  const [latestReading] = await db
    .select()
    .from(readings)
    .where(eq(readings.chartId, id))
    .orderBy(desc(readings.createdAt))
    .limit(1);
  const msgs = await db.select().from(messages).where(eq(messages.chartId, id)).orderBy(asc(messages.createdAt));

  return Response.json({ ...chart, latestReading: latestReading ?? null, messages: msgs });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const { id } = await params;
  const chart = await ownedChart(id, user.id);
  if (!chart) return Response.json({ error: '命盘不存在' }, { status: 404 });

  await db.delete(charts).where(eq(charts.id, id));
  return Response.json({ ok: true });
}
