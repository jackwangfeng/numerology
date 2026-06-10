import Link from 'next/link';

const FEATURES = [
  { title: '排盘零误差', desc: '八字四柱、紫微十二宫由历法算法精确计算，支持农历闰月与真太阳时校正，绝不让 AI 瞎算干支。' },
  { title: '双盘合参', desc: '八字命理与紫微斗数互相印证，大模型基于完整结构化命盘出具深度解读报告。' },
  { title: '随盘追问', desc: '事业、婚恋、流年……报告之外想问什么接着问，AI 命理师紧扣你的命盘作答。' },
];

export default function Home() {
  return (
    <div className="py-20 sm:py-28">
      <div className="text-center">
        <p className="font-kai text-accent tracking-[0.5em] text-sm mb-6">知 命 而 后 行</p>
        <h1 className="font-kai text-4xl sm:text-6xl leading-tight">
          八字 · 紫微
          <br />
          <span className="text-accent">AI 深度解盘</span>
        </h1>
        <p className="mt-6 text-stone-400 max-w-xl mx-auto leading-relaxed">
          输入生辰，程序精准排盘，大模型为你出具命局总评、事业财运、婚恋情感与大运流年的完整解读。
        </p>
        <Link
          href="/charts/new"
          className="inline-block mt-10 px-10 py-3.5 rounded bg-accent text-stone-950 font-medium tracking-widest hover:bg-amber-400"
        >
          开始排盘
        </Link>
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-24">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-panel border border-line rounded-lg p-6">
            <h2 className="font-kai text-accent text-lg mb-3">{f.title}</h2>
            <p className="text-sm text-stone-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
