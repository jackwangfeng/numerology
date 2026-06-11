/* 大模型流式语音识别 v3 协议探测（用 ws 库带自定义鉴权头） */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { WebSocket } from 'ws';

for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const TOKEN = process.env.ASR_API_KEY;
const APPID = process.env.ASR_APP_ID || '';
const AUTH_MODE = process.argv[2] || 'pair'; // pair | xapikey
const RID = process.argv[3] || 'volc.bigasr.sauc.duration';
const WAV = process.argv[4] || '/tmp/probe.pcm';

const headers =
  AUTH_MODE === 'xapikey'
    ? { 'X-Api-Key': TOKEN, 'X-Api-Resource-Id': RID, 'X-Api-Connect-Id': crypto.randomUUID() }
    : { 'X-Api-App-Key': APPID, 'X-Api-Access-Key': TOKEN, 'X-Api-Resource-Id': RID, 'X-Api-Connect-Id': crypto.randomUUID() };

// 帧构造：header(4) + sequence(4, int32 BE) + size(4) + gzip(payload)
function frame(msgType, flags, seq, payload, serialization) {
  const body = zlib.gzipSync(payload);
  const buf = Buffer.alloc(12 + body.length);
  buf[0] = 0x11;
  buf[1] = (msgType << 4) | flags;
  buf[2] = (serialization << 4) | 0x01; // gzip
  buf[3] = 0x00;
  buf.writeInt32BE(seq, 4);
  buf.writeUInt32BE(body.length, 8);
  body.copy(buf, 12);
  return buf;
}

const reqJson = JSON.stringify({
  user: { uid: 'probe' },
  audio: { format: 'pcm', codec: 'raw', rate: 16000, bits: 16, channel: 1 },
  request: { model_name: 'bigmodel', enable_punc: true, enable_itn: true },
});

const ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel', { headers });
const timeout = setTimeout(() => {
  console.log('TIMEOUT');
  process.exit(2);
}, 20000);

ws.on('unexpected-response', (_req, res) => {
  console.log('handshake rejected:', res.statusCode, JSON.stringify({ msg: res.headers['x-api-message'], code: res.headers['x-api-status-code'], logid: res.headers['x-tt-logid'] }));
  process.exit(1);
});

ws.on('open', async () => {
  console.log('handshake OK:', AUTH_MODE, RID);
  ws.send(frame(0b0001, 0b0001, 1, Buffer.from(reqJson), 0b0001));
  // 按 200ms（6400 字节 @16k/16bit/mono）分包发送
  const audio = fs.readFileSync(WAV);
  const CHUNK = 6400;
  let seq = 2;
  for (let off = 0; off < audio.length; off += CHUNK) {
    const isLast = off + CHUNK >= audio.length;
    const chunk = audio.subarray(off, off + CHUNK);
    ws.send(frame(0b0010, isLast ? 0b0011 : 0b0001, isLast ? -seq : seq, chunk, 0b0000));
    seq++;
    await new Promise((r) => setTimeout(r, 100));
  }
});

ws.on('message', (data) => {
  const buf = Buffer.from(data);
  const msgType = buf[1] >> 4;
  const flags = buf[1] & 0x0f;
  const hasSeq = flags === 0b0001 || flags === 0b0011;
  if (msgType === 0b1111) {
    const size = buf.readUInt32BE(8);
    let payload = buf.subarray(12, 12 + size);
    try { payload = zlib.gunzipSync(payload); } catch { /* 未压缩 */ }
    console.log('ERROR code:', buf.readUInt32BE(4), payload.toString().slice(0, 300));
    process.exit(1);
  }
  const offset = hasSeq ? 12 : 8;
  let payload = buf.subarray(offset);
  try { payload = zlib.gunzipSync(payload); } catch { /* 未压缩 */ }
  const text = payload.toString();
  console.log('resp:', text.slice(0, 300));
  if (flags === 0b0011 || flags === 0b0010) {
    clearTimeout(timeout);
    console.log('FINAL');
    process.exit(0);
  }
});

ws.on('error', (e) => { console.log('ws error:', e.message); process.exit(1); });
