import { WebSocket } from 'ws';
import { buildAudioFrame, buildRequestFrame, MSG_ERROR, parseFrame } from './asr-protocol';

/** 流式输入模式（nostream）：发完最后一包后返回最终结果，准确率更高 */
const ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel_nostream';
/** 16kHz 16bit mono：200ms = 6400 字节 */
const CHUNK_BYTES = 6400;
const CHUNK_INTERVAL_MS = 30;
const TIMEOUT_MS = 30_000;

export function asrEnabled(): boolean {
  return !!process.env.ASR_API_KEY;
}

/** 识别 16kHz/16bit/mono 裸 PCM，返回最终文本（识别为空返回 ''） */
export function recognizePcm(pcm: Buffer): Promise<string> {
  if (!asrEnabled()) return Promise.reject(new Error('ASR_API_KEY 未配置'));

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(ASR_URL, {
      headers: {
        'X-Api-Key': process.env.ASR_API_KEY!,
        'X-Api-Resource-Id': process.env.ASR_RESOURCE_ID || 'volc.bigasr.sauc.duration',
        'X-Api-Connect-Id': crypto.randomUUID(),
      },
    });

    let lastText = '';
    let settled = false;
    const finish = (fn: () => void) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        fn();
        ws.close();
      }
    };
    const timer = setTimeout(() => finish(() => reject(new Error('ASR 超时'))), TIMEOUT_MS);

    ws.on('unexpected-response', (_req, res) => {
      finish(() => reject(new Error(`ASR 握手失败 ${res.statusCode}: ${res.headers['x-api-message'] ?? ''} logid=${res.headers['x-tt-logid'] ?? ''}`)));
    });

    ws.on('open', async () => {
      ws.send(buildRequestFrame({
        user: { uid: 'suanming-web' },
        audio: { format: 'pcm', codec: 'raw', rate: 16000, bits: 16, channel: 1 },
        request: { model_name: 'bigmodel', enable_punc: true, enable_itn: true },
      }));
      let seq = 2;
      for (let off = 0; off < pcm.length && !settled; off += CHUNK_BYTES) {
        const isLast = off + CHUNK_BYTES >= pcm.length;
        ws.send(buildAudioFrame(pcm.subarray(off, off + CHUNK_BYTES), seq++, isLast));
        if (!isLast) await new Promise((r) => setTimeout(r, CHUNK_INTERVAL_MS));
      }
    });

    ws.on('message', (data) => {
      const frame = parseFrame(Buffer.from(data as Buffer));
      if (frame.msgType === MSG_ERROR) {
        finish(() => reject(new Error(`ASR 错误 ${frame.errorCode}: ${frame.payload.slice(0, 200)}`)));
        return;
      }
      try {
        const json = JSON.parse(frame.payload) as { result?: { text?: string } };
        if (json.result?.text) lastText = json.result.text;
      } catch {
        /* 忽略非 JSON 帧 */
      }
      if (frame.isLast) finish(() => resolve(lastText));
    });

    ws.on('error', (e) => finish(() => reject(e)));
    ws.on('close', () => finish(() => resolve(lastText)));
  });
}
