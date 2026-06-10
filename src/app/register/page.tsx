'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await authClient.signUp.email({ email, password, name });
    setBusy(false);
    if (error) {
      setError(error.message?.includes('exist') ? '该邮箱已注册' : (error.message ?? '注册失败，请重试'));
      return;
    }
    router.push('/charts');
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto pt-20">
      <h1 className="font-kai text-2xl text-center mb-8">注册</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          required
          maxLength={20}
          placeholder="昵称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-panel border border-line rounded px-4 py-2.5 outline-none focus:border-accent-dim"
        />
        <input
          type="email"
          required
          placeholder="邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-panel border border-line rounded px-4 py-2.5 outline-none focus:border-accent-dim"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="密码（至少 8 位）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-panel border border-line rounded px-4 py-2.5 outline-none focus:border-accent-dim"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={busy}
          className="w-full py-2.5 rounded bg-accent text-stone-950 font-medium hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
        >
          {busy ? '注册中…' : '注册'}
        </button>
      </form>
      <p className="text-center text-sm text-stone-500 mt-6">
        已有账号？{' '}
        <Link href="/login" className="text-accent hover:underline">
          去登录
        </Link>
      </p>
    </div>
  );
}
