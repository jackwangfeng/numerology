import type { BaziChart } from '@/core/types';

const LABELS = ['年柱', '月柱', '日柱', '时柱'] as const;

export function BaziTable({ chart }: { chart: BaziChart }) {
  const ps = [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.time];

  return (
    <section className="bg-panel border border-line rounded-lg p-5">
      <h2 className="font-kai text-accent text-lg mb-4">八字命盘</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-sm min-w-[420px]">
          <thead>
            <tr className="text-stone-500">
              <th className="py-1.5 font-normal w-16"></th>
              {LABELS.map((l) => (
                <th key={l} className="py-1.5 font-normal">
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="text-stone-500 text-xs">
              <td>十神</td>
              {ps.map((p, i) => (
                <td key={i} className="py-1">
                  {p.shiShenGan}
                </td>
              ))}
            </tr>
            <tr className="font-kai text-2xl">
              <td className="text-xs font-sans text-stone-500">天干</td>
              {ps.map((p, i) => (
                <td key={i} className={`py-1.5 ${i === 2 ? 'text-accent' : ''}`}>
                  {p.gan}
                </td>
              ))}
            </tr>
            <tr className="font-kai text-2xl">
              <td className="text-xs font-sans text-stone-500">地支</td>
              {ps.map((p, i) => (
                <td key={i} className="py-1.5">
                  {p.zhi}
                </td>
              ))}
            </tr>
            <tr className="text-stone-400 text-xs">
              <td className="text-stone-500">藏干</td>
              {ps.map((p, i) => (
                <td key={i} className="py-1.5 leading-5">
                  {p.hideGan.map((g, j) => (
                    <div key={j}>
                      {g} <span className="text-stone-600">{p.shiShenZhi[j]}</span>
                    </div>
                  ))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-line text-sm text-stone-400 space-y-2">
        <p>
          日主 <span className="text-accent font-kai">{chart.dayMaster}</span>　五行：
          {Object.entries(chart.wuXingCount)
            .map(([k, v]) => `${k}${v}`)
            .join(' ')}
          　神煞：{chart.shenSha.length ? chart.shenSha.join('、') : '—'}
        </p>
        <p>
          {chart.yun.startAge} 岁起运（{chart.yun.forward ? '顺行' : '逆行'}）　当前大运：
          <span className="text-accent">{chart.currentDaYun ?? '未起运'}</span>
        </p>
        {chart.upcomingYears?.length ? (
          <p>
            未来三年流年：
            {chart.upcomingYears.map((y, i) => (
              <span key={y.year} className="text-accent">
                {i > 0 && '、'}
                {y.year} {y.ganZhi}
                {i === 0 && '（今年）'}
              </span>
            ))}
          </p>
        ) : null}
        <div className="flex gap-2 overflow-x-auto pt-1">
          {chart.daYun.map((d) => (
            <div
              key={d.startYear}
              className={`shrink-0 text-center border rounded px-2 py-1.5 ${d.ganZhi === chart.currentDaYun ? 'border-accent text-accent' : 'border-line'}`}
            >
              <div className="font-kai">{d.ganZhi}</div>
              <div className="text-[10px] text-stone-500">
                {d.startAge}岁
                <br />
                {d.startYear}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
