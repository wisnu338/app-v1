import { HttpException } from '@nestjs/common';
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
import { AuthSecurityService } from './auth-security.service';
import { RedisService } from '@infrastructure/redis';

const redisClient = {
  get: jest.fn<Promise<string | null>, [string]>(),
  incr: jest.fn<Promise<number>, [string]>(),
  expire: jest.fn<Promise<number>, [string, number]>(),
  del: jest.fn<Promise<number>, [string | string[]]>(),
  setex: jest.fn<Promise<'OK'>, [string, number, string]>(),
  rpush: jest.fn<Promise<number>, [string, string]>(),
  ltrim: jest.fn<Promise<'OK'>, [string, number, number]>(),
};

const mockRedisService = {
  isReady: jest.fn<boolean, []>(),
  getClient: jest.fn<ReturnType<RedisService['getClient']>, []>(() => redisClient as any),
};

describe('AuthSecurityService', () => {
  let service: AuthSecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.isReady.mockReturnValue(true);
    service = new AuthSecurityService(mockRedisService as unknown as RedisService);
  });

  it('blocks login attempts when a lockout key is already present', async () => {
    redisClient.get.mockResolvedValueOnce('1');
    redisClient.get.mockResolvedValueOnce(null);

    await expect(
      service.preflightLogin({
        identifier: 'user@example.com',
        tenantId: 'tenant-1',
        ipAddress: '10.0.0.20',
        userAgent: 'jest',
      }),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('records failed login attempts and escalates them to a lockout', async () => {
    redisClient.incr.mockResolvedValueOnce(5);
    redisClient.incr.mockResolvedValueOnce(5);

    await service.recordLoginFailure({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: '10.0.0.20',
      userAgent: 'jest',
    });

    expect(redisClient.setex).toHaveBeenCalledTimes(1);
    expect(redisClient.setex).toHaveBeenCalledWith(
      expect.stringContaining('identifier'),
      900,
      '1',
    );
    expect(redisClient.rpush).toHaveBeenCalledWith(
      'auth:security:events',
      expect.stringContaining('auth.login.suspicious'),
    );
  });

  it('clears counters after a successful login', async () => {
    await service.recordLoginSuccess({
      identifier: 'user@example.com',
      tenantId: 'tenant-1',
      ipAddress: '10.0.0.20',
    });

    expect(redisClient.del).toHaveBeenCalledTimes(4);
  });
});
