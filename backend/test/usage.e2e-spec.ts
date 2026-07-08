import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { OPENAI_CLIENT } from '../src/llm/llm.constants';
import { UsageService } from '../src/usage/usage.service';

/**
 * Phase 5.1 — usage tracking + limit guard (S4). OpenAI is MOCKED (no spend).
 * We charge a real message, then exhaust the budget via track() (reliable, no
 * env fiddling) so the pre-flight guard blocks the next message with a 429.
 */
const APPLE_SQL = "SELECT net_income FROM financial_data WHERE company = 'Apple' AND year = 2023";
async function* chunks(list: any[]) {
  for (const c of list) yield c;
}
const ROUND_TOOLCALL = [
  { choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'execute_sql', arguments: JSON.stringify({ query: APPLE_SQL }) } }] }, finish_reason: null }] },
  { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
  { choices: [], usage: { prompt_tokens: 850, completion_tokens: 20 } },
];
const ROUND_FINAL = [
  { choices: [{ delta: { content: "Apple's net income in 2023 was $96.99 billion." }, finish_reason: null }] },
  { choices: [{ delta: {}, finish_reason: 'stop' }] },
  { choices: [], usage: { prompt_tokens: 900, completion_tokens: 25 } },
];
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn((body: any) => Promise.resolve(chunks(body.messages.some((m: any) => m.role === 'tool') ? ROUND_FINAL : ROUND_TOOLCALL))),
    },
  },
};

describe('Usage (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let usage: UsageService;
  const password = 'password123';

  const setup = async (email: string) => {
    const reg = await request(server).post('/api/auth/register').send({ email, password, displayName: email }).expect(201);
    const login = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
    return { auth: `Bearer ${login.body.accessToken}`, userId: reg.body.user.id as string };
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
    usage = app.get(UsageService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('S4: a message charges usage; exhausting the budget → friendly 429', async () => {
    const { auth, userId } = await setup(`usage_${Date.now()}@example.com`);
    const conv = await request(server).post('/api/conversations').set('Authorization', auth).expect(201);
    const convId = conv.body.id as string;

    const before = await request(server).get('/api/usage/status').set('Authorization', auth).expect(200);
    expect(before.body.currentSpend).toBe(0);
    expect(before.body.remaining).toBeGreaterThan(0);

    // A normal message is allowed and charges usage.
    await request(server).post(`/api/conversations/${convId}/messages`).set('Authorization', auth).send({ content: 'hi' }).expect(200);
    const mid = await request(server).get('/api/usage/status').set('Authorization', auth).expect(200);
    expect(mid.body.currentSpend).toBeGreaterThan(0);

    // Exhaust the remaining budget, then the pre-flight guard blocks the next one.
    await usage.track(userId, mid.body.remaining + 0.01);
    const after = await request(server).get('/api/usage/status').set('Authorization', auth).expect(200);
    expect(after.body.remaining).toBe(0);
    expect(typeof after.body.resetAt).toBe('string');

    const blocked = await request(server).post(`/api/conversations/${convId}/messages`).set('Authorization', auth).send({ content: 'again' }).expect(429);
    expect(blocked.body.error).toBe('Usage Limit Exceeded');
    expect(blocked.body.message).toMatch(/spending limit of \$/);
    expect(blocked.body.resetAt).toBeDefined();
  });

  it('track() is atomic under concurrency (real Redis)', async () => {
    const userId = `concurrency_${Date.now()}`;
    await Promise.all(Array.from({ length: 20 }, () => usage.track(userId, 0.01)));
    const status = await usage.getStatus(userId);
    expect(status.currentSpend).toBeCloseTo(0.2, 6);
  });
});
