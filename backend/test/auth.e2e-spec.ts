import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 2.2 register / login / me (requires the running docker stack + migrated
 * users table). Kept in its own file so its throttle counter is isolated from
 * the refresh-flow suite (see auth-refresh.e2e-spec.ts).
 */
describe('Auth — register / login / me (e2e)', () => {
  let app: INestApplication;
  let server: any;
  const email = `user_${Date.now()}@example.com`;
  const password = 'password123';
  const displayName = 'Test User';
  let accessToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.use(cookieParser());
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/auth/register → 201, token + HttpOnly refresh cookie, no passwordHash', async () => {
    const res = await request(server)
      .post('/api/auth/register')
      .send({ email, password, displayName })
      .expect(201);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.expiresIn).toBe(900);
    expect(res.body.user).toMatchObject({ email, displayName });
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash|refreshToken/);
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    expect(setCookie[0]).toMatch(/refreshToken=/);
    expect(setCookie[0]).toMatch(/HttpOnly/i);
  });

  it('POST /api/auth/register duplicate email → 409', () =>
    request(server)
      .post('/api/auth/register')
      .send({ email, password, displayName: 'Dup' })
      .expect(409));

  it('POST /api/auth/register invalid body → 400', () =>
    request(server)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400));

  it('POST /api/auth/login → 200, token', async () => {
    const res = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
    expect(res.body.accessToken).toBeDefined();
    accessToken = res.body.accessToken;
  });

  it('POST /api/auth/login wrong password → 401', () =>
    request(server).post('/api/auth/login').send({ email, password: 'wrong-password' }).expect(401));

  it('GET /api/auth/me with Bearer → 200', async () => {
    const res = await request(server)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body).toMatchObject({ email, displayName });
    expect(res.body.id).toBeDefined();
  });

  it('GET /api/auth/me without token → 401', () =>
    request(server).get('/api/auth/me').expect(401));

  it('GET /api/auth/me with bad token → 401', () =>
    request(server).get('/api/auth/me').set('Authorization', 'Bearer not.a.real.token').expect(401));
});
