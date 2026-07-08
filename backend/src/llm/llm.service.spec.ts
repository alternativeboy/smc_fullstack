import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EXECUTE_SQL_TOOL } from './constants/tool-definitions';
import { SYSTEM_PROMPT_TEMPLATE } from './constants/system-prompt';
import { LlmService } from './llm.service';
import { OutputValidatorService } from './services/output-validator.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { StreamEvent, StreamResult } from './interfaces/stream-event.interface';

// Build an async iterable of streaming chunks from plain objects.
async function* chunks(list: any[]) {
  for (const c of list) yield c;
}

const APPLE_SQL = "SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023";

const toolCallRound = [
  {
    choices: [
      {
        delta: {
          tool_calls: [
            { index: 0, id: 'call_1', function: { name: 'execute_sql', arguments: JSON.stringify({ query: APPLE_SQL }) } },
          ],
        },
        finish_reason: null,
      },
    ],
  },
  { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
  { choices: [], usage: { prompt_tokens: 850, completion_tokens: 20 } },
];

const finalRound = [
  { choices: [{ delta: { content: "Apple's net income in 2023 was " }, finish_reason: null }] },
  { choices: [{ delta: { content: '$96.99 billion.' }, finish_reason: null }] },
  { choices: [{ delta: {}, finish_reason: 'stop' }] },
  { choices: [], usage: { prompt_tokens: 900, completion_tokens: 25 } },
];

function makeService(financialExecute: jest.Mock) {
  const create = jest
    .fn()
    .mockResolvedValueOnce(chunks(toolCallRound))
    .mockResolvedValueOnce(chunks(finalRound));
  const openai = { chat: { completions: { create } } } as any;
  const config = { getOrThrow: jest.fn(() => 'gpt-4o-mini') } as unknown as ConfigService;
  const financial = { execute: financialExecute } as any;
  const service = new LlmService(
    openai,
    config,
    new PromptBuilderService({ query: jest.fn() } as any),
    financial,
    new OutputValidatorService(),
  );
  return { service, create };
}

async function drain(gen: AsyncGenerator<StreamEvent, StreamResult>) {
  const events: StreamEvent[] = [];
  let next = await gen.next();
  while (!next.done) {
    events.push(next.value);
    next = await gen.next();
  }
  return { events, result: next.value };
}

describe('LlmService (tool loop, mocked OpenAI)', () => {
  it('runs the full S1 exchange: tool_call → execute → tool_result → answer → usage', async () => {
    const execute = jest.fn().mockResolvedValue({
      rows: [{ net_income: 96995000000 }],
      rowCount: 1,
      truncated: false,
    });
    const { service } = makeService(execute);

    const { events, result } = await drain(service.streamChat([], "Apple's net income 2023?"));

    // FinancialService (Layer 2 + Layer 3) was invoked with the model's SQL.
    expect(execute).toHaveBeenCalledWith(APPLE_SQL);

    // Event sequence: tool_call, tool_result, token, token, usage.
    expect(events.map((e) => e.type)).toEqual(['tool_call', 'tool_result', 'token', 'token', 'usage']);
    const toolResult = events.find((e) => e.type === 'tool_result') as any;
    expect(toolResult.data.rowCount).toBe(1);

    // Final assembled result + cost (§5 pricing): 1750 in, 45 out.
    expect(result.content).toBe("Apple's net income in 2023 was $96.99 billion.");
    expect(result.promptTokens).toBe(1750);
    expect(result.completionTokens).toBe(45);
    expect(result.cost).toBeCloseTo(1750 * 2.5e-6 + 45 * 1e-5, 10);
  });

  it('feeds a validator rejection back as a tool result without crashing (no execution)', async () => {
    const execute = jest.fn().mockRejectedValue(
      new BadRequestException({ message: 'Query blocked by SQL validator', errors: ['Blocked keyword detected: DROP'] }),
    );
    const { service } = makeService(execute);

    const { events, result } = await drain(service.streamChat([], 'drop everything'));

    expect(execute).toHaveBeenCalledTimes(1);
    const toolResult = events.find((e) => e.type === 'tool_result') as any;
    expect(toolResult.data.rows).toEqual([]);
    expect(toolResult.data.rowCount).toBe(0);
    // Loop still completed to a final answer.
    expect(events.some((e) => e.type === 'usage')).toBe(true);
    expect(result.toolResults[0]).toMatchObject({ error: expect.stringMatching(/DROP/) });
  });
});

describe('verbatim prompt/tool constants', () => {
  it('system prompt matches the spec (key invariants)', () => {
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('{{COVERAGE_BLOCK}}'); // filled from DB at boot
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('financial_data');
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('SELECT only');
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('NO HALLUCINATION');
    expect(SYSTEM_PROMPT_TEMPLATE).toContain('BlackRock has no 2024-2025 data');
  });

  it('execute_sql tool is defined correctly', () => {
    expect(EXECUTE_SQL_TOOL.function.name).toBe('execute_sql');
    expect(EXECUTE_SQL_TOOL.function.description).toContain('49 U.S. public companies');
    expect(EXECUTE_SQL_TOOL.function.parameters?.required).toEqual(['query']);
  });
});
