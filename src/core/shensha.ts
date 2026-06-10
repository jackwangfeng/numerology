import type { Pillar } from './types';

type Pillars = { year: Pillar; month: Pillar; day: Pillar; time: Pillar };

/** 天乙贵人：按日干查贵人支 */
const TIANYI: Record<string, string[]> = {
  甲: ['丑', '未'],
  戊: ['丑', '未'],
  庚: ['丑', '未'],
  乙: ['子', '申'],
  己: ['子', '申'],
  丙: ['亥', '酉'],
  丁: ['亥', '酉'],
  壬: ['巳', '卯'],
  癸: ['巳', '卯'],
  辛: ['午', '寅'],
};

/** 三合局（按年支/日支查）：桃花、驿马 */
const SANHE: Record<string, { taohua: string; yima: string }> = {
  申: { taohua: '酉', yima: '寅' },
  子: { taohua: '酉', yima: '寅' },
  辰: { taohua: '酉', yima: '寅' },
  寅: { taohua: '卯', yima: '申' },
  午: { taohua: '卯', yima: '申' },
  戌: { taohua: '卯', yima: '申' },
  巳: { taohua: '午', yima: '亥' },
  酉: { taohua: '午', yima: '亥' },
  丑: { taohua: '午', yima: '亥' },
  亥: { taohua: '子', yima: '巳' },
  卯: { taohua: '子', yima: '巳' },
  未: { taohua: '子', yima: '巳' },
};

export function computeShenSha(pillars: Pillars): string[] {
  const branches = [pillars.year.zhi, pillars.month.zhi, pillars.day.zhi, pillars.time.zhi];
  const result: string[] = [];

  const guiren = TIANYI[pillars.day.gan] ?? [];
  if (branches.some((b) => guiren.includes(b))) result.push('天乙贵人');

  for (const anchor of [pillars.year.zhi, pillars.day.zhi]) {
    const s = SANHE[anchor];
    if (!s) continue;
    if (branches.includes(s.taohua) && !result.includes('桃花')) result.push('桃花');
    if (branches.includes(s.yima) && !result.includes('驿马')) result.push('驿马');
  }
  return result;
}
