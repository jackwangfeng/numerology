import { redirect } from 'next/navigation';
import { getUser } from '@/lib/session';
import { ChartForm } from '@/components/chart-form';

export default async function NewChartPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="max-w-lg mx-auto pt-10">
      <h1 className="font-kai text-2xl text-center mb-8">排盘</h1>
      <ChartForm />
    </div>
  );
}
