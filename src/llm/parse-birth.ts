import { CITIES } from '@/core/cities';
import { chatOnce } from './ark';
import type { ChatMessage } from './prompts';

export interface ParsedBirth {
  name: string | null;
  gender: '男' | '女' | null;
  calendarType: 'solar' | 'lunar';
  year: number | null;
  month: number | null;
  day: number | null;
  hour: number | null;
  minute: number | null;
  isLeapMonth: boolean;
  birthPlace: string | null;
  missing: string[];
}

export const PARSE_SYSTEM_PROMPT = `你是排盘表单的填写助手。从用户一句中文描述中提取出生信息，只输出一个严格 JSON 对象，禁止 markdown 代码块、禁止任何解释文字。

字段定义：
- name: 姓名或称呼，没提到为 null
- gender: "男" 或 "女"，没提到为 null
- calendarType: "lunar"（提到农历/阴历/旧历/初几/腊月/正月等农历特征）否则 "solar"
- year, month, day: 数字。农历则为农历年月日。两位年份按 >=30 为 19xx、<30 为 20xx 处理
- hour: 0-23 的数字。口语换算：晚上10点=22、中午12点=12、凌晨1点=1；传统时辰取中点：子时=0（明确说"晚子时"=23）、丑时=2、寅时=4、卯时=6、辰时=8、巳时=10、午时=12、未时=14、申时=16、酉时=18、戌时=20、亥时=22。没提到为 null
- minute: 0-59。"一刻"=15、"半"=30、"三刻"=45；提到了 hour 但没提分钟则为 0；hour 为 null 则为 null
- isLeapMonth: 明确提到"闰X月"才为 true，否则 false
- birthPlace: 出生城市，必须从这个列表里选最接近的一个（如"浦东出生"→"上海"）：${Object.keys(CITIES).join('、')}。列表外的地点或没提到为 null
- missing: 字符串数组，从 ["gender","year","month","day","hour"] 中列出未能提取的字段

示例输入：我是92年农历八月初八晚上十点一刻在上海生的女生，叫小红
示例输出：{"name":"小红","gender":"女","calendarType":"lunar","year":1992,"month":8,"day":8,"hour":22,"minute":15,"isLeapMonth":false,"birthPlace":"上海","missing":[]}`;

/** 从模型输出中提取 JSON 对象（容忍代码块包裹与前后杂质） */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('模型输出中未找到 JSON');
  return JSON.parse(m[0]);
}

/** 把模型给的城市名归一到 CITIES 的键，匹配不上返回 null */
export function matchCity(place: unknown): string | null {
  if (typeof place !== 'string' || !place) return null;
  const keys = Object.keys(CITIES);
  return keys.find((k) => k === place) ?? keys.find((k) => place.includes(k) || k.includes(place)) ?? null;
}

export function buildParseMessages(text: string, now: Date): ChatMessage[] {
  return [
    { role: 'system', content: PARSE_SYSTEM_PROMPT },
    { role: 'user', content: `今天是 ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日。用户描述：${text}` },
  ];
}

export async function parseBirthText(text: string, now: Date): Promise<unknown> {
  const raw = await chatOnce(buildParseMessages(text, now));
  return extractJson(raw);
}
