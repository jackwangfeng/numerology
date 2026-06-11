import { chatOnce } from './ark';
import { extractJson } from './parse-birth';
import type { ChatMessage } from './prompts';

export interface RoundMessage {
  role: 'user' | 'assistant';
  content: string;
}

const FACTS_SYSTEM_PROMPT = `你是命理咨询应用的记忆管理员。从一轮对话中提取关于"命主"的持久事实，只输出严格 JSON：{"facts":["事实1","事实2"]}，禁止解释、禁止代码块。

提取标准（宁缺毋滥）：
- 命主的现实信息：职业、行业、婚姻/感情状态、子女、健康状况、所在城市、重大经历（换工作/创业/搬家等，带上年份）
- 命主明确确认或否认的判断（如"用户确认2023年确实升职了"）
- 命主反复关心的主题（如"最关心母亲健康"）
不要提取：AI 自己的命理推断、一次性的提问内容、闲聊。
每条事实一句话、不超过 40 字、以"命主"开头。
与【已有记忆】重复或同义的不要再输出。没有新事实输出 {"facts":[]}`;

export function buildFactsMessages(round: RoundMessage[], existingFacts: string[], now: Date = new Date()): ChatMessage[] {
  const dialog = round.map((m) => `${m.role === 'user' ? '命主' : 'AI命理师'}：${m.content}`).join('\n');
  return [
    { role: 'system', content: FACTS_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `今天是 ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日（"去年/明年"等相对时间请换算成具体年份）。\n\n【已有记忆】\n${existingFacts.length ? existingFacts.join('\n') : '（空）'}\n\n【本轮对话】\n${dialog}`,
    },
  ];
}

const MAX_FACTS_PER_ROUND = 5;

export async function extractNewFacts(round: RoundMessage[], existingFacts: string[]): Promise<string[]> {
  try {
    const raw = await chatOnce(buildFactsMessages(round, existingFacts));
    const parsed = extractJson(raw) as { facts?: unknown };
    if (!Array.isArray(parsed.facts)) return [];
    return parsed.facts
      .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
      .map((f) => f.trim().slice(0, 60))
      .slice(0, MAX_FACTS_PER_ROUND);
  } catch {
    return [];
  }
}

const SUMMARY_SYSTEM_PROMPT = `你是命理咨询应用的记忆管理员。把【新增的旧对话】合并进【已有摘要】，输出一段不超过 300 字的中文摘要，保留：命主问过的主题、AI 给出的关键判断、命主的反馈。直接输出摘要正文，不要任何前缀和解释。`;

export function buildSummaryMessages(existingSummary: string | null, oldMessages: RoundMessage[]): ChatMessage[] {
  const dialog = oldMessages.map((m) => `${m.role === 'user' ? '命主' : 'AI命理师'}：${m.content.slice(0, 300)}`).join('\n');
  return [
    { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
    { role: 'user', content: `【已有摘要】\n${existingSummary ?? '（空）'}\n\n【新增的旧对话】\n${dialog}` },
  ];
}

export async function summarizeHistory(existingSummary: string | null, oldMessages: RoundMessage[]): Promise<string | null> {
  try {
    const s = (await chatOnce(buildSummaryMessages(existingSummary, oldMessages))).trim();
    return s ? s.slice(0, 600) : existingSummary;
  } catch {
    return existingSummary;
  }
}
