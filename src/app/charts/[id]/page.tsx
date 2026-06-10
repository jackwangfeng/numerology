import { notFound, redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { messages, readings } from '@/db/schema';
import { getUser } from '@/lib/session';
import { ownedChart } from '@/lib/charts';
import { BaziTable } from '@/components/bazi-table';
import { ZiweiGrid } from '@/components/ziwei-grid';
import { ReportSection } from '@/components/report-section';
import { ChatBox } from '@/components/chat-box';
import type { BaziChart, ZiweiChart } from '@/core/types';

export const dynamic = 'force-dynamic';

export default async function ChartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) redirect('/login');

  const { id } = await params;
  const chart = await ownedChart(id, user.id);
  if (!chart) notFound();

  const bazi = JSON.parse(chart.baziData) as BaziChart;
  const ziwei = JSON.parse(chart.ziweiData) as ZiweiChart;

  const [latestReading] = await db
    .select()
    .from(readings)
    .where(eq(readings.chartId, id))
    .orderBy(desc(readings.createdAt))
    .limit(1);
  const msgs = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.chartId, id))
    .orderBy(asc(messages.createdAt));

  return (
    <div className="pt-8 space-y-6">
      <div>
        <h1 className="font-kai text-2xl">
          {chart.name} <span className="text-sm text-stone-500">{chart.gender}</span>
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {chart.calendarType === 'lunar' ? '农历' : '公历'} {chart.birthYear}-{chart.birthMonth}-{chart.birthDay}{' '}
          {String(chart.birthHour).padStart(2, '0')}:{String(chart.birthMinute).padStart(2, '0')}
          {chart.isLeapMonth ? '（闰月）' : ''}
          {chart.birthPlace ? `　${chart.birthPlace}（已校正真太阳时）` : ''}　排盘时刻 {bazi.solarDateTime}
        </p>
      </div>
      <BaziTable chart={bazi} />
      <ZiweiGrid chart={ziwei} name={chart.name} />
      <ReportSection chartId={chart.id} initialReport={latestReading?.content ?? null} />
      <ChatBox chartId={chart.id} initialMessages={msgs as { role: 'user' | 'assistant'; content: string }[]} />
    </div>
  );
}
