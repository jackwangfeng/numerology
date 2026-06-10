import { describe, expect, it } from 'vitest';
import { correctTime, timeIndexOf, toPaipanSolar } from '@/core/calendar';
import type { BirthInput } from '@/core/types';

const base: BirthInput = {
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

describe('correctTime 真太阳时校正', () => {
  it('不传经度原样返回', () => {
    expect(correctTime(1990, 3, 15, 8, 30)).toEqual({ year: 1990, month: 3, day: 15, hour: 8, minute: 30 });
  });

  it('北京 116.41°E：-14 分钟', () => {
    expect(correctTime(1990, 3, 15, 8, 30, 116.41)).toEqual({ year: 1990, month: 3, day: 15, hour: 8, minute: 16 });
  });

  it('乌鲁木齐 87.62°E：-130 分钟，跨日', () => {
    expect(correctTime(1990, 3, 15, 0, 5, 87.62)).toEqual({ year: 1990, month: 3, day: 14, hour: 21, minute: 55 });
  });
});

describe('timeIndexOf 时辰索引', () => {
  it('早子时/丑时/亥时/晚子时', () => {
    expect(timeIndexOf(0)).toBe(0);
    expect(timeIndexOf(1)).toBe(1);
    expect(timeIndexOf(8)).toBe(4);
    expect(timeIndexOf(22)).toBe(11);
    expect(timeIndexOf(23)).toBe(12);
  });
});

describe('toPaipanSolar', () => {
  it('公历直通', () => {
    const s = toPaipanSolar(base);
    expect(s.toYmdHms()).toBe('1990-03-15 08:30:00');
  });

  it('农历 2023 闰二月初一 → 公历 2023-03-22', () => {
    const s = toPaipanSolar({ ...base, calendarType: 'lunar', year: 2023, month: 2, day: 1, isLeapMonth: true, hour: 10, minute: 0 });
    expect(s.toYmd()).toBe('2023-03-22');
  });

  it('农历非闰月正常转换：2023 二月初一 → 2023-02-20', () => {
    const s = toPaipanSolar({ ...base, calendarType: 'lunar', year: 2023, month: 2, day: 1, isLeapMonth: false, hour: 10, minute: 0 });
    expect(s.toYmd()).toBe('2023-02-20');
  });
});
