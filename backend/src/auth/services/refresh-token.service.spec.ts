import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import { REDIS_CLIENT } from '../../redis/redis.constants';
import { RefreshTokenService } from './refresh-token.service';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

describe('RefreshTokenService (CR-016)', () => {
  let service: RefreshTokenService;
  const redis = { set: jest.fn(), get: jest.fn(), del: jest.fn(), scan: jest.fn() };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const config = {
    getOrThrow: jest.fn((k: string) => {
      const map: Record<string, unknown> = {
        JWT_REFRESH_SECRET: 'refresh-secret',
        JWT_REFRESH_EXPIRES: '7d',
        REFRESH_TOKEN_TTL: 604800,
      };
      return map[k];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(RefreshTokenService);
  });

  it('issue: stores only the sha256 hash with the configured TTL', async () => {
    jwt.signAsync.mockResolvedValue('signed-token');
    const token = await service.issue('user-1');
    expect(token).toBe('signed-token');
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^refresh:user-1:/),
      sha256('signed-token'),
      'EX',
      604800,
    );
  });

  it('rotate: single-use — deletes the old key and mints a new token', async () => {
    const presented = 'old-token';
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'jti-old' });
    redis.get.mockResolvedValue(sha256(presented)); // stored hash matches
    jwt.signAsync.mockResolvedValue('new-token');

    const res = await service.rotate(presented);

    expect(redis.del).toHaveBeenCalledWith('refresh:user-1:jti-old');
    expect(res).toEqual({ userId: 'user-1', token: 'new-token' });
  });

  it('rotate: reuse — missing key revokes the whole family and throws 401', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'jti-stale' });
    redis.get.mockResolvedValue(null); // already rotated away
    redis.scan.mockResolvedValue(['0', ['refresh:user-1:jti-current']]);

    await expect(service.rotate('replayed-token')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(redis.del).toHaveBeenCalledWith('refresh:user-1:jti-current');
  });

  it('rotate: an invalid/expired token is rejected with 401', async () => {
    jwt.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expect(service.rotate('garbage')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revoke: deletes the presented key and never throws on a bad token', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', jti: 'jti-1' });
    await service.revoke('a-token');
    expect(redis.del).toHaveBeenCalledWith('refresh:user-1:jti-1');

    jwt.verifyAsync.mockRejectedValue(new Error('bad'));
    await expect(service.revoke('bad-token')).resolves.toBeUndefined();
  });
});
