'use client';
import { useRef, useState, useSyncExternalStore } from 'react';

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

/**
 * 浏览器语音输入按钮（Web Speech API，zh-CN）。
 * 不支持的浏览器自动隐藏。识别出的最终文本通过 onText 回调。
 */
export function VoiceInput({ onText }: { onText: (text: string) => void }) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false,
  );
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  function toggle() {
    if (recording) {
      recRef.current?.stop();
      return;
    }
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'zh-CN';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) text += r[0].transcript;
      }
      if (text) onText(text);
    };
    rec.onerror = (e) => {
      setError(e.error === 'not-allowed' ? '请允许麦克风权限' : '语音识别不可用，请打字输入');
      setRecording(false);
    };
    rec.onend = () => setRecording(false);
    recRef.current = rec;
    setError('');
    setRecording(true);
    rec.start();
  }

  if (!supported) return null;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        title={recording ? '停止录音' : '语音输入'}
        className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${
          recording ? 'border-red-400 text-red-400 animate-pulse' : 'border-line text-stone-400 hover:border-accent-dim hover:text-accent'
        }`}
      >
        {recording ? '■' : '🎙'}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
