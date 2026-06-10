'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await authClient.signIn.email({ email, password });
    setBusy(false);
    if (error) {
      setError(error.status === 401 ? '邮箱或密码不正确' : (error.message ?? '登录失败，请重试'));
      return;
    }
    router.push('/charts');
    router.refresh();
  }

  return (
    <div className="max-w-sm mx-auto pt-20">
      <h1 className="font-kai text-2xl text-center mb-8">登录</h1>
      <form onSubmit={submit} className="space-y-4">
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
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-panel border border-line rounded px-4 py-2.5 outline-none focus:border-accent-dim"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          disabled={busy}
          className="w-full py-2.5 rounded bg-accent text-stone-950 font-medium hover:bg-amber-400 disabled:opacity-50 cursor-pointer"
        >
          {busy ? '登录中…' : '登录'}
        </button>
      </form>
      <p className="text-center text-sm text-stone-500 mt-6">
        还没有账号？{' '}
        <Link href="/register" className="text-accent hover:underline">
          去注册
        </Link>
      </p>
    </div>
  );
}
