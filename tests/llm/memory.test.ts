import { describe, expect, it } from 'vitest';
import { bufToVec, cosine, topKByCosine, vecToBuf } from '@/llm/embeddings';
import { buildFactsMessages, buildSummaryMessages } from '@/llm/memory';
import { buildChatMessages, buildReportMessages } from '@/llm/prompts';

describe('embeddings 工具', () => {
  it('vecToBuf/bufToVec 往返一致（含非对齐偏移）', () => {
    const v = Float32Array.from([0.1, -2.5, 3.75]);
    const buf = vecToBuf(v);
    // 模拟 sqlite 返回的非 4 字节对齐 Buffer
    const shifted = Buffer.concat([Buffer.from([0]), buf]).subarray(1);
    expect(Array.from(bufToVec(shifted))).toEqual(Array.from(v));
  });

  it('cosine：同向 1、正交 0、维度不符 -1', () => {
    const a = Float32Array.from([1, 0]);
    expect(cosine(a, Float32Array.from([2, 0]))).toBeCloseTo(1);
    expect(cosine(a, Float32Array.from([0, 3]))).toBeCloseTo(0);
    expect(cosine(a, Float32Array.from([1, 0, 0]))).toBe(-1);
  });

  it('topKByCosine：按分排序、过滤低分、取 k 个', () => {
    const q = Float32Array.from([1, 0]);
    const cands = [
      { vec: Float32Array.from([0, 1]), item: 'orthogonal' },
      { vec: Float32Array.from([1, 0.1]), item: 'close' },
      { vec: Float32Array.from([1, 0.5]), item: 'mid' },
      { vec: Float32Array.from([-1, 0]), item: 'opposite' },
    ];
    expect(topKByCosine(cands, q, 2, 0.3)).toEqual(['close', 'mid']);
  });
});

describe('memory prompt 构建', () => {
  it('事实抽取消息含已有记忆与本轮对话', () => {
    const msgs = buildFactsMessages(
      [
        { role: 'user', content: '我在互联网公司上班' },
        { role: 'assistant', content: '从命盘看……' },
      ],
      ['命主已婚'],
      new Date(2026, 5, 11),
    );
    expect(msgs[1].content).toContain('命主已婚');
    expect(msgs[1].content).toContain('互联网公司');
    expect(msgs[1].content).toContain('2026年6月11日');
  });

  it('摘要消息含已有摘要与旧对话', () => {
    const msgs = buildSummaryMessages('之前聊过事业', [{ role: 'user', content: '问婚姻' }]);
    expect(msgs[1].content).toContain('之前聊过事业');
    expect(msgs[1].content).toContain('问婚姻');
  });
});

describe('记忆注入上下文', () => {
  it('buildChatMessages 注入三层记忆', () => {
    const msgs = buildChatMessages('命盘文本', null, [], {
      facts: ['命主从事互联网行业'],
      summary: '早期聊过事业方向',
      recalled: [{ role: 'user', content: '三个月前问过买房' }],
    });
    const ctx = msgs[1].content;
    expect(ctx).toContain('命主长期记忆');
    expect(ctx).toContain('命主从事互联网行业');
    expect(ctx).toContain('更早对话摘要');
    expect(ctx).toContain('远期对话片段');
    expect(ctx).toContain('买房');
  });

  it('无记忆时上下文不含记忆区块（向后兼容）', () => {
    const msgs = buildChatMessages('命盘文本', null, []);
    expect(msgs[1].content).not.toContain('长期记忆');
  });

  it('buildReportMessages 注入事实', () => {
    const msgs = buildReportMessages('命盘文本', ['命主已离异']);
    expect(msgs[1].content).toContain('命主已离异');
    expect(buildReportMessages('命盘文本')[1].content).not.toContain('长期记忆');
  });
});
