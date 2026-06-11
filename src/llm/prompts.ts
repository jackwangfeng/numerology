import type { BaziChart, Gender, ZiweiChart } from '@/core/types';

export const SYSTEM_PROMPT = `你是一位精通八字命理与紫微斗数的资深命理师，研习子平命理与紫微斗数三十余年，解读功底深厚。

你将收到一份由专业排盘程序计算的完整命盘数据（排盘绝对准确，不要重新推算干支或星曜，直接基于给定数据解读）。

解读要求：
1. 八字与紫微互相参照印证，给出综合判断，结论要具体、有依据（点明是哪个十神、哪颗星、哪步大运支持该判断）。
2. 语气专业、客观、有建设性。指出弱点和风险时同时给出化解或趋避建议。
3. 严禁宿命论恐吓，严禁预言具体的灾祸、伤亡、疾病死期。涉及健康只做养生提醒。
4. 输出使用 Markdown，遵循用户消息中要求的章节结构。
5. 报告末尾固定附一行：「以上内容基于传统命理学说生成，仅供参考娱乐，不构成任何医疗、投资或重大决策建议。」
6. 【年份铁律】当前年份以命盘数据中【当前日期】标注的公历年为准。分析流年运势时，只能分析当年及未来的年份，绝对不要分析或回顾已经过去的年份。命盘已给出"未来三年流年"的准确公历年与干支对应关系，务必照此输出，不要凭记忆自行换算干支对应的公历年。即使历史对话或既往报告里出现过更早的年份（如往年的分析），也一律忽略，以命盘给定的未来三年为准。

追问环节：用户可能继续就命盘提问，回答时同样遵守上述要求，并紧扣命盘数据。`;

export interface Profile {
  name: string;
  gender: Gender;
}

export function renderChartText(bazi: BaziChart, ziwei: ZiweiChart, profile: Profile, now?: Date): string {
  const p = bazi.pillars;
  const pillarLine = (label: string, x: typeof p.year) =>
    `${label}：${x.ganZhi}　十神：${x.shiShenGan}　藏干：${x.hideGan.join('、')}（${x.shiShenZhi.join('、')}）`;

  const today = now ?? new Date();
  const lines: string[] = [
    `【当前日期】${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（解读流年时以此为今年，只看当年及未来，不要分析已过去的年份）`,
    `【命主】${profile.name}，${profile.gender}`,
    `【排盘公历时间（已含真太阳时校正）】${bazi.solarDateTime}`,
    `【农历】${bazi.lunarDateText}`,
    '',
    '━━ 八字命盘 ━━',
    pillarLine('年柱', p.year),
    pillarLine('月柱', p.month),
    pillarLine('日柱', p.day),
    pillarLine('时柱', p.time),
    `日主：${bazi.dayMaster}`,
    `五行分布：${Object.entries(bazi.wuXingCount)
      .map(([k, v]) => `${k}${v}`)
      .join(' ')}`,
    `神煞：${bazi.shenSha.length ? bazi.shenSha.join('、') : '无'}`,
    `起运：${bazi.yun.startAge} 岁（${bazi.yun.startYear} 年）起，${bazi.yun.forward ? '顺行' : '逆行'}`,
    `大运：${bazi.daYun.map((d) => `${d.ganZhi}(${d.startAge}岁/${d.startYear}年)`).join(' → ')}`,
    `当前大运：${bazi.currentDaYun ?? '未起运'}　当前流年：${bazi.currentLiuNian}`,
    ...(bazi.upcomingYears?.length
      ? [
          `未来三年流年（只解读这几年，不要回顾更早的过去年份）：${bazi.upcomingYears
            .map((y, i) => `${y.year}年(${y.ganZhi}/虚岁${y.age}/大运${y.daYun ?? '未起运'})${i === 0 ? '【今年】' : ''}`)
            .join('　')}`,
        ]
      : []),
    '',
    '━━ 紫微斗数命盘 ━━',
    `五行局：${ziwei.fiveElementsClass}　命宫：${ziwei.soulPalaceBranch}　身宫：${ziwei.bodyPalaceBranch}`,
    ...ziwei.palaces.map(
      (pal) =>
        `${pal.name}（${pal.stem}${pal.branch}）${pal.isBodyPalace ? '[身宫]' : ''}：主星 ${
          pal.majorStars.length ? pal.majorStars.join('、') : '无（借对宫）'
        }${pal.minorStars.length ? `；辅星 ${pal.minorStars.join('、')}` : ''}`,
    ),
    `当前大限：${ziwei.currentDecadal}　当前流年：${ziwei.currentYearly}`,
  ];
  return lines.join('\n');
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildReportMessages(chartText: string, facts: string[] = [], upcomingYears: number[] = []): ChatMessage[] {
  const factsBlock = facts.length ? `\n\n【命主长期记忆（来自历史咨询，解读时请结合）】\n${facts.join('\n')}` : '';
  const yearsLabel = upcomingYears.length ? `（${upcomingYears.map((y) => `${y}年`).join('、')}）` : '';
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `${chartText}${factsBlock}

请基于以上命盘出具完整解读报告（Markdown），按以下章节组织：
## 命局总评
## 性格特质
## 事业财运
## 婚恋情感
## 健康提示
## 未来三年运势${yearsLabel}
按"今年→明年→后年"的顺序逐年分析大运流年，只预测这三年，绝对不要回顾或分析已经过去的年份。`,
    },
  ];
}

const MAX_HISTORY = 20;
const MAX_REPORT_CHARS = 3000;

/** 三层记忆：事实库 + 滚动摘要 + 向量召回的远期对话片段 */
export interface ChatMemory {
  facts: string[];
  summary: string | null;
  recalled: { role: 'user' | 'assistant'; content: string }[];
}

export function buildChatMessages(
  chartText: string,
  report: string | null,
  history: { role: 'user' | 'assistant'; content: string }[],
  memory?: ChatMemory,
): ChatMessage[] {
  const blocks: string[] = [chartText];
  if (memory?.facts.length) {
    blocks.push(`【命主长期记忆（来自历史咨询）】\n${memory.facts.join('\n')}`);
  }
  if (memory?.summary) {
    blocks.push(`【更早对话摘要】\n${memory.summary}`);
  }
  if (memory?.recalled.length) {
    blocks.push(
      `【与本次提问相关的远期对话片段】\n${memory.recalled
        .map((m) => `${m.role === 'user' ? '命主曾问' : '当时答复'}：${m.content.slice(0, 200)}`)
        .join('\n')}`,
    );
  }
  const msgs: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `${blocks.join('\n\n')}\n\n以下是围绕这张命盘的咨询对话。` },
  ];
  if (report) {
    msgs.push({ role: 'assistant', content: `此前我已出具解读报告如下：\n${report.slice(0, MAX_REPORT_CHARS)}` });
  } else {
    msgs.push({ role: 'assistant', content: '命盘已收到，请提问。' });
  }
  msgs.push(...history.slice(-MAX_HISTORY));
  return msgs;
}
