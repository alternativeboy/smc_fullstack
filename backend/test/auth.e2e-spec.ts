import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 2.2 + 2.3 auth flow (requires the running docker stack + migrated users
 * table). Covers register/login/me, refresh rotation, reuse detection, logout.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let server: any;
  const password = 'password123';

  const refreshCookie = (res: request.Response): string => {
    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const found = setCookie?.find((c) => c.startsWith('refreshToken='));
    return found ? found.split(';')[0] : '';
  };

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

  describe('register / login / me', () => {
    const email = `user_${Date.now()}@example.com`;
    const displayName = 'Test User';
    let accessToken: string;

    it('POST /api/auth/register → 201, token + refresh cookie, no passwordHash', async () => {
      const res = await request(server)
        .post('/api/auth/register')
        .send({ email, password, displayName })
        .expect(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.expiresIn).toBe(900);
      expect(res.body.user).toMatchObject({ email, displayName });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|password_hash|refreshToken/);
      const cookie = refreshCookie(res);
      expect(cookie).toBeTruthy();
      expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/HttpOnly/i);
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

  describe('refresh rotation + reuse detection (CR-016)', () => {
    const email = `rot_${Date.now()}@example.com`;
    let cookie1: string;
    let cookie2: string;

    it('login issues a refresh cookie', async () => {
      await request(server).post('/api/auth/register').send({ email, password, displayName: 'Rot' }).expect(201);
      const res = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
      cookie1 = refreshCookie(res);
      expect(cookie1).toBeTruthy();
    });

    it('POST /api/auth/refresh rotates the cookie + issues a new access token (no token in body)', async () => {
      const res = await request(server).post('/api/auth/refresh').set('Cookie', cookie1).expect(200);
      expect(res.body.accessToken).toBeDefined();
      expect(JSON.stringify(res.body)).not.toMatch(/refreshToken/);
      cookie2 = refreshCookie(res);
      expect(cookie2).toBeTruthy();
      expect(cookie2).not.toBe(cookie1);
    });

    it('replaying the pre-rotation cookie → 401 (reuse detected)', () =>
      request(server).post('/api/auth/refresh').set('Cookie', cookie1).expect(401));

    it('family is revoked: the latest cookie also fails (must re-login)', () =>
      request(server).post('/api/auth/refresh').set('Cookie', cookie2).expect(401));

    it('missing refresh cookie → 401', () => request(server).post('/api/auth/refresh').expect(401));
  });

  describe('logout', () => {
    const email = `out_${Date.now()}@example.com`;

    it('clears the cookie and invalidates the refresh token', async () => {
      await request(server).post('/api/auth/register').send({ email, password, displayName: 'Out' }).expect(201);
      const login = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
      const cookie = refreshCookie(login);

      const logout = await request(server).post('/api/auth/logout').set('Cookie', cookie).expect(200);
      expect((logout.headers['set-cookie'] as unknown as string[])[0]).toMatch(/Max-Age=0|Expires=/i);

      // The refresh token no longer works after logout.
      await request(server).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
    });
  });
});
