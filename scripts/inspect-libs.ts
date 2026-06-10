/* 排盘库 API 探查：固定输入 公历 1990-03-15 08:30 男 */
import { Solar } from 'lunar-typescript';
import { astro } from 'iztro';

const solar = Solar.fromYmdHms(1990, 3, 15, 8, 30, 0);
const lunar = solar.getLunar();
const ec = lunar.getEightChar();

console.log('=== lunar-typescript ===');
console.log('农历:', lunar.toString());
console.log('四柱:', ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime());
console.log('年柱 十神干:', ec.getYearShiShenGan(), '藏干:', ec.getYearHideGan(), '十神支:', ec.getYearShiShenZhi());
console.log('月柱 十神干:', ec.getMonthShiShenGan(), '藏干:', ec.getMonthHideGan(), '十神支:', ec.getMonthShiShenZhi());
console.log('日柱 藏干:', ec.getDayHideGan(), '十神支:', ec.getDayShiShenZhi());
console.log('时柱 十神干:', ec.getTimeShiShenGan(), '藏干:', ec.getTimeHideGan(), '十神支:', ec.getTimeShiShenZhi());

const yun = ec.getYun(1);
console.log('起运岁数:', yun.getStartYear(), '年', yun.getStartMonth(), '月', '顺逆:', yun.isForward());
console.log(
  '大运:',
  yun
    .getDaYun()
    .slice(0, 5)
    .map((d) => `${d.getGanZhi()}@${d.getStartAge()}岁/${d.getStartYear()}年`)
    .join(' '),
);

const nowLunar = Solar.fromYmd(2026, 6, 11).getLunar();
console.log('2026-06-11 流年(立春):', nowLunar.getYearInGanZhiByLiChun(), '流月:', nowLunar.getMonthInGanZhiExact());

console.log('\n=== iztro ===');
const astrolabe = astro.bySolar('1990-3-15', 4, '男', true, 'zh-CN');
console.log('五行局:', astrolabe.fiveElementsClass);
console.log('命宫支:', astrolabe.earthlyBranchOfSoulPalace, '身宫支:', astrolabe.earthlyBranchOfBodyPalace);
const p0 = astrolabe.palaces[0];
console.log('palace[0] keys:', Object.keys(p0).join(','));
console.log(
  'palace[0]:',
  p0.name,
  p0.heavenlyStem,
  p0.earthlyBranch,
  'major:',
  JSON.stringify(p0.majorStars),
  'minor:',
  JSON.stringify(p0.minorStars),
);
const h = astrolabe.horoscope(new Date(2026, 5, 11));
console.log('horoscope keys:', Object.keys(h).join(','));
console.log('decadal:', h.decadal.heavenlyStem, h.decadal.earthlyBranch, 'yearly:', h.yearly.heavenlyStem, h.yearly.earthlyBranch);
