import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '@/db/schema';
import { checkAndConsumeQuota } from '@/llm/quota';

function makeDb() {
  const sqlite = new Database(':memory:');
  sqlite.exec(`
    CREATE TABLE user (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0, image TEXT,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE llm_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );
    INSERT INTO user VALUES ('u1','测试','t@t.com',0,NULL,0,0);
  `);
  return drizzle(sqlite, { schema });
}

describe('checkAndConsumeQuota', () => {
  it('limit=3：前 3 次放行，第 4 次拒绝', async () => {
    const db = makeDb();
    for (let i = 1; i <= 3; i++) {
      const r = await checkAndConsumeQuota(db, 'u1', 3);
      expect(r).toEqual({ ok: true, used: i, limit: 3 });
    }
    const r4 = await checkAndConsumeQuota(db, 'u1', 3);
    expect(r4.ok).toBe(false);
    expect(r4.used).toBe(3);
  });

  it('不同用户配额独立', async () => {
    const db = makeDb();
    await db.insert(schema.user).values({ id: 'u2', name: 'b', email: 'b@t.com', createdAt: new Date(), updatedAt: new Date() });
    await checkAndConsumeQuota(db, 'u1', 1);
    const r = await checkAndConsumeQuota(db, 'u2', 1);
    expect(r.ok).toBe(true);
  });
});
