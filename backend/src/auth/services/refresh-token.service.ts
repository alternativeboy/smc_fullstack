import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.constants';

interface RefreshPayload {
  sub: string; // userId
  jti: string; // token id
}

/**
 * Refresh-token store (CR-016, erd.md). Each refresh token is a JWT carrying
 * userId + a unique jti; only the SHA-256 hash is kept server-side at
 * refresh:{userId}:{jti}. Rotation is single-use; a signature-valid token whose
 * Redis key is gone means it was already rotated away → theft → revoke the whole
 * family.
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Mint a new refresh token for a user and store its hash. Returns the raw token. */
  async issue(userId: string): Promise<string> {
    const jti = randomUUID();
    const token = await this.jwt.signAsync(
      { sub: userId, jti },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES'),
      },
    );
    const ttl = this.config.getOrThrow<number>('REFRESH_TOKEN_TTL');
    await this.redis.set(this.key(userId, jti), this.hash(token), 'EX', ttl);
    return token;
  }

  /**
   * Validate + rotate. Returns { userId, token } with a freshly minted token.
   * Throws Unauthorized on an invalid/expired token, and on reuse (after
   * revoking the whole session family).
   */
  async rotate(presented: string): Promise<{ userId: string; token: string }> {
    const payload = await this.verify(presented);
    const { sub: userId, jti } = payload;
    const stored = await this.redis.get(this.key(userId, jti));

    if (!stored) {
      // Signature valid but key gone ⇒ already used ⇒ theft. Revoke everything.
      await this.revokeFamily(userId);
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (stored !== this.hash(presented)) {
      await this.revokeFamily(userId);
      throw new UnauthorizedException('Refresh token mismatch');
    }

    await this.redis.del(this.key(userId, jti)); // single-use
    const token = await this.issue(userId);
    return { userId, token };
  }

  /** Best-effort revoke of the presented token (logout). Never throws. */
  async revoke(presented: string): Promise<void> {
    try {
      const { sub, jti } = await this.verify(presented);
      await this.redis.del(this.key(sub, jti));
    } catch {
      // ignore — logout clears the cookie regardless
    }
  }

  private async verify(token: string): Promise<RefreshPayload> {
    try {
      return await this.jwt.verifyAsync<RefreshPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async revokeFamily(userId: string): Promise<void> {
    const keys = await this.scanKeys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  private key(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
