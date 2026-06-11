export function embeddingModel(): string {
  return process.env.ARK_EMBEDDING_MODEL || 'doubao-embedding-vision-250615';
}

/**
 * 文本向量化，走方舟多模态 embedding 端点（doubao-embedding-vision 系列
 * 不支持 OpenAI 兼容的 /embeddings）。模型未开通或调用失败时返回 null，
 * 调用方应静默降级（跳过向量召回，不影响其余记忆层）。
 */
export async function embedText(text: string): Promise<Float32Array | null> {
  try {
    const base = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    const res = await fetch(`${base}/embeddings/multimodal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ARK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: embeddingModel(),
        input: [{ type: 'text', text: text.slice(0, 1000) }],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { embedding?: number[] } | { embedding?: number[] }[] };
    const v = Array.isArray(json.data) ? json.data[0]?.embedding : json.data?.embedding;
    return v?.length ? Float32Array.from(v) : null;
  } catch {
    return null;
  }
}

export function vecToBuf(v: Float32Array): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

/** sqlite 取出的 Buffer 可能未按 4 字节对齐，复制一份再转 */
export function bufToVec(b: Buffer): Float32Array {
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return new Float32Array(ab);
}

export function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? -1 : dot / denom;
}

/** 按余弦相似度取 top-k（低于 minScore 的丢弃），返回原始 item */
export function topKByCosine<T>(
  candidates: { vec: Float32Array; item: T }[],
  query: Float32Array,
  k: number,
  minScore: number,
): T[] {
  return candidates
    .map((c) => ({ item: c.item, score: cosine(c.vec, query) }))
    .filter((x) => x.score >= minScore)
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map((x) => x.item);
}
