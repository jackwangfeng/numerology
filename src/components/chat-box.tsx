'use client';
import { useRef, useState } from 'react';
import { readSse } from '@/lib/sse-client';
import { VoiceInput } from './voice-input';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBox({ chartId, initialMessages }: { chartId: string; initialMessages: Msg[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const voiceBaseRef = useRef(''); // 录音开始时的输入框内容，流式 partial 在其后替换式拼接

  const scrollDown = () => requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || busy) return;
    setBusy(true);
    setError('');
    setInput('');
    setMsgs((m) => [...m, { role: 'user', content }, { role: 'assistant', content: '' }]);
    scrollDown();
    try {
      const res = await fetch(`/api/charts/${chartId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const msg = (await res.json()).error ?? '发送失败，请重试';
        setError(msg);
        setMsgs((m) => m.slice(0, -2));
        return;
      }
      for await (const ev of readSse(res)) {
        if (ev.error) {
          setError(ev.error);
          break;
        }
        if (ev.delta) {
          setMsgs((m) => {
            const next = [...m];
            next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + ev.delta };
            return next;
          });
          scrollDown();
        }
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-panel border border-line rounded-lg p-5">
      <h2 className="font-kai text-accent text-lg mb-4">随盘追问</h2>
      <div ref={listRef} className="max-h-96 overflow-y-auto space-y-3 pr-1">
        {msgs.length === 0 && <p className="text-stone-500 text-sm text-center py-4">事业、婚恋、流年……针对这张命盘想问什么都可以</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-accent-dim/30 text-stone-200' : 'bg-stone-900 text-stone-300'
              }`}
            >
              {m.content || <span className="inline-block w-2 h-4 bg-accent animate-pulse" />}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
      <form onSubmit={send} className="mt-4 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="问问 AI 命理师…（支持语音）"
          className="flex-1 bg-stone-900 border border-line rounded px-4 py-2.5 text-sm outline-none focus:border-accent-dim"
        />
        <VoiceInput
          onStart={() => {
            voiceBaseRef.current = input;
          }}
          onText={(t) => setInput((voiceBaseRef.current + t).slice(0, 500))}
        />
        <button disabled={busy || !input.trim()} className="px-5 rounded bg-accent text-stone-950 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 cursor-pointer">
          发送
        </button>
      </form>
    </section>
  );
}
