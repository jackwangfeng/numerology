'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CITIES } from '@/core/cities';

const SHICHEN = ['子', '丑', '丑', '寅', '寅', '卯', '卯', '辰', '辰', '巳', '巳', '午', '午', '未', '未', '申', '申', '酉', '酉', '戌', '戌', '亥', '亥', '子'];

const field = 'w-full bg-panel border border-line rounded px-3 py-2.5 outline-none focus:border-accent-dim';

export function ChartForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    gender: '男' as '男' | '女',
    calendarType: 'solar' as 'solar' | 'lunar',
    year: 1995,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
    isLeapMonth: false,
    birthPlace: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/charts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, birthPlace: form.birthPlace || undefined }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? '排盘失败，请重试');
      return;
    }
    router.push(`/charts/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-stone-400">姓名</span>
          <input required maxLength={20} value={form.name} onChange={(e) => set('name', e.target.value)} className={`${field} mt-1`} placeholder="命主姓名" />
        </label>
        <div>
          <span className="text-sm text-stone-400">性别</span>
          <div className="flex gap-2 mt-1">
            {(['男', '女'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => set('gender', g)}
                className={`flex-1 py-2.5 rounded border cursor-pointer ${form.gender === g ? 'border-accent text-accent' : 'border-line text-stone-400'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <span className="text-sm text-stone-400">历法</span>
        <div className="flex gap-2 mt-1">
          {([
            ['solar', '公历'],
            ['lunar', '农历'],
          ] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => set('calendarType', v)}
              className={`flex-1 py-2.5 rounded border cursor-pointer ${form.calendarType === v ? 'border-accent text-accent' : 'border-line text-stone-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm text-stone-400">年</span>
          <input type="number" required min={1900} max={2100} value={form.year} onChange={(e) => set('year', +e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm text-stone-400">月</span>
          <input type="number" required min={1} max={12} value={form.month} onChange={(e) => set('month', +e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block">
          <span className="text-sm text-stone-400">日</span>
          <input type="number" required min={1} max={31} value={form.day} onChange={(e) => set('day', +e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>

      {form.calendarType === 'lunar' && (
        <label className="flex items-center gap-2 text-sm text-stone-400">
          <input type="checkbox" checked={form.isLeapMonth} onChange={(e) => set('isLeapMonth', e.target.checked)} className="accent-[#c9a227]" />
          闰月（该农历月为闰月时勾选）
        </label>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-stone-400">时</span>
          <select value={form.hour} onChange={(e) => set('hour', +e.target.value)} className={`${field} mt-1`}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')} 点（{SHICHEN[h]}时）
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-stone-400">分</span>
          <select value={form.minute} onChange={(e) => set('minute', +e.target.value)} className={`${field} mt-1`}>
            {Array.from({ length: 60 }, (_, m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')} 分
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm text-stone-400">出生地（可选，用于真太阳时校正）</span>
        <select value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} className={`${field} mt-1`}>
          <option value="">不校正（按北京时间）</option>
          {Object.keys(CITIES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button disabled={busy} className="w-full py-3 rounded bg-accent text-stone-950 font-medium tracking-widest hover:bg-amber-400 disabled:opacity-50 cursor-pointer">
        {busy ? '排盘中…' : '立即排盘'}
      </button>
    </form>
  );
}
