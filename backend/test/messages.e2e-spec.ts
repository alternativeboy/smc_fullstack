import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Message } from '../src/chat/entities/message.entity';
import { AuditLog } from '../src/common/entities/audit-log.entity';
import { OPENAI_CLIENT } from '../src/llm/llm.constants';

/**
 * Phase 4b.2 — SSE endpoint + persistence + audit. OpenAI is MOCKED (no spend);
 * the generated SQL still executes for real via llm_reader against the docker DB.
 */
const APPLE_SQL = "SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023";

async function* chunks(list: any[]) {
  for (const c of list) yield c;
}

const ROUND_TOOLCALL = [
  {
    choices: [
      {
        delta: { tool_calls: [{ index: 0, id: 'call_1', function: { name: 'execute_sql', arguments: JSON.stringify({ query: APPLE_SQL }) } }] },
        finish_reason: null,
      },
    ],
  },
  { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
  { choices: [], usage: { prompt_tokens: 850, completion_tokens: 20 } },
];

const ROUND_FINAL = [
  { choices: [{ delta: { content: "Apple's net income in 2023 was $96.99 billion." }, finish_reason: null }] },
  { choices: [{ delta: {}, finish_reason: 'stop' }] },
  { choices: [], usage: { prompt_tokens: 900, completion_tokens: 25 } },
];

// Deterministic per call: tool-call round until a tool result is in the messages, then the final round.
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn((body: any) =>
        Promise.resolve(chunks(body.messages.some((m: any) => m.role === 'tool') ? ROUND_FINAL : ROUND_TOOLCALL)),
      ),
    },
  },
};

describe('Messages SSE (e2e, mocked OpenAI)', () => {
  let app: INestApplication;
  let server: any;
  let messageRepo: Repository<Message>;
  let auditRepo: Repository<AuditLog>;
  const password = 'password123';

  const bearer = async (email: string) => {
    await request(server).post('/api/auth/register').send({ email, password, displayName: email }).expect(201);
    const res = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
    return `Bearer ${res.body.accessToken}`;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OPENAI_CLIENT)
      .useValue(mockOpenAI)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    server = app.getHttpServer();
    messageRepo = app.get(getRepositoryToken(Message));
    auditRepo = app.get(getRepositoryToken(AuditLog));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('streams SSE events, persists user+assistant, writes a query audit row', async () => {
    const auth = await bearer(`msgA_${Date.now()}@example.com`);
    const conv = await request(server).post('/api/conversations').set('Authorization', auth).expect(201);
    const convId = conv.body.id as string;

    const res = await request(server)
      .post(`/api/conversations/${convId}/messages`)
      .set('Authorization', auth)
      .send({ content: "What was Apple's net income in 2023?" })
      .expect(200);

    // ordered SSE events
    for (const ev of ['event: tool_call', 'event: tool_result', 'event: token', 'event: usage', 'event: done']) {
      expect(res.text).toContain(ev);
    }

    // persistence: user + assistant, in order
    const detail = await request(server).get(`/api/conversations/${convId}`).set('Authorization', auth).expect(200);
    expect(detail.body.messages).toHaveLength(2);
    expect(detail.body.messages[0].role).toBe('user');
    expect(detail.body.messages[1].role).toBe('assistant');
    expect(detail.body.messages[1].content).toContain('$96.99 billion');
    expect(detail.body.messages[1].isPartial).toBe(false);
    expect(detail.body.messages[1].cost).toBeCloseTo(1750 * 2.5e-6 + 45 * 1e-5, 6);
    expect(detail.body.messages[1].toolCalls).toBeTruthy();

    // audit 'query' row for this user
    const audits = await auditRepo.find({ where: { action: 'query' } });
    const row = audits.find((a) => (a.metadata as any)?.results_count >= 1);
    expect(row).toBeDefined();
    expect(row!.resource).toBe('financial_data');
  });

  it('posting to another user\'s conversation → 404', async () => {
    const authA = await bearer(`msgOwnerA_${Date.now()}@example.com`);
    const authB = await bearer(`msgOwnerB_${Date.now()}@example.com`);
    const conv = await request(server).post('/api/conversations').set('Authorization', authA).expect(201);
    await request(server)
      .post(`/api/conversations/${conv.body.id}/messages`)
      .set('Authorization', authB)
      .send({ content: 'hi' })
      .expect(404);
  });
});
