import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { charts } from '@/db/schema';
import { getUser } from '@/lib/session';
import { computeCharts } from '@/core/paipan';
import { CITIES } from '@/core/cities';

const bodySchema = z.object({
  name: z.string().min(1).max(20),
  gender: z.enum(['男', '女']),
  calendarType: z.enum(['solar', 'lunar']),
  year: z.number().int().min(1900).max(2100),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  isLeapMonth: z.boolean().default(false),
  birthPlace: z
    .string()
    .optional()
    .refine((v) => !v || v in CITIES, '未知城市'),
});

export async function POST(req: Request) {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: '输入有误：' + parsed.error.issues[0].message }, { status: 400 });
  const b = parsed.data;

  let computed;
  try {
    computed = computeCharts({ ...b, longitude: b.birthPlace ? CITIES[b.birthPlace] : undefined }, new Date());
  } catch {
    return Response.json({ error: '生辰参数无效，请检查日期是否存在（含闰月）' }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(charts).values({
    id,
    userId: user.id,
    name: b.name,
    gender: b.gender,
    calendarType: b.calendarType,
    birthYear: b.year,
    birthMonth: b.month,
    birthDay: b.day,
    birthHour: b.hour,
    birthMinute: b.minute,
    isLeapMonth: b.isLeapMonth,
    birthPlace: b.birthPlace ?? null,
    baziData: JSON.stringify(computed.bazi),
    ziweiData: JSON.stringify(computed.ziwei),
    createdAt: new Date(),
  });
  return Response.json({ id });
}

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

  const rows = await db
    .select({
      id: charts.id,
      name: charts.name,
      gender: charts.gender,
      calendarType: charts.calendarType,
      birthYear: charts.birthYear,
      birthMonth: charts.birthMonth,
      birthDay: charts.birthDay,
      createdAt: charts.createdAt,
    })
    .from(charts)
    .where(eq(charts.userId, user.id))
    .orderBy(desc(charts.createdAt));
  return Response.json(rows);
}
