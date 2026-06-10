/* 本地 OpenAI 兼容 mock 服务：流式返回固定文本，用于无真实 ARK key 时验证 SSE 管线 */
const http = require('node:http');

const REPLY = '【模拟解读】命主八字庚午年生，日主己土。此为本地 mock 输出，用于验证流式管线。'.split('');

http
  .createServer((req, res) => {
    if (!req.url.includes('/chat/completions')) {
      res.writeHead(404).end();
      return;
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      let i = 0;
      const timer = setInterval(() => {
        if (i < REPLY.length) {
          const chunk = { id: 'mock', choices: [{ delta: { content: REPLY[i++] }, index: 0 }] };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        } else {
          res.write('data: [DONE]\n\n');
          res.end();
          clearInterval(timer);
        }
      }, 5);
    });
  })
  .listen(9999, () => console.log('mock-ark on :9999'));
