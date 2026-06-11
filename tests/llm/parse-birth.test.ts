import { describe, expect, it } from 'vitest';
import { buildParseMessages, extractJson, matchCity, PARSE_SYSTEM_PROMPT } from '@/llm/parse-birth';

describe('extractJson', () => {
  it('裸 JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('代码块包裹', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('前后有解释文字', () => {
    expect(extractJson('好的，结果是：{"a":1} 以上。')).toEqual({ a: 1 });
  });

  it('无 JSON 抛错', () => {
    expect(() => extractJson('没有什么')).toThrow();
  });
});

describe('matchCity', () => {
  it('精确命中', () => expect(matchCity('上海')).toBe('上海'));
  it('包含关系命中', () => expect(matchCity('上海市')).toBe('上海'));
  it('列表外返回 null', () => expect(matchCity('巴黎')).toBeNull());
  it('非字符串返回 null', () => expect(matchCity(null)).toBeNull());
});

describe('buildParseMessages', () => {
  it('system 含城市列表与时辰规则，user 含今天日期与原文', () => {
    expect(PARSE_SYSTEM_PROMPT).toContain('上海');
    expect(PARSE_SYSTEM_PROMPT).toContain('亥时=22');
    const msgs = buildParseMessages('我92年生', new Date(2026, 5, 11));
    expect(msgs[1].content).toContain('2026年6月11日');
    expect(msgs[1].content).toContain('我92年生');
  });
});
