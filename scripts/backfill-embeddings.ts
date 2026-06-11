/* 给历史消息补向量：node 环境跑一次即可（新消息写入时自动带向量） */
import fs from 'node:fs';
import { isNull } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// 手动加载 .env.local（tsx 不自动加载）
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

async function main() {
  const { db } = await import('@/db');
  const { messages } = await import('@/db/schema');
  const { embedText, vecToBuf } = await import('@/llm/embeddings');

  const rows = await db
    .select({ id: messages.id, content: messages.content })
    .from(messages)
    .where(isNull(messages.embedding));
  console.log(`待补向量消息：${rows.length} 条`);
  let ok = 0;
  for (const r of rows) {
    const v = await embedText(r.content);
    if (v) {
      await db.update(messages).set({ embedding: vecToBuf(v) }).where(eq(messages.id, r.id));
      ok++;
    }
  }
  console.log(`完成：${ok}/${rows.length}`);
}

main();
