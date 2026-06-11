import { Solar } from 'lunar-typescript';
import type { BaziChart, BirthInput, DaYunItem, Pillar } from './types';
import { toPaipanSolar } from './calendar';
import { computeShenSha } from './shensha';

const GAN_WUXING: Record<string, string> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const ZHI_WUXING: Record<string, string> = {
  子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水',
};

/**
 * 流年只看未来：当年 + 未来两年。每年取年中（6/1，必过立春）算干支并标注所属大运。
 * 抽成独立函数，供老命盘（快照缺该字段）在读取时实时兜底重建。
 */
export function computeUpcomingYears(
  daYun: DaYunItem[],
  birthYear: number,
  now: Date,
): BaziChart['upcomingYears'] {
  const nowYear = now.getFullYear();
  return [0, 1, 2].map((offset) => {
    const year = nowYear + offset;
    const dy = daYun.find((d) => d.startYear <= year && year < d.startYear + 10);
    return {
      year,
      age: year - birthYear + 1, // 虚岁
      ganZhi: Solar.fromYmd(year, 6, 1).getLunar().getYearInGanZhiByLiChun(),
      daYun: dy?.ganZhi ?? null,
    };
  });
}

export function computeBazi(input: BirthInput, now: Date): BaziChart {
  const solar = toPaipanSolar(input);
  const lunar = solar.getLunar();
  const ec = lunar.getEightChar();

  const mk = (ganZhi: string, shiShenGan: string, hideGan: string[], shiShenZhi: string[]): Pillar => ({
    ganZhi,
    gan: ganZhi[0],
    zhi: ganZhi[1],
    shiShenGan,
    hideGan,
    shiShenZhi,
  });

  const pillars = {
    year: mk(ec.getYear(), ec.getYearShiShenGan(), ec.getYearHideGan(), ec.getYearShiShenZhi()),
    month: mk(ec.getMonth(), ec.getMonthShiShenGan(), ec.getMonthHideGan(), ec.getMonthShiShenZhi()),
    day: mk(ec.getDay(), '日主', ec.getDayHideGan(), ec.getDayShiShenZhi()),
    time: mk(ec.getTime(), ec.getTimeShiShenGan(), ec.getTimeHideGan(), ec.getTimeShiShenZhi()),
  };

  const wuXingCount: Record<string, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of Object.values(pillars)) {
    wuXingCount[GAN_WUXING[p.gan]]++;
    wuXingCount[ZHI_WUXING[p.zhi]]++;
  }

  const yun = ec.getYun(input.gender === '男' ? 1 : 0);
  const daYun = yun
    .getDaYun(11)
    .slice(1, 11)
    .map((d) => ({ ganZhi: d.getGanZhi(), startAge: d.getStartAge(), startYear: d.getStartYear() }));

  const nowYear = now.getFullYear();
  const current = daYun.find((d) => d.startYear <= nowYear && nowYear < d.startYear + 10);
  const upcomingYears = computeUpcomingYears(daYun, solar.getYear(), now);

  return {
    solarDateTime: solar.toYmdHms(),
    lunarDateText: lunar.toString(),
    pillars,
    dayMaster: pillars.day.gan,
    wuXingCount,
    shenSha: computeShenSha(pillars),
    yun: { startAge: daYun[0]?.startAge ?? 0, startYear: daYun[0]?.startYear ?? 0, forward: yun.isForward() },
    daYun,
    currentDaYun: current?.ganZhi ?? null,
    currentLiuNian: Solar.fromYmd(nowYear, 6, 1).getLunar().getYearInGanZhiByLiChun(),
    upcomingYears,
  };
}
