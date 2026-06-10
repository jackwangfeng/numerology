import type { BaziChart, BirthInput, ZiweiChart } from './types';
import { computeBazi } from './bazi';
import { computeZiwei } from './ziwei';

export function computeCharts(input: BirthInput, now: Date): { bazi: BaziChart; ziwei: ZiweiChart } {
  return { bazi: computeBazi(input, now), ziwei: computeZiwei(input, now) };
}
