import { astro } from 'iztro';
import type { BirthInput, ZiweiChart } from './types';
import { timeIndexOf, toPaipanSolar } from './calendar';

interface StarLike {
  name: string;
  brightness?: string;
  mutagen?: string;
}

const starText = (s: StarLike) => `${s.name}${s.brightness ? `(${s.brightness})` : ''}${s.mutagen ? `[化${s.mutagen}]` : ''}`;

export function computeZiwei(input: BirthInput, now: Date): ZiweiChart {
  const solar = toPaipanSolar(input);
  const dateStr = `${solar.getYear()}-${solar.getMonth()}-${solar.getDay()}`;
  const astrolabe = astro.bySolar(dateStr, timeIndexOf(solar.getHour()), input.gender, true, 'zh-CN');

  const palaces = astrolabe.palaces.map((p) => ({
    name: p.name,
    branch: p.earthlyBranch,
    stem: p.heavenlyStem,
    isBodyPalace: p.isBodyPalace,
    majorStars: p.majorStars.map(starText),
    minorStars: p.minorStars.map(starText),
  }));

  const h = astrolabe.horoscope(now);

  return {
    fiveElementsClass: astrolabe.fiveElementsClass,
    soulPalaceBranch: astrolabe.earthlyBranchOfSoulPalace,
    bodyPalaceBranch: astrolabe.earthlyBranchOfBodyPalace,
    palaces,
    currentDecadal: `${h.decadal.heavenlyStem}${h.decadal.earthlyBranch}`,
    currentYearly: `${h.yearly.heavenlyStem}${h.yearly.earthlyBranch}`,
  };
}
