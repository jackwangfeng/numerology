import { z } from 'zod';
import { db } from '@/db';
import { getUser } from '@/lib/session';
import { checkAndConsumeQuota } from '@/llm/quota';
import { matchCity, parseBirthText, type ParsedBirth } from '@/llm/parse-birth';

const bodySchema = z.object({ text: z.string().min(2).max(300) });

/** 容错地把模型输出收敛成 ParsedBirth：字段非法就当没识别出来 */
const resultSchema = z.object({
  name: z.string().nullable().catch(null),
  gender: z.enum(['男', '女']).nullable().catch(null),
  calendarType: z.enum(['solar', 'lunar']).catch('solar'),
  year: z.number().int().min(1900).max(2100).nullable().catch(null),
  month: z.number().int().min(1).max(12).nullable().catch(null),
  day: z.number().int().min(1).max(31).nullable().catch(null),
  hour: z.number().int().min(0).max(23).nullable().catch(null),
  minute: z.number().int().min(0).max(59).nullable().catch(null),
  isLeapMonth: z.boolean().catch(false),
  birthPlace: z.unknown().transform(matchCity),
  missing: z.array(z.string()).catch([]),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: '请输入 2-300 字的描述' }, { status: 400 });

  const quota = await checkAndConsumeQuota(db, user.id);
  if (!quota.ok) {
    return Response.json({ error: `今日 AI 调用次数已用完（${quota.limit} 次），请手动填写` }, { status: 429 });
  }

  try {
    const raw = await parseBirthText(parsed.data.text, new Date());
    const result: ParsedBirth = resultSchema.parse(raw);
    // 模型没报 missing 但关键字段确实为空时，兜底补上
    const KEY_FIELDS: (keyof ParsedBirth)[] = ['gender', 'year', 'month', 'day', 'hour'];
    const missing = [...new Set([...result.missing, ...KEY_FIELDS.filter((k) => result[k] == null)])];
    return Response.json({ ...result, missing });
  } catch (e) {
    console.error('parse-birth error:', e);
    return Response.json({ error: 'AI 识别失败，请重试或手动填写' }, { status: 502 });
  }
}
