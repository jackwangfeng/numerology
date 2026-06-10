/** 服务端：把一个产出文本增量的异步生成器包成 SSE Response，结束时回调完整文本 */
export function sseResponse(gen: AsyncGenerator<string>, onComplete: (full: string) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      let full = '';
      try {
        for await (const delta of gen) {
          full += delta;
          send({ delta });
        }
        await onComplete(full);
        send({ done: true });
      } catch (e) {
        console.error('SSE stream error:', e);
        send({ error: '生成中断，请重试' });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
