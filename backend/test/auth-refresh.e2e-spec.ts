import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 2.3 refresh rotation, reuse detection, and logout (CR-016). Separate
 * file → separate app → isolated throttle counter, so the register/login calls
 * here don't share the auth.e2e suite's rate-limit window.
 */
describe('Auth — refresh rotation / reuse / logout (e2e)', () => {
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

  describe('rotation + reuse detection', () => {
    const email = `rot_${Date.now()}@example.com`;
    let cookie1: string;
    let cookie2: string;

    it('login issues a refresh cookie', async () => {
      await request(server)
        .post('/api/auth/register')
        .send({ email, password, displayName: 'Rot' })
        .expect(201);
      const res = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
      cookie1 = refreshCookie(res);
      expect(cookie1).toBeTruthy();
    });

    it('POST /api/auth/refresh rotates the cookie + new access token (no token in body)', async () => {
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
      await request(server)
        .post('/api/auth/register')
        .send({ email, password, displayName: 'Out' })
        .expect(201);
      const login = await request(server).post('/api/auth/login').send({ email, password }).expect(200);
      const cookie = refreshCookie(login);

      const logout = await request(server).post('/api/auth/logout').set('Cookie', cookie).expect(200);
      expect((logout.headers['set-cookie'] as unknown as string[])[0]).toMatch(/Max-Age=0|Expires=/i);

      // The refresh token no longer works after logout.
      await request(server).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
    });
  });
});
