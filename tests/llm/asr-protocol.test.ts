import { describe, expect, it } from 'vitest';
import zlib from 'node:zlib';
import {
  buildAudioFrame,
  buildRequestFrame,
  FLAG_NEG_SEQ,
  FLAG_POS_SEQ,
  MSG_AUDIO_ONLY,
  MSG_ERROR,
  MSG_FULL_REQUEST,
  parseFrame,
} from '@/llm/asr-protocol';

describe('asr-protocol', () => {
  it('请求帧：头部字段与 payload 往返', () => {
    const f = buildRequestFrame({ a: 1 });
    expect(f[0]).toBe(0x11);
    expect(f[1] >> 4).toBe(MSG_FULL_REQUEST);
    expect(f[1] & 0x0f).toBe(FLAG_POS_SEQ);
    expect(f.readInt32BE(4)).toBe(1);
    expect(JSON.parse(zlib.gunzipSync(f.subarray(12)).toString())).toEqual({ a: 1 });
  });

  it('音频帧：末包为负 sequence', () => {
    const mid = buildAudioFrame(Buffer.from([1, 2]), 5, false);
    expect(mid[1] & 0x0f).toBe(FLAG_POS_SEQ);
    expect(mid.readInt32BE(4)).toBe(5);
    const last = buildAudioFrame(Buffer.from([1, 2]), 6, true);
    expect(last[1] & 0x0f).toBe(FLAG_NEG_SEQ);
    expect(last.readInt32BE(4)).toBe(-6);
  });

  it('解析服务端响应帧（带 seq + gzip）', () => {
    const payload = zlib.gzipSync(Buffer.from('{"result":{"text":"你好"}}'));
    const buf = Buffer.alloc(12 + payload.length);
    buf[0] = 0x11;
    buf[1] = (0b1001 << 4) | FLAG_NEG_SEQ;
    buf[2] = 0x11;
    buf.writeInt32BE(-3, 4);
    buf.writeUInt32BE(payload.length, 8);
    payload.copy(buf, 12);
    const frame = parseFrame(buf);
    expect(frame.isLast).toBe(true);
    expect(JSON.parse(frame.payload).result.text).toBe('你好');
  });

  it('解析错误帧（含错误码，未压缩 payload）', () => {
    const msg = Buffer.from('{"error":"bad"}');
    const buf = Buffer.alloc(12 + msg.length);
    buf[0] = 0x11;
    buf[1] = MSG_ERROR << 4;
    buf[2] = 0x10;
    buf.writeUInt32BE(45000151, 4);
    buf.writeUInt32BE(msg.length, 8);
    msg.copy(buf, 12);
    const frame = parseFrame(buf);
    expect(frame.errorCode).toBe(45000151);
    expect(frame.payload).toContain('bad');
    expect(frame.msgType).toBe(MSG_ERROR);
    expect(frame.msgType === MSG_AUDIO_ONLY).toBe(false);
  });
});
