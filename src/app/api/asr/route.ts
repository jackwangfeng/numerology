import { getUser } from '@/lib/session';
import { asrEnabled, recognizePcm } from '@/llm/asr';

/** 16kHz/16bit/mono：60 秒上限 */
const MAX_BYTES = 16000 * 2 * 60;
const MIN_BYTES = 3200; // 0.1s

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });
  if (!asrEnabled()) return Response.json({ error: '语音识别未配置' }, { status: 501 });

  const pcm = Buffer.from(await req.arrayBuffer());
  if (pcm.length < MIN_BYTES) return Response.json({ error: '录音太短，请重试' }, { status: 400 });
  if (pcm.length > MAX_BYTES) return Response.json({ error: '录音最长 60 秒' }, { status: 400 });

  try {
    const text = await recognizePcm(pcm);
    return Response.json({ text });
  } catch (e) {
    console.error('ASR error:', e);
    return Response.json({ error: '识别失败，请重试' }, { status: 502 });
  }
}
