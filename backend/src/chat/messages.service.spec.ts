import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { StreamEvent, StreamResult } from '../llm/interfaces/stream-event.interface';

// A fake response capturing SSE writes.
function fakeRes() {
  const writes: string[] = [];
  return {
    writes,
    writableEnded: false,
    destroyed: false,
    writable: true,
    write: (s: string) => writes.push(s),
  } as any;
}

// Build an LlmService stub whose streamChat yields the given events, then either
// returns a result or throws (to simulate abort / failure).
function stubLlm(events: StreamEvent[], opts: { throwWhile?: () => boolean; result?: StreamResult } = {}) {
  return {
    streamChat: async function* () {
      for (const e of events) {
        if (opts.throwWhile?.()) throw new Error('aborted');
        yield e;
      }
      if (opts.throwWhile?.()) throw new Error('aborted');
      return opts.result ?? ({ content: '', promptTokens: 0, completionTokens: 0, cost: 0, toolCalls: [], toolResults: [], partial: false } as StreamResult);
    },
  } as any;
}

function makeService(llm: any) {
  const messages = {
    create: jest.fn((x) => x),
    save: jest.fn(async (x) => ({ ...x, id: 'msg-1' })),
    find: jest.fn(async () => []),
  };
  const chat = { assertOwned: jest.fn(), rename: jest.fn() };
  const audit = { log: jest.fn() };
  const usage = { track: jest.fn() };
  const config = { getOrThrow: jest.fn(() => 'gpt-4o-mini') } as unknown as ConfigService;
  const service = new MessagesService(messages as any, chat as any, llm, audit as any, usage as any, config);
  return { service, messages, audit, usage };
}

const events: StreamEvent[] = [
  { type: 'token', data: { content: "Apple's net income was " } },
  { type: 'token', data: { content: '$96.99B.' } },
  { type: 'usage', data: { promptTokens: 900, completionTokens: 25, cost: 0.00248 } },
];

describe('MessagesService', () => {
  it('persists user + final assistant message + audit, emits done', async () => {
    const llm = stubLlm(events, {
      result: { content: "Apple's net income was $96.99B.", promptTokens: 900, completionTokens: 25, cost: 0.00248, toolCalls: [], toolResults: [], partial: false },
    });
    const { service, messages, audit, usage } = makeService(llm);
    const res = fakeRes();

    await service.stream({ conversationId: 'c1', userId: 'u1', userContent: 'q', res, signal: new AbortController().signal });

    const saved = messages.save.mock.calls.map((c) => c[0]);
    expect(saved[0]).toMatchObject({ role: 'user', content: 'q' });
    expect(saved[1]).toMatchObject({ role: 'assistant', isPartial: false, completionTokens: 25 });
    expect(saved[1].cost).toBe('0.00248');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'query', resource: 'financial_data' }));
    expect(usage.track).toHaveBeenCalledWith('u1', 0.00248);
    expect(res.writes.join('')).toContain('event: done');
  });

  it('saves a PARTIAL assistant message + charges partial cost when LlmService returns partial', async () => {
    const llm = stubLlm(
      [
        { type: 'token', data: { content: 'Apple' } },
        { type: 'usage', data: { promptTokens: 600, completionTokens: 2, cost: 0.00152 } },
      ],
      { result: { content: 'Apple', promptTokens: 600, completionTokens: 2, cost: 0.00152, toolCalls: [], toolResults: [], partial: true } },
    );
    const { service, messages, usage } = makeService(llm);
    const res = fakeRes();

    await service.stream({ conversationId: 'c1', userId: 'u1', userContent: 'q', res, signal: new AbortController().signal });

    const assistant = messages.save.mock.calls.map((c) => c[0]).find((m) => m.role === 'assistant');
    expect(assistant).toBeDefined();
    expect(assistant.isPartial).toBe(true);
    expect(usage.track).toHaveBeenCalledWith('u1', 0.00152); // partial charge (FR-017)
    expect(res.writes.join('')).not.toContain('event: done'); // client is gone
  });

  it('on OpenAI failure (not aborted) emits event:error and does not crash', async () => {
    const llm = { streamChat: async function* () { throw new Error('openai down'); } } as any;
    const { service, messages } = makeService(llm);
    const res = fakeRes();

    await service.stream({ conversationId: 'c1', userId: 'u1', userContent: 'q', res, signal: new AbortController().signal });

    expect(res.writes.join('')).toContain('event: error');
    // user message saved, but no assistant persisted on hard failure
    expect(messages.save.mock.calls.some((c) => c[0].role === 'assistant')).toBe(false);
  });
});
