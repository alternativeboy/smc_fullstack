import { ConfigService } from '@nestjs/config';
import { UsageService } from './usage.service';

describe('UsageService', () => {
  const redis = { incrbyfloat: jest.fn(), ttl: jest.fn(), expire: jest.fn(), get: jest.fn() };
  const config = {
    getOrThrow: jest.fn((k: string) => (k === 'USAGE_LIMIT' ? 1.0 : k === 'USAGE_RESET_INTERVAL' ? 3600 : undefined)),
  } as unknown as ConfigService;
  let service: UsageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsageService(redis as any, config);
  });

  it('first spend sets the TTL window (EXPIRE)', async () => {
    redis.incrbyfloat.mockResolvedValue('0.005');
    redis.ttl.mockResolvedValue(-1);
    await service.track('u1', 0.005);
    expect(redis.incrbyfloat).toHaveBeenCalledWith('usage:u1', 0.005);
    expect(redis.expire).toHaveBeenCalledWith('usage:u1', 3600);
  });

  it('subsequent spend does NOT reset the TTL (window integrity)', async () => {
    redis.incrbyfloat.mockResolvedValue('0.01');
    redis.ttl.mockResolvedValue(1800);
    await service.track('u1', 0.005);
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('uses atomic INCRBYFLOAT — never read-modify-write', async () => {
    redis.incrbyfloat.mockResolvedValue('0.005');
    redis.ttl.mockResolvedValue(1800);
    await service.track('u1', 0.005);
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('ignores a non-positive cost', async () => {
    await service.track('u1', 0);
    expect(redis.incrbyfloat).not.toHaveBeenCalled();
  });

  it('getStatus computes remaining and resetAt', async () => {
    redis.get.mockResolvedValue('0.25');
    redis.ttl.mockResolvedValue(1800);
    const status = await service.getStatus('u1');
    expect(status.currentSpend).toBe(0.25);
    expect(status.limit).toBe(1.0);
    expect(status.remaining).toBeCloseTo(0.75, 6);
    expect(status.resetIntervalSeconds).toBe(3600);
    expect(typeof status.resetAt).toBe('string');
  });

  it('getStatus defaults to zero spend for a new user', async () => {
    redis.get.mockResolvedValue(null);
    redis.ttl.mockResolvedValue(-2);
    const status = await service.getStatus('new');
    expect(status.currentSpend).toBe(0);
    expect(status.remaining).toBe(1.0);
  });
});
