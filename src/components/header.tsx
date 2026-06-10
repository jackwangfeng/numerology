'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export function Header() {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  return (
    <header className="border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-kai text-xl text-accent tracking-widest">
          玄机命理
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {isPending ? null : session ? (
            <>
              <Link href="/charts" className="hover:text-accent">
                我的命盘
              </Link>
              <span className="text-stone-500 hidden sm:inline">{session.user.email}</span>
              <button
                className="text-stone-400 hover:text-accent cursor-pointer"
                onClick={async () => {
                  await authClient.signOut();
                  router.push('/');
                  router.refresh();
                }}
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-accent">
                登录
              </Link>
              <Link href="/register" className="px-3 py-1.5 rounded border border-accent-dim text-accent hover:bg-accent hover:text-stone-950">
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
