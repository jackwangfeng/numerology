import { describe, expect, it } from 'vitest';
import { floatTo16BitPcm, mergeChunks, resampleLinear } from '@/lib/pcm';

describe('pcm 工具', () => {
  it('同采样率原样返回', () => {
    const a = Float32Array.from([0.1, 0.2]);
    expect(resampleLinear(a, 16000, 16000)).toBe(a);
  });

  it('48k→16k 长度变为 1/3', () => {
    const out = resampleLinear(new Float32Array(4800), 48000, 16000);
    expect(out.length).toBe(1600);
  });

  it('floatTo16BitPcm：边界与小端', () => {
    const buf = floatTo16BitPcm(Float32Array.from([1, -1, 0]));
    const view = new DataView(buf);
    expect(view.getInt16(0, true)).toBe(0x7fff);
    expect(view.getInt16(2, true)).toBe(-0x8000);
    expect(view.getInt16(4, true)).toBe(0);
  });

  it('mergeChunks 拼接', () => {
    const out = mergeChunks([Float32Array.from([1]), Float32Array.from([2, 3])]);
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });
});
