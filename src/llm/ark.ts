import OpenAI from 'openai';
import type { ChatMessage } from './prompts';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.ARK_API_KEY) throw new Error('ARK_API_KEY 未配置');
    client = new OpenAI({
      apiKey: process.env.ARK_API_KEY,
      baseURL: process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
    });
  }
  return client;
}

export function arkModel(): string {
  return process.env.ARK_MODEL || 'doubao-seed-1-6-250615';
}

/** 非流式单次调用，用于结构化抽取类任务 */
export async function chatOnce(messages: ChatMessage[]): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: arkModel(),
    messages,
    stream: false,
    temperature: 0.1,
    // Ark 扩展参数：抽取类任务关闭深度思考，延迟从 ~10s 降到 ~2s
    ...({ thinking: { type: 'disabled' } } as object),
  });
  return res.choices[0]?.message?.content ?? '';
}

export async function* streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
  const stream = await getClient().chat.completions.create({
    model: arkModel(),
    messages,
    stream: true,
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
