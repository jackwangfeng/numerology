import { Lunar, Solar } from 'lunar-typescript';
import type { BirthInput } from './types';

export interface ClockTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

/** 真太阳时校正：每偏离东经 120° 一度补 4 分钟，UTC 运算自动处理跨日 */
export function correctTime(year: number, month: number, day: number, hour: number, minute: number, longitude?: number): ClockTime {
  if (longitude == null) return { year, month, day, hour, minute };
  const offsetMin = Math.round((longitude - 120) * 4);
  const d = new Date(Date.UTC(year, month - 1, day, hour, minute + offsetMin));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  };
}

/** iztro 时辰索引：0 早子时 … 12 晚子时 */
export function timeIndexOf(hour: number): number {
  return hour === 23 ? 12 : Math.floor((hour + 1) / 2);
}

/** 输入（含农历/闰月/经度校正）→ 用于排盘的公历时刻 */
export function toPaipanSolar(input: BirthInput): Solar {
  let { year, month, day } = input;
  if (input.calendarType === 'lunar') {
    const lunar = Lunar.fromYmdHms(input.year, input.isLeapMonth ? -input.month : input.month, input.day, input.hour, input.minute, 0);
    const s = lunar.getSolar();
    year = s.getYear();
    month = s.getMonth();
    day = s.getDay();
  }
  const t = correctTime(year, month, day, input.hour, input.minute, input.longitude);
  return Solar.fromYmdHms(t.year, t.month, t.day, t.hour, t.minute, 0);
}
