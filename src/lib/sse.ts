/**
 * 服务端：把产出文本增量的异步生成器包成 SSE Response，结束时回调完整文本。
 *
 * 关键：生成与存库不依赖客户端连接是否存活。客户端中途断开（刷新、离开、
 * 隧道超时）后，仅停止往客户端推送，但仍继续消费生成器直到结束并执行
 * onComplete 存库——保证"生成过就一定存得上"。
 */
export function sseResponse(gen: AsyncGenerator<string>, onComplete: (full: string) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let clientGone = false; // 客户端已断开，停止推送但继续生成+存库
      const send = (data: object) => {
        if (clientGone) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          clientGone = true;
        }
      };
      let full = '';
      let saved = false;
      try {
        for await (const delta of gen) {
          full += delta;
          send({ delta });
        }
        await onComplete(full); // 无论客户端在否都存库
        saved = true;
        send({ done: true });
      } catch (e) {
        console.error('SSE stream error:', e);
        // 生成中断但已产出内容时尽量保留；避免与正常路径重复存库
        if (!saved && full.length > 0) {
          try {
            await onComplete(full);
          } catch (saveErr) {
            console.error('SSE partial save error:', saveErr);
          }
        }
        send({ error: '生成中断，请重试' });
      } finally {
        if (!clientGone) {
          try {
            controller.close();
          } catch {
            /* 已关闭 */
          }
        }
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
