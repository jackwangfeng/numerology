import type { ZiweiChart } from '@/core/types';

/** 紫微十二宫标准方盘布局：地支 → [行, 列]（1 起始） */
const POS: Record<string, [number, number]> = {
  巳: [1, 1], 午: [1, 2], 未: [1, 3], 申: [1, 4],
  辰: [2, 1], 酉: [2, 4],
  卯: [3, 1], 戌: [3, 4],
  寅: [4, 1], 丑: [4, 2], 子: [4, 3], 亥: [4, 4],
};

export function ZiweiGrid({ chart, name }: { chart: ZiweiChart; name: string }) {
  return (
    <section className="bg-panel border border-line rounded-lg p-5">
      <h2 className="font-kai text-accent text-lg mb-4">紫微斗数</h2>
      <div className="overflow-x-auto">
        <div className="grid grid-cols-4 grid-rows-4 gap-px bg-line border border-line rounded min-w-[560px] text-xs">
          {chart.palaces.map((p) => {
            const [row, col] = POS[p.branch] ?? [1, 1];
            const isSoul = p.branch === chart.soulPalaceBranch;
            return (
              <div
                key={p.branch}
                style={{ gridRow: row, gridColumn: col }}
                className={`bg-panel p-2 min-h-28 flex flex-col ${isSoul ? 'outline outline-1 outline-accent-dim' : ''}`}
              >
                <div className="flex justify-between text-stone-500">
                  <span className={isSoul ? 'text-accent' : ''}>
                    {p.name}
                    {p.isBodyPalace ? '·身' : ''}
                  </span>
                  <span className="font-kai">
                    {p.stem}
                    {p.branch}
                  </span>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  {p.majorStars.length ? (
                    p.majorStars.map((s) => (
                      <div key={s} className="text-accent">
                        {s}
                      </div>
                    ))
                  ) : (
                    <div className="text-stone-600">（借对宫）</div>
                  )}
                  {p.minorStars.map((s) => (
                    <div key={s} className="text-stone-400">
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ gridRow: '2 / span 2', gridColumn: '2 / span 2' }} className="bg-panel flex flex-col items-center justify-center gap-2">
            <div className="font-kai text-xl text-accent">{name}</div>
            <div className="text-stone-400">{chart.fiveElementsClass}</div>
            <div className="text-stone-500">
              命宫在{chart.soulPalaceBranch}　身宫在{chart.bodyPalaceBranch}
            </div>
            <div className="text-stone-500">
              大限 {chart.currentDecadal}　流年 {chart.currentYearly}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
