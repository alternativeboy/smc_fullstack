import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as http from 'http';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Message } from '../src/chat/entities/message.entity';
import { AuditLog } from '../src/common/entities/audit-log.entity';
import { OPENAI_CLIENT } from '../src/llm/llm.constants';
import { UsageService } from '../src/usage/usage.service';

/**
 * Phase 5.2 — S3 (Stop) / S5 (refresh) mid-stream interruption. A SLOW mocked
 * OpenAI streams tokens with gaps and honours the abort signal, so a raw http
 * client can genuinely SEVER the socket mid-stream (no live spend). We then
 * assert a partial was saved + charged, an audit row written, and history stayed
 * intact.
 */
function slowStream(signal?: AbortSignal) {
  return (async function* () {
    const tokens = ['Apple ', 'had ', 'net ', 'income ', 'of ', '$96.99B.'];
    for (const t of tokens) {
      if (signal?.aborted) throw new Error('aborted'); // simulates OpenAI abort
      await new Promise((r) => setTimeout(r, 80));
      yield { choices: [{ delta: { content: t }, finish_reason: null }] };
    }
    yield { choices: [{ delta: {}, finish_reason: 'stop' }] };
    yield { choices: [], usage: { prompt_tokens: 900, completion_tokens: 20 } };
  })();
}
const mockOpenAI = {
  chat: { completions: { create: jest.fn((_body: any, options: any) => Promise.resolve(slowStream(options?.signal))) } },
};

const waitFor = async <T>(fn: () => Promise<T | null>, timeout = 5000): Promise<T | null> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = await fn();
    if (v) return v;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
};

describe('Interruption S3/S5 (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let port: number;
  let messageRepo: Repository<Message>;
  let auditRepo: Repository<AuditLog>;
  let usage: UsageService;
  const password = 'password123';

  const setup = async (email: string) => {
    const reg = await request(server).post('/api/auth/register').send({ email, password, displayName: email }).expect(201);
    const login = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
    return { auth: `Bearer ${login.body.accessToken}`, userId: reg.body.user.id as string };
  };

  // POST the message via a raw socket and DESTROY it after the first token event.
  const postAndSever = (path: string, token: string, contentBody: object) =>
    new Promise<void>((resolve) => {
      const body = JSON.stringify(contentBody);
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), Authorization: token },
        },
        (res) => {
          res.on('data', (chunk) => {
            if (chunk.toString().includes('event: token')) {
              req.destroy(); // ← genuinely sever the connection mid-stream
            }
          });
          res.on('close', finish);
          res.on('aborted', finish);
          res.on('error', finish);
        },
      );
      req.on('close', finish);
      req.on('error', finish); // destroy surfaces ECONNRESET here
      setTimeout(finish, 3000); // hard fallback
      req.write(body);
      req.end();
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(OPENAI_CLIENT)
      .useValue(mockOpenAI)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0); // bind a real port for the raw http client
    server = app.getHttpServer();
    port = (server.address() as { port: number }).port;
    messageRepo = app.get(getRepositoryToken(Message));
    auditRepo = app.get(getRepositoryToken(AuditLog));
    usage = app.get(UsageService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('severs the stream mid-flight → partial saved + charged, audit written, history intact', async () => {
    const { auth, userId } = await setup(`abort_${Date.now()}@example.com`);
    const conv = await request(server).post('/api/conversations').set('Authorization', auth).expect(201);
    const convId = conv.body.id as string;

    await postAndSever(`/api/conversations/${convId}/messages`, auth, { content: "What was Apple's net income in 2023?" });

    // The server persists the partial asynchronously after req 'close' → poll.
    const partial = await waitFor(async () => {
      const rows = await messageRepo.find({ where: { conversationId: convId, role: 'assistant' } });
      return rows.find((m) => m.isPartial) ?? null;
    });

    expect(partial).toBeTruthy();
    expect((partial!.content ?? '').length).toBeGreaterThan(0); // produced text kept (FR-016)
    expect(parseFloat(partial!.cost)).toBeGreaterThan(0); // partial cost charged (FR-017)

    // Redis usage was charged.
    const status = await usage.getStatus(userId);
    expect(status.currentSpend).toBeGreaterThan(0);

    // Audit row written with is_partial.
    const audits = await auditRepo.find({ where: { action: 'query' } });
    expect(audits.some((a) => (a.metadata as any)?.is_partial === true)).toBe(true);

    // History intact + ordered + no duplicates: user msg + the single partial (NFR-007/008).
    const detail = await request(server).get(`/api/conversations/${convId}`).set('Authorization', auth).expect(200);
    expect(detail.body.messages).toHaveLength(2);
    expect(detail.body.messages[0].role).toBe('user');
    expect(detail.body.messages[1].role).toBe('assistant');
    expect(detail.body.messages[1].isPartial).toBe(true);
  }, 25000); // socket sever + async partial-persist + poll need headroom
});
