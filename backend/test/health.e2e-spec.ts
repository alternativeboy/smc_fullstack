import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Requires a running Postgres + Redis (docker compose up). With both healthy,
 * GET /api/health returns 200 and status "ok". This is the Phase-1 DoD e2e.
 */
describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/health → 200, status ok, postgres + redis up', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.info).toHaveProperty('postgres');
    expect(res.body.info).toHaveProperty('redis');
    expect(res.body.info.postgres.status).toBe('up');
    expect(res.body.info.redis.status).toBe('up');
  });
});
