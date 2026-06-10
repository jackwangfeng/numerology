import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: '玄机命理 — 八字·紫微斗数 AI 解读',
  description: '精准排盘，大模型深度解读：八字命理与紫微斗数双盘合参',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 pb-16">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-stone-500">
          内容由 AI 基于传统命理学说生成，仅供参考娱乐
        </footer>
      </body>
    </html>
  );
}
