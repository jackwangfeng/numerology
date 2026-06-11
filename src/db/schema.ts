import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

// ---------- better-auth ----------
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

// ---------- 业务表 ----------
export const charts = sqliteTable('charts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  gender: text('gender').notNull(), // '男' | '女'
  calendarType: text('calendar_type').notNull(), // 'solar' | 'lunar'
  birthYear: integer('birth_year').notNull(),
  birthMonth: integer('birth_month').notNull(),
  birthDay: integer('birth_day').notNull(),
  birthHour: integer('birth_hour').notNull(),
  birthMinute: integer('birth_minute').notNull(),
  isLeapMonth: integer('is_leap_month', { mode: 'boolean' }).notNull().default(false),
  birthPlace: text('birth_place'),
  baziData: text('bazi_data').notNull(), // BaziChart JSON
  ziweiData: text('ziwei_data').notNull(), // ZiweiChart JSON
  /** 记忆第一层：更早对话的滚动摘要 */
  memorySummary: text('memory_summary'),
  /** 已并入摘要的最早消息条数 */
  summarizedCount: integer('summarized_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const readings = sqliteTable('readings', {
  id: text('id').primaryKey(),
  chartId: text('chart_id').notNull().references(() => charts.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  model: text('model').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chartId: text('chart_id').notNull().references(() => charts.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  /** 记忆第三层：消息向量（Float32 BLOB），embedding 模型未开通时为 null */
  embedding: blob('embedding', { mode: 'buffer' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/** 记忆第二层：命主事实库（挂命盘不挂账号，避免多命主串记忆） */
export const chartMemories = sqliteTable('chart_memories', {
  id: text('id').primaryKey(),
  chartId: text('chart_id').notNull().references(() => charts.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const llmUsage = sqliteTable('llm_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
