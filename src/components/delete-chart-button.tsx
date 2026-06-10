'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function DeleteChartButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function del() {
    if (!confirm('确定删除这张命盘？解读记录会一并删除。')) return;
    setBusy(true);
    await fetch(`/api/charts/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <button onClick={del} disabled={busy} className="text-xs text-stone-500 hover:text-red-400 cursor-pointer disabled:opacity-50">
      {busy ? '删除中…' : '删除'}
    </button>
  );
}
