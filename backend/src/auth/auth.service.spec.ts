import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  const repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const jwt = {
    sign: jest.fn(() => 'signed.jwt.token'),
    decode: jest.fn(() => ({ iat: 0, exp: 900 })),
  };
  const config = {
    get: jest.fn((k: string) => (k === 'BCRYPT_COST' ? 12 : undefined)),
    getOrThrow: jest.fn((k: string) => (k === 'BCRYPT_COST' ? 12 : undefined)),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('creates a user, returns a token, and never leaks passwordHash', async () => {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockImplementation((u) => u);
      repo.save.mockImplementation(async (u) => ({ ...u, id: 'uuid-1' }));

      const res = await service.register({
        email: 'a@b.com',
        password: 'password123',
        displayName: 'A',
      });

      expect(res.accessToken).toBe('signed.jwt.token');
      expect(res.expiresIn).toBe(900);
      expect(res.user).toEqual({ id: 'uuid-1', email: 'a@b.com', displayName: 'A' });
      expect(JSON.stringify(res)).not.toMatch(/passwordHash|password123/);
    });

    it('rejects a duplicate email with 409', async () => {
      repo.findOne.mockResolvedValue({ id: 'x', email: 'a@b.com' });
      await expect(
        service.register({ email: 'a@b.com', password: 'password123', displayName: 'A' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      repo.findOne.mockResolvedValue({
        id: 'uuid-1',
        email: 'a@b.com',
        displayName: 'A',
        passwordHash,
      });
      const res = await service.login({ email: 'a@b.com', password: 'password123' });
      expect(res.accessToken).toBe('signed.jwt.token');
    });

    it('rejects a wrong password with 401', async () => {
      const passwordHash = await bcrypt.hash('password123', 12);
      repo.findOne.mockResolvedValue({
        id: 'uuid-1',
        email: 'a@b.com',
        displayName: 'A',
        passwordHash,
      });
      await expect(
        service.login({ email: 'a@b.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown email with 401', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nobody@b.com', password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
