'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readSse } from '@/lib/sse-client';

export function ReportSection({ chartId, initialReport }: { chartId: string; initialReport: string | null }) {
  const [content, setContent] = useState(initialReport ?? '');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setStreaming(true);
    setError('');
    setContent('');
    try {
      const res = await fetch(`/api/charts/${chartId}/report`, { method: 'POST' });
      if (!res.ok) {
        setError((await res.json()).error ?? '生成失败，请重试');
        return;
      }
      let acc = '';
      for await (const ev of readSse(res)) {
        if (ev.error) {
          setError(ev.error);
          return;
        }
        if (ev.delta) {
          acc += ev.delta;
          setContent(acc);
        }
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="bg-panel border border-line rounded-lg p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-kai text-accent text-lg">命理解读</h2>
        <button
          onClick={generate}
          disabled={streaming}
          className="px-4 py-1.5 rounded bg-accent text-stone-950 text-sm font-medium hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
        >
          {streaming ? '生成中…' : content ? '重新生成' : '生成解读'}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm my-3">{error}</p>}
      {content ? (
        <div className="prose-report text-sm text-stone-300">
          <ReactMarkdown>{content}</ReactMarkdown>
          {streaming && <span className="inline-block w-2 h-4 bg-accent animate-pulse align-text-bottom" />}
        </div>
      ) : (
        !streaming && !error && <p className="text-stone-500 text-sm py-6 text-center">点击「生成解读」，AI 命理师将基于命盘出具完整报告</p>
      )}
    </section>
  );
}
