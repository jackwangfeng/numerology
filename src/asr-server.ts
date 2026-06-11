/**
 * 独立 WebSocket 服务：浏览器 ⇄ 本服务 ⇄ 豆包双向流式语音识别。
 * 用 tsx 运行（见 launchd com.recompdaily.numerology-asr）。与 Next 主服务共用 SQLite。
 *
 * 协议（浏览器侧）：
 *   连接 /asr-ws（同域，自动带 better-auth cookie 做鉴权）
 *   → 服务端发 {type:'ready'}
 *   浏览器持续发二进制帧 = 16k/16bit/mono 裸 PCM 分块
 *   浏览器发文本 'END' = 录音结束
 *   ← 服务端实时回 {type:'partial'|'final', text} / {type:'error', message}
 */
import './load-env'; // 必须最先执行：在 @/db 建连接前注入 env
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { session as sessionTable } from '@/db/schema';
import { buildRequestFrame, buildAudioFrame, parseFrame, MSG_ERROR } from '@/llm/asr-protocol';

const PORT = Number(process.env.ASR_WS_PORT || 3101);
const ASR_URL = 'wss://openspeech.bytedance.com/api/v3/sauc/bigmodel'; // 双向流式，每包返回 partial

async function validSessionUserId(cookieHeader?: string): Promise<string | null> {
  if (!cookieHeader) return null;
  const c = cookieHeader.split(/;\s*/).find((x) => x.includes('session_token='));
  if (!c) return null;
  const raw = decodeURIComponent(c.slice(c.indexOf('=') + 1));
  const token = raw.split('.')[0]; // 去掉 better-auth 的 .signature
  const [s] = await db.select().from(sessionTable).where(eq(sessionTable.token, token));
  if (!s || s.expiresAt.getTime() < Date.now()) return null;
  return s.userId;
}

function bridge(client: WebSocket) {
  const upstream = new WebSocket(ASR_URL, {
    headers: {
      'X-Api-Key': process.env.ASR_API_KEY ?? '',
      'X-Api-Resource-Id': process.env.ASR_RESOURCE_ID || 'volc.bigasr.sauc.duration',
      'X-Api-Connect-Id': crypto.randomUUID(),
    },
  });
  let seq = 2;
  let lastText = '';
  let ended = false;
  const send = (o: object) => client.readyState === WebSocket.OPEN && client.send(JSON.stringify(o));

  upstream.on('open', () => {
    upstream.send(
      buildRequestFrame({
        user: { uid: 'web' },
        audio: { format: 'pcm', codec: 'raw', rate: 16000, bits: 16, channel: 1 },
        request: { model_name: 'bigmodel', enable_punc: true, enable_itn: true },
      }),
    );
    send({ type: 'ready' });
  });

  upstream.on('message', (data: Buffer) => {
    const f = parseFrame(Buffer.from(data));
    if (f.msgType === MSG_ERROR) {
      send({ type: 'error', message: f.payload.slice(0, 200) });
      return;
    }
    try {
      const j = JSON.parse(f.payload);
      if (j.result?.text) {
        lastText = j.result.text;
        send({ type: f.isLast ? 'final' : 'partial', text: lastText });
      }
    } catch {
      /* 非 JSON 帧忽略 */
    }
    if (f.isLast) {
      send({ type: 'final', text: lastText });
      try { client.close(); } catch { /* noop */ }
      try { upstream.close(); } catch { /* noop */ }
    }
  });

  upstream.on('error', () => send({ type: 'error', message: '语音服务连接失败' }));

  client.on('message', (data: Buffer, isBinary: boolean) => {
    if (!isBinary) {
      if (data.toString() === 'END' && !ended) {
        ended = true;
        if (upstream.readyState === WebSocket.OPEN) upstream.send(buildAudioFrame(Buffer.alloc(0), seq, true));
      }
      return;
    }
    if (upstream.readyState === WebSocket.OPEN) upstream.send(buildAudioFrame(Buffer.from(data), seq++, false));
  });

  client.on('close', () => {
    try { upstream.close(); } catch { /* noop */ }
  });
}

const server = http.createServer((_req, res) => {
  res.writeHead(426).end('Upgrade Required');
});
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', async (req, socket, head) => {
  if (!req.url?.startsWith('/asr-ws')) {
    socket.destroy();
    return;
  }
  const userId = await validSessionUserId(req.headers.cookie).catch(() => null);
  if (!userId) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => bridge(ws));
});

server.listen(PORT, () => console.log(`asr-ws server on :${PORT}`));
