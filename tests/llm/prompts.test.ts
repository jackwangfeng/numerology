import { describe, expect, it } from 'vitest';
import { buildChatMessages, buildReportMessages, renderChartText, SYSTEM_PROMPT } from '@/llm/prompts';
import { computeCharts } from '@/core/paipan';
import type { BirthInput } from '@/core/types';

const input: BirthInput = {
  name: '张三',
  gender: '男',
  calendarType: 'solar',
  year: 1990,
  month: 3,
  day: 15,
  hour: 8,
  minute: 30,
  isLeapMonth: false,
};
const { bazi, ziwei } = computeCharts(input, new Date(2026, 5, 11));
const chartText = renderChartText(bazi, ziwei, { name: '张三', gender: '男' });

describe('renderChartText', () => {
  it('包含四柱、宫名与命主信息', () => {
    expect(chartText).toContain('庚午');
    expect(chartText).toContain('张三');
    expect(chartText).toContain('命宫');
    expect(chartText).toContain('五行局');
    expect(chartText).toContain('当前流年：丙午');
  });
});

describe('buildReportMessages', () => {
  it('system + user 两条，含章节要求', () => {
    const msgs = buildReportMessages(chartText);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toBe(SYSTEM_PROMPT);
    expect(msgs[1].content).toContain('## 命局总评');
  });
});

describe('buildChatMessages', () => {
  it('30 条历史只保留最近 20 条', () => {
    const history = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `消息${i}`,
    }));
    const msgs = buildChatMessages(chartText, '一份报告', history);
    const historyPart = msgs.filter((m) => m.content.startsWith('消息'));
    expect(historyPart).toHaveLength(20);
    expect(historyPart[0].content).toBe('消息10');
    expect(historyPart[19].content).toBe('消息29');
  });

  it('无报告不报错且仍含命盘', () => {
    const msgs = buildChatMessages(chartText, null, [{ role: 'user', content: '我的事业如何' }]);
    expect(msgs.some((m) => m.content.includes('庚午'))).toBe(true);
    expect(msgs[msgs.length - 1].content).toBe('我的事业如何');
  });

  it('超长报告截断到 3000 字内', () => {
    const long = '占'.repeat(5000);
    const msgs = buildChatMessages(chartText, long, []);
    const reportMsg = msgs.find((m) => m.content.includes('解读报告'))!;
    expect(reportMsg.content.length).toBeLessThan(3100);
  });
});
