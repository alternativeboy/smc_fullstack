import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Message } from '../src/chat/entities/message.entity';

/**
 * Phase 3.2 conversation CRUD + user isolation (requires the running docker
 * stack + migrated chat tables). Covers the happy path, cross-user 404 isolation
 * (FR-014), and message ordering (NFR-008).
 */
describe('Chat — conversations CRUD + isolation (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let messageRepo: any;
  const password = 'password123';

  const bearerFor = async (email: string) => {
    await request(server).post('/api/auth/register').send({ email, password, displayName: email }).expect(201);
    const res = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
    return `Bearer ${res.body.accessToken}`;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    server = app.getHttpServer();
    messageRepo = app.get(getRepositoryToken(Message));
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('CRUD happy path', () => {
    let auth: string;
    let convId: string;

    it('sets up user A', async () => {
      auth = await bearerFor(`chatA_${Date.now()}@example.com`);
    });

    it('POST /api/conversations → 201 with default title', async () => {
      const res = await request(server).post('/api/conversations').set('Authorization', auth).expect(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('New Chat');
      convId = res.body.id;
    });

    it('GET /api/conversations → 200 paginated shape containing the conversation', async () => {
      const res = await request(server).get('/api/conversations').set('Authorization', auth).expect(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c: any) => c.id === convId)).toBe(true);
    });

    it('GET /api/conversations/:id → 200 with empty messages', async () => {
      const res = await request(server).get(`/api/conversations/${convId}`).set('Authorization', auth).expect(200);
      expect(res.body.id).toBe(convId);
      expect(res.body.messages).toEqual([]);
    });

    it('DELETE /api/conversations/:id → 200 message; then gone + 404', async () => {
      const del = await request(server).delete(`/api/conversations/${convId}`).set('Authorization', auth).expect(200);
      expect(del.body).toEqual({ message: 'Conversation deleted successfully' });

      const list = await request(server).get('/api/conversations').set('Authorization', auth).expect(200);
      expect(list.body.data.some((c: any) => c.id === convId)).toBe(false);

      await request(server).get(`/api/conversations/${convId}`).set('Authorization', auth).expect(404);
    });

    it('requires auth → 401 without a token', () =>
      request(server).get('/api/conversations').expect(401));
  });

  describe('cross-user isolation (FR-014) → 404, never data', () => {
    let authA: string;
    let authB: string;
    let convOfA: string;

    it('sets up users A and B; A owns a conversation', async () => {
      authA = await bearerFor(`isoA_${Date.now()}@example.com`);
      authB = await bearerFor(`isoB_${Date.now()}@example.com`);
      const res = await request(server).post('/api/conversations').set('Authorization', authA).expect(201);
      convOfA = res.body.id;
    });

    it("B cannot GET A's conversation → 404", () =>
      request(server).get(`/api/conversations/${convOfA}`).set('Authorization', authB).expect(404));

    it("B cannot GET A's messages → 404", () =>
      request(server).get(`/api/conversations/${convOfA}/messages`).set('Authorization', authB).expect(404));

    it("B cannot DELETE A's conversation → 404", () =>
      request(server).delete(`/api/conversations/${convOfA}`).set('Authorization', authB).expect(404));

    it("A's conversation is untouched and absent from B's list", async () => {
      await request(server).get(`/api/conversations/${convOfA}`).set('Authorization', authA).expect(200);
      const listB = await request(server).get('/api/conversations').set('Authorization', authB).expect(200);
      expect(listB.body.data.some((c: any) => c.id === convOfA)).toBe(false);
    });
  });

  describe('message ordering (NFR-008)', () => {
    let auth: string;
    let convId: string;

    it('returns messages in created_at ASC regardless of insert order', async () => {
      auth = await bearerFor(`ordA_${Date.now()}@example.com`);
      const res = await request(server).post('/api/conversations').set('Authorization', auth).expect(201);
      convId = res.body.id;

      // Seed out of order with explicit created_at (raw insert to bypass auto-timestamp).
      await messageRepo.query(
        `INSERT INTO messages (conversation_id, role, content, created_at) VALUES
         ($1,'user','third',$2),($1,'user','first',$3),($1,'user','second',$4)`,
        [convId, '2020-01-03T00:00:00Z', '2020-01-01T00:00:00Z', '2020-01-02T00:00:00Z'],
      );

      const msgs = await request(server)
        .get(`/api/conversations/${convId}/messages`)
        .set('Authorization', auth)
        .expect(200);
      expect(msgs.body.map((m: any) => m.content)).toEqual(['first', 'second', 'third']);
    });
  });
});
