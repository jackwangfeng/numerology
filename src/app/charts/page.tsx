import Link from 'next/link';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { charts } from '@/db/schema';
import { getUser } from '@/lib/session';
import { DeleteChartButton } from '@/components/delete-chart-button';

export const dynamic = 'force-dynamic';

export default async function ChartsPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const rows = await db.select().from(charts).where(eq(charts.userId, user.id)).orderBy(desc(charts.createdAt));

  return (
    <div className="pt-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-kai text-2xl">我的命盘</h1>
        <Link href="/charts/new" className="px-4 py-2 rounded bg-accent text-stone-950 text-sm font-medium hover:bg-amber-400">
          + 新建命盘
        </Link>
      </div>
      {rows.length === 0 ? (
        <div className="text-center text-stone-500 py-24">
          还没有命盘，
          <Link href="/charts/new" className="text-accent hover:underline">
            排一个？
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((c) => (
            <div key={c.id} className="bg-panel border border-line rounded-lg p-5 hover:border-accent-dim transition-colors">
              <Link href={`/charts/${c.id}`} className="block">
                <div className="flex items-baseline justify-between">
                  <span className="font-kai text-lg text-accent">{c.name}</span>
                  <span className="text-xs text-stone-500">{c.gender}</span>
                </div>
                <p className="text-sm text-stone-400 mt-2">
                  {c.calendarType === 'lunar' ? '农历' : '公历'} {c.birthYear}-{c.birthMonth}-{c.birthDay}{' '}
                  {String(c.birthHour).padStart(2, '0')}:{String(c.birthMinute).padStart(2, '0')}
                  {c.isLeapMonth ? '（闰月）' : ''}
                </p>
                <p className="text-xs text-stone-600 mt-1">{c.birthPlace ?? '未填出生地'}</p>
              </Link>
              <div className="mt-3 pt-3 border-t border-line flex justify-end">
                <DeleteChartButton id={c.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
