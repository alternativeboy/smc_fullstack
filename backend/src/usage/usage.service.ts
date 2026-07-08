import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { UsageStatus } from './interfaces/usage-status.interface';

/**
 * Per-user spend tracking (FR-009/010/011, CR-015) in Redis: key `usage:{userId}`
 * holds cumulative USD spend. Reset is TTL-based — no cron/polling (locked).
 */
@Injectable()
export class UsageService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  /** Atomically add a cost and set the reset window on the FIRST spend only. */
  async track(userId: string, cost: number): Promise<void> {
    if (!cost || cost <= 0) return;
    const key = this.key(userId);
    await this.redis.incrbyfloat(key, cost); // atomic — no read-modify-write race
    // Sequential TTL read (not parallel) so a brand-new key reports -1, not the
    // -2 a pre-increment read would give — otherwise the key would never expire.
    const ttl = await this.redis.ttl(key);
    if (ttl === -1) {
      await this.redis.expire(key, this.interval());
    }
  }

  async getStatus(userId: string): Promise<UsageStatus> {
    const key = this.key(userId);
    const [raw, ttl] = await Promise.all([this.redis.get(key), this.redis.ttl(key)]);
    const currentSpend = raw ? parseFloat(raw) : 0;
    const limit = this.limit();
    const interval = this.interval();
    const secondsToReset = ttl > 0 ? ttl : interval;
    return {
      currentSpend,
      limit,
      remaining: Math.max(0, limit - currentSpend),
      resetAt: new Date(Date.now() + secondsToReset * 1000).toISOString(),
      resetIntervalSeconds: interval,
    };
  }

  private key(userId: string): string {
    return `usage:${userId}`;
  }

  private limit(): number {
    return this.config.getOrThrow<number>('USAGE_LIMIT');
  }

  private interval(): number {
    return this.config.getOrThrow<number>('USAGE_RESET_INTERVAL');
  }
}
