export interface SseEvent {
  delta?: string;
  done?: boolean;
  error?: string;
}

/** 前端：解析 SSE 流 */
export async function* readSse(res: Response): AsyncGenerator<SseEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (frame.startsWith('data: ')) yield JSON.parse(frame.slice(6)) as SseEvent;
    }
  }
}
