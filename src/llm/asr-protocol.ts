import zlib from 'node:zlib';

/**
 * 豆包大模型流式语音识别 v3 WebSocket 二进制协议
 * 帧结构：header(4) [+ sequence(4)] + payload_size(4) + payload
 * 错误帧：header(4) + error_code(4) + payload_size(4) + payload
 */

export const MSG_FULL_REQUEST = 0b0001;
export const MSG_AUDIO_ONLY = 0b0010;
export const MSG_FULL_RESPONSE = 0b1001;
export const MSG_ERROR = 0b1111;

export const FLAG_POS_SEQ = 0b0001;
export const FLAG_LAST_NO_SEQ = 0b0010;
export const FLAG_NEG_SEQ = 0b0011;

const SERIALIZATION_NONE = 0b0000;
const SERIALIZATION_JSON = 0b0001;

export function buildFrame(msgType: number, flags: number, seq: number, payload: Buffer, serialization: number): Buffer {
  const body = zlib.gzipSync(payload);
  const buf = Buffer.alloc(12 + body.length);
  buf[0] = 0x11; // version 1, header size 1x4
  buf[1] = (msgType << 4) | flags;
  buf[2] = (serialization << 4) | 0x01; // gzip
  buf[3] = 0x00;
  buf.writeInt32BE(seq, 4);
  buf.writeUInt32BE(body.length, 8);
  body.copy(buf, 12);
  return buf;
}

export function buildRequestFrame(config: object): Buffer {
  return buildFrame(MSG_FULL_REQUEST, FLAG_POS_SEQ, 1, Buffer.from(JSON.stringify(config)), SERIALIZATION_JSON);
}

export function buildAudioFrame(chunk: Buffer, seq: number, isLast: boolean): Buffer {
  return buildFrame(MSG_AUDIO_ONLY, isLast ? FLAG_NEG_SEQ : FLAG_POS_SEQ, isLast ? -seq : seq, chunk, SERIALIZATION_NONE);
}

export interface ParsedFrame {
  msgType: number;
  flags: number;
  isLast: boolean;
  errorCode?: number;
  payload: string;
}

function maybeGunzip(buf: Buffer): Buffer {
  try {
    return zlib.gunzipSync(buf);
  } catch {
    return buf; // 部分帧申明压缩实际未压缩
  }
}

export function parseFrame(data: Buffer): ParsedFrame {
  const msgType = data[1] >> 4;
  const flags = data[1] & 0x0f;
  if (msgType === MSG_ERROR) {
    return {
      msgType,
      flags,
      isLast: true,
      errorCode: data.readUInt32BE(4),
      payload: maybeGunzip(data.subarray(12)).toString(),
    };
  }
  const hasSeq = (flags & 0b0001) === 1;
  const offset = hasSeq ? 12 : 8;
  return {
    msgType,
    flags,
    isLast: flags === FLAG_NEG_SEQ || flags === FLAG_LAST_NO_SEQ,
    payload: maybeGunzip(data.subarray(offset)).toString(),
  };
}
