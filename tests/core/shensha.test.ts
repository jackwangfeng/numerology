import { describe, expect, it } from 'vitest';
import { computeShenSha } from '@/core/shensha';
import type { Pillar } from '@/core/types';

const mk = (ganZhi: string): Pillar => ({
  ganZhi,
  gan: ganZhi[0],
  zhi: ganZhi[1],
  shiShenGan: '',
  hideGan: [],
  shiShenZhi: [],
});

describe('computeShenSha', () => {
  it('天乙贵人：甲日干见丑', () => {
    const r = computeShenSha({ year: mk('庚午'), month: mk('己丑'), day: mk('甲子'), time: mk('丙寅') });
    expect(r).toContain('天乙贵人');
  });

  it('桃花：年支午（寅午戌局）见卯', () => {
    const r = computeShenSha({ year: mk('庚午'), month: mk('己卯'), day: mk('己巳'), time: mk('戊辰') });
    expect(r).toContain('桃花');
  });

  it('驿马：日支子（申子辰局）见寅', () => {
    const r = computeShenSha({ year: mk('辛丑'), month: mk('庚寅'), day: mk('甲子'), time: mk('乙亥') });
    expect(r).toContain('驿马');
  });

  it('全不命中', () => {
    const r = computeShenSha({ year: mk('辛丑'), month: mk('辛丑'), day: mk('丁丑'), time: mk('辛丑') });
    expect(r).toEqual([]);
  });
});
