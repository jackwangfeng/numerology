'use client';
import { useRef, useState } from 'react';
import { floatTo16BitPcm, mergeChunks, resampleLinear } from '@/lib/pcm';

const TARGET_RATE = 16000;
const MAX_SECONDS = 60;

type Phase = 'idle' | 'recording' | 'busy';

/**
 * 语音输入按钮：浏览器录音 → 16k PCM → 服务端豆包流式识别。
 * 识别出的文本通过 onText 回调。所有现代浏览器可用（需 HTTPS 或 localhost）。
 */
export function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const rateRef = useRef(TARGET_RATE);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前环境不支持录音（需 HTTPS 或 localhost）');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      rateRef.current = ctx.sampleRate;
      processor.onaudioprocess = (e) => {
        chunksRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      ctxRef.current = ctx;
      streamRef.current = stream;
      setPhase('recording');
      stopTimerRef.current = setTimeout(stop, MAX_SECONDS * 1000);
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError') setError('麦克风被浏览器拦截：点地址栏左侧图标，把麦克风改为「允许」后重试');
      else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') setError('未检测到麦克风设备');
      else if (name === 'NotReadableError') setError('麦克风被其他程序占用，请关闭后重试');
      else setError(`无法录音：${name || (e as Error)?.message || '未知错误'}`);
      setPhase('idle');
    }
  }

  async function stop() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    await ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    streamRef.current = null;

    const merged = mergeChunks(chunksRef.current);
    chunksRef.current = [];
    if (merged.length / rateRef.current < 0.3) {
      setPhase('idle');
      setError('没听清，请再说一次');
      return;
    }
    setPhase('busy');
    try {
      const pcm = floatTo16BitPcm(resampleLinear(merged, rateRef.current, TARGET_RATE));
      const res = await fetch('/api/asr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pcm,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '识别失败，请重试');
      } else if (data.text) {
        onText(data.text);
      } else {
        setError('没听清，请再说一次');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setPhase('idle');
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={phase === 'recording' ? stop : phase === 'idle' ? start : undefined}
        disabled={phase === 'busy'}
        title={phase === 'recording' ? '停止并识别' : '语音输入'}
        className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
          phase === 'recording'
            ? 'border-red-400 text-red-400 animate-pulse'
            : 'border-line text-stone-400 hover:border-accent-dim hover:text-accent disabled:opacity-50'
        }`}
      >
        {phase === 'recording' ? '■' : phase === 'busy' ? '…' : '🎙'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
