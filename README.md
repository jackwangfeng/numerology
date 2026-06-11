# 玄机命理

八字 + 紫微斗数排盘，豆包大模型深度解读的 Web 应用。

🔮 **在线体验：[numerology.recompdaily.com](https://numerology.recompdaily.com)**

- **排盘零自研零误差**：八字四柱由 [lunar-typescript](https://github.com/6tail/lunar-typescript) 计算，紫微十二宫由 [iztro](https://github.com/SylarLong/iztro) 计算；支持公历/农历（含闰月）输入与真太阳时经度校正。大模型只负责解读，不碰历法推算。
- **AI 解读**：完整结构化命盘（四柱十神藏干、十步大运、流年、紫微十二宫四化）喂给豆包，流式生成六章节解读报告，并支持随盘追问对话。
- **账号与历史**：邮箱密码登录（better-auth），命盘、报告、对话全部持久化，可随时回看。
- **智能填表与语音**：排盘表单支持说/打一句话（"我是92年农历八月初八晚上十点一刻在上海出生的女生"），豆包结构化抽取自动填表并提示缺失字段；排盘表单与随盘追问均支持语音输入——浏览器录 16k PCM，服务端转发**豆包流式语音识别**（新版控制台 `X-Api-Key` 单头鉴权，走 `bigmodel_nostream` 高准确率模式），全浏览器可用。
- **三层长期记忆**：追问按命盘维度持久化，上下文携带命盘 + 最新报告 + 最近 20 条消息，之外还有三层记忆——① 滚动摘要（窗口外旧对话每攒 10 条自动并入摘要）；② 命主事实库（每轮对话后异步抽取持久事实，如"命主 2025 年升职"，挂在命盘而非账号上，多命主不串）；③ 远期对话向量召回（当前问题语义检索旧消息 top-4 注入，需在方舟开通 `doubao-embedding` 系列模型，未开通时自动跳过）。重新生成报告也会带上事实库。

## 技术栈

Next.js 15 (App Router) · TypeScript · Tailwind CSS · SQLite + Drizzle ORM · better-auth · 火山方舟 Ark API（OpenAI 兼容）· Vitest

## 启动

```bash
npm install
cp .env.example .env.local   # 填入下面的环境变量
mkdir -p data && npm run db:push   # 建表
npm run dev                  # http://localhost:3000
```

### 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `ARK_API_KEY` | 是 | 火山方舟 API Key（[控制台](https://console.volcengine.com/ark)创建） |
| `ARK_MODEL` | 是 | 豆包模型 ID 或推理接入点 ID，如 `doubao-seed-1-6-250615` |
| `ARK_BASE_URL` | 否 | 默认 `https://ark.cn-beijing.volces.com/api/v3` |
| `BETTER_AUTH_SECRET` | 是 | 会话签名密钥，`openssl rand -hex 32` 生成 |
| `BETTER_AUTH_URL` | 是 | 站点地址，本地为 `http://localhost:3000` |
| `DATABASE_URL` | 否 | SQLite 文件路径，默认 `./data/suanming.db` |
| `DAILY_LLM_LIMIT` | 否 | 每用户每日 LLM 调用上限，默认 20 |

### 没有 ARK key 时本地联调

```bash
node scripts/mock-ark.mjs &   # 本地 OpenAI 兼容 mock，端口 9999
ARK_API_KEY=mock ARK_BASE_URL=http://localhost:9999 npm run dev
```

## 测试

```bash
npm test        # vitest：历法换算/神煞/八字/紫微/prompt/配额，30 个用例
npm run lint
npm run build
```

`npx tsx scripts/inspect-libs.ts` 可打印排盘库原始输出，用于与权威排盘工具人工核对。

## 目录结构

```
src/core/      排盘胶水层（纯函数）：calendar 历法换算、bazi 八字、ziwei 紫微、shensha 神煞
src/llm/       prompts 提示词构建、ark 豆包流式客户端、quota 每日配额
src/db/        Drizzle schema 与连接
src/lib/       better-auth、会话、SSE 工具
src/app/       页面与 API 路由（charts CRUD、report/chat SSE）
src/components/  八字表、紫微十二宫、报告流式渲染、追问对话框
docs/superpowers/  设计文档与实现计划
```

## 设计文档

- 设计：`docs/superpowers/specs/2026-06-11-suanming-app-design.md`
- 实现计划：`docs/superpowers/plans/2026-06-11-suanming-v1.md`

## 许可证

[MIT](./LICENSE)

---

应用内所有解读由 AI 基于传统命理学说生成，仅供参考娱乐。
