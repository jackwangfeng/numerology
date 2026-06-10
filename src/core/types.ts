export type Gender = '男' | '女';
export type CalendarType = 'solar' | 'lunar';

export interface BirthInput {
  name: string;
  gender: Gender;
  calendarType: CalendarType;
  /** 农历输入时为农历年月日 */
  year: number;
  month: number;
  day: number;
  /** 0-23 本地钟表时间 */
  hour: number;
  minute: number;
  isLeapMonth: boolean;
  /** 出生地经度，用于真太阳时校正 */
  longitude?: number;
}

export interface Pillar {
  ganZhi: string;
  gan: string;
  zhi: string;
  shiShenGan: string;
  hideGan: string[];
  shiShenZhi: string[];
}

export interface DaYunItem {
  ganZhi: string;
  startAge: number;
  startYear: number;
}

export interface BaziChart {
  /** 校正后用于排盘的公历时间 */
  solarDateTime: string;
  lunarDateText: string;
  pillars: { year: Pillar; month: Pillar; day: Pillar; time: Pillar };
  dayMaster: string;
  wuXingCount: Record<string, number>;
  shenSha: string[];
  yun: { startAge: number; startYear: number; forward: boolean };
  daYun: DaYunItem[];
  currentDaYun: string | null;
  currentLiuNian: string;
}

export interface ZiweiPalace {
  name: string;
  branch: string;
  stem: string;
  isBodyPalace: boolean;
  majorStars: string[];
  minorStars: string[];
}

export interface ZiweiChart {
  fiveElementsClass: string;
  soulPalaceBranch: string;
  bodyPalaceBranch: string;
  palaces: ZiweiPalace[];
  currentDecadal: string;
  currentYearly: string;
}
