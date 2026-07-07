import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Message } from '../src/chat/entities/message.entity';
import { AuditLog } from '../src/common/entities/audit-log.entity';

/**
 * Phase 3.3 — S6 (delete conversation) + append-only audit trail.
 * Requires the running docker stack + migrated chat tables. Reconciled per
 * CLAUDE.md §2: soft-delete → conversation hidden (404), messages RETAINED (not
 * cascade-removed), and a delete_conversation audit row is written.
 */
describe('S6 — delete conversation + audit (e2e)', () => {
  let app: INestApplication;
  let server: any;
  let messageRepo: Repository<Message>;
  let auditRepo: Repository<AuditLog>;
  const password = 'password123';

  const setup = async (email: string) => {
    const reg = await request(server)
      .post('/api/auth/register')
      .send({ email, password, displayName: email })
      .expect(201);
    const login = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
    return { auth: `Bearer ${login.body.accessToken}`, userId: reg.body.user.id as string };
  };

  const seedMessages = (conversationId: string, n: number) =>
    messageRepo.query(
      `INSERT INTO messages (conversation_id, role, content) ` +
        `SELECT $1, 'user', 'm' || g FROM generate_series(1, $2) g`,
      [conversationId, n],
    );

  const findDeleteAudit = async (conversationId: string) => {
    const rows = await auditRepo.find({ where: { action: 'delete_conversation' } });
    return rows.find((r) => (r.metadata as any)?.conversationId === conversationId);
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
    auditRepo = app.get(getRepositoryToken(AuditLog));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('delete → 200, audit row written, conversation hidden (404), messages retained', async () => {
    const { auth, userId } = await setup(`s6_${Date.now()}@example.com`);
    const created = await request(server).post('/api/conversations').set('Authorization', auth).expect(201);
    const convId = created.body.id as string;
    await seedMessages(convId, 2);

    const del = await request(server).delete(`/api/conversations/${convId}`).set('Authorization', auth).expect(200);
    expect(del.body).toEqual({ message: 'Conversation deleted successfully' });

    // audit row written with the expected action/resource/metadata + user
    const audit = await findDeleteAudit(convId);
    expect(audit).toBeDefined();
    expect(audit!.resource).toBe('conversation');
    expect(audit!.userId).toBe(userId);
    expect((audit!.metadata as any).messageCount).toBe(2);

    // conversation hidden
    await request(server).get(`/api/conversations/${convId}`).set('Authorization', auth).expect(404);
    const list = await request(server).get('/api/conversations').set('Authorization', auth).expect(200);
    expect(list.body.data.some((c: any) => c.id === convId)).toBe(false);

    // messages RETAINED in the DB (soft-delete keeps history — no cascade)
    const retained = await messageRepo.count({ where: { conversationId: convId } });
    expect(retained).toBe(2);
  });

  it('cross-user: B deleting A\'s conversation → 404 AND no audit row', async () => {
    const a = await setup(`s6a_${Date.now()}@example.com`);
    const b = await setup(`s6b_${Date.now()}@example.com`);
    const created = await request(server).post('/api/conversations').set('Authorization', a.auth).expect(201);
    const convId = created.body.id as string;

    await request(server).delete(`/api/conversations/${convId}`).set('Authorization', b.auth).expect(404);

    const audit = await findDeleteAudit(convId);
    expect(audit).toBeUndefined();

    // A's conversation is still there
    await request(server).get(`/api/conversations/${convId}`).set('Authorization', a.auth).expect(200);
  });
});
