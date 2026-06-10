import { describe, expect, it } from 'vitest';
import { computeBazi } from '@/core/bazi';
import type { BirthInput } from '@/core/types';

const GANZHI_RE = /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/;
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

describe('computeBazi', () => {
  const chart = computeBazi(input, NOW);

  it('四柱为合法干支（与探查脚本输出一致：庚午 己卯 己卯 戊辰）', () => {
    expect(chart.pillars.year.ganZhi).toBe('庚午');
    expect(chart.pillars.month.ganZhi).toBe('己卯');
    expect(chart.pillars.day.ganZhi).toBe('己卯');
    expect(chart.pillars.time.ganZhi).toBe('戊辰');
    for (const p of Object.values(chart.pillars)) expect(p.ganZhi).toMatch(GANZHI_RE);
  });

  it('日主为日柱天干', () => {
    expect(chart.dayMaster).toBe('己');
    expect(chart.pillars.day.shiShenGan).toBe('日主');
  });

  it('五行计数总和为 8', () => {
    expect(Object.values(chart.wuXingCount).reduce((a, b) => a + b, 0)).toBe(8);
  });

  it('十步大运，起始年等差 10', () => {
    expect(chart.daYun).toHaveLength(10);
    expect(chart.daYun.every((d) => GANZHI_RE.test(d.ganZhi))).toBe(true);
    for (let i = 1; i < 10; i++) expect(chart.daYun[i].startYear - chart.daYun[i - 1].startYear).toBe(10);
  });

  it('2026-06-11 流年为丙午，当前大运为壬午（2017-2026）', () => {
    expect(chart.currentLiuNian).toBe('丙午');
    expect(chart.currentDaYun).toBe('壬午');
  });

  it('整盘快照', () => {
    expect(chart).toMatchSnapshot();
  });
});
