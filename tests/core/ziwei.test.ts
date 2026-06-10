import { describe, expect, it } from 'vitest';
import { computeZiwei } from '@/core/ziwei';
import { computeCharts } from '@/core/paipan';
import type { BirthInput } from '@/core/types';

const NOW = new Date(2026, 5, 11);

const input: BirthInput = {
  name: '测试',
  gender: '男',
  calendarType: 'solar',
  year: 1990,
  month: 3,
  day: 15,
  hour: 8,
  minute: 30,
  isLeapMonth: false,
};

describe('computeZiwei', () => {
  const chart = computeZiwei(input, NOW);

  it('十二宫齐全且地支不重复', () => {
    expect(chart.palaces).toHaveLength(12);
    expect(new Set(chart.palaces.map((p) => p.branch)).size).toBe(12);
  });

  it('包含核心宫位名', () => {
    const names = chart.palaces.map((p) => p.name);
    for (const n of ['命宫', '夫妻', '财帛', '官禄']) {
      expect(names.some((x) => x.includes(n))).toBe(true);
    }
  });

  it('命宫身宫与五行局（与探查脚本一致：亥/未/土五局）', () => {
    expect(chart.soulPalaceBranch).toBe('亥');
    expect(chart.bodyPalaceBranch).toBe('未');
    expect(chart.fiveElementsClass).toBe('土五局');
    expect(chart.palaces.map((p) => p.branch)).toContain(chart.soulPalaceBranch);
  });

  it('当前大限流年非空（流年丙午）', () => {
    expect(chart.currentYearly).toBe('丙午');
    expect(chart.currentDecadal).toMatch(/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  });

  it('整盘快照', () => {
    expect(chart).toMatchSnapshot();
  });
});

describe('computeCharts', () => {
  it('返回八字与紫微两盘', () => {
    const { bazi, ziwei } = computeCharts(input, NOW);
    expect(bazi.pillars.year.ganZhi).toBe('庚午');
    expect(ziwei.palaces).toHaveLength(12);
  });
});
