/** 独立脚本入口用：手动注入 .env.local（密钥）与 .env.production（非密钥）。
 *  作为副作用 import 放在依赖 env 的模块之前。Next 自身不需要它。 */
import fs from 'node:fs';

for (const file of ['.env.local', '.env.production']) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* 文件可选 */
  }
}
