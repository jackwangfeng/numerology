'use client';
import { useRef, useState } from 'react';
import { floatTo16BitPcm, resampleLinear } from '@/lib/pcm';

const TARGET_RATE = 16000;
const MAX_SECONDS = 60;

type Phase = 'idle' | 'recording' | 'finishing';

function wsUrl(): string {
  if (typeof location === 'undefined') return '';
  // 生产同域经 cloudflared 隧道；本地开发直连独立 WS 服务端口
  return location.protocol === 'https:' ? `wss://${location.host}/asr-ws` : `ws://${location.hostname}:3101/asr-ws`;
}

/**
 * 流式语音输入：边录边把 16k PCM 通过 WebSocket 发给豆包双向流式识别，
 * 实时回传 partial 文本（边说边出字）。onStart 时调用方记录基线，
 * onText 每次传「本次语音的累积全文」，调用方做替换式更新。
 */
export function VoiceInput({ onStart, onText }: { onStart?: () => void; onText: (sessionText: string) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [level, setLevel] = useState(0); // 0~1 实时音量，驱动录音动画
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    streamRef.current = null;
    analyserRef.current = null;
    setLevel(0);
  }

  async function start() {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('当前环境不支持录音（需 HTTPS 或 localhost）');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const name = (e as DOMException)?.name;
      if (name === 'NotAllowedError') setError('麦克风被浏览器拦截：点地址栏左侧图标，把麦克风改为「允许」后重试');
      else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') setError('未检测到麦克风设备');
      else if (name === 'NotReadableError') setError('麦克风被其他程序占用，请关闭后重试');
      else setError(`无法录音：${name || (e as Error)?.message || '未知错误'}`);
      return;
    }

    const ws = new WebSocket(wsUrl());
    ws.binaryType = 'arraybuffer';
    wsRef.current = ws;

    ws.onerror = () => {
      setError('语音服务连接失败，请重试');
      cleanup();
      setPhase('idle');
    };
    ws.onclose = () => {
      cleanup();
      setPhase('idle');
    };
    ws.onmessage = (ev) => {
      let msg: { type: string; text?: string; message?: string };
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.type === 'partial' && msg.text) onText(msg.text);
      else if (msg.type === 'final') {
        if (msg.text) onText(msg.text);
        cleanup();
        setPhase('idle');
      } else if (msg.type === 'error') {
        setError(msg.message || '识别失败，请重试');
        cleanup();
        setPhase('idle');
      }
    };

    ws.onopen = () => {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      source.connect(processor);
      processor.connect(ctx.destination);
      ctxRef.current = ctx;
      streamRef.current = stream;
      analyserRef.current = analyser;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const input = e.inputBuffer.getChannelData(0);
        const pcm = floatTo16BitPcm(resampleLinear(new Float32Array(input), ctx.sampleRate, TARGET_RATE));
        ws.send(pcm);
      };

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
        setLevel(Math.min(1, peak / 80));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();

      onStart?.();
      setPhase('recording');
      stopTimerRef.current = setTimeout(stop, MAX_SECONDS * 1000);
    };
  }

  function stop() {
    if (phase !== 'recording') return;
    setPhase('finishing');
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send('END');
    // 等服务端回 final（onmessage 里 cleanup）；兜底 8s 超时强制收尾
    setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        try { wsRef.current.close(); } catch { /* noop */ }
        cleanup();
        setPhase('idle');
      }
    }, 8000);
  }

  const ring = phase === 'recording' ? 1 + level * 0.6 : 1;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={phase === 'recording' ? stop : phase === 'idle' ? start : undefined}
        disabled={phase === 'finishing'}
        title={phase === 'recording' ? '停止并识别' : '语音输入'}
        style={phase === 'recording' ? { boxShadow: `0 0 0 ${level * 8}px rgba(248,113,113,0.18)` } : undefined}
        className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
          phase === 'recording'
            ? 'border-red-400 text-red-400'
            : phase === 'finishing'
              ? 'border-accent-dim text-accent opacity-70'
              : 'border-line text-stone-400 hover:border-accent-dim hover:text-accent'
        }`}
      >
        <span style={{ transform: `scale(${ring})`, transition: 'transform 80ms' }}>
          {phase === 'recording' ? '■' : phase === 'finishing' ? '…' : '🎙'}
        </span>
      </button>
      {phase === 'recording' && <span className="text-xs text-red-400">聆听中，边说边出字…</span>}
      {phase === 'finishing' && <span className="text-xs text-accent">识别中…</span>}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
