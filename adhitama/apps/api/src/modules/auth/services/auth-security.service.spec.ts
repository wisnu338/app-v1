import { HttpException } from '@nestjs/common';
import { AuthSecurityService } from './auth-security.service';

const redisClient = {
  get: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  setex: jest.fn(),
  rpush: jest.fn(),
  ltrim: jest.fn(),
};

const mockRedisService = {
  isReady: jest.fn(),
  getClient: jest.fn(() => redisClient),
};

describe('AuthSecurityService', () => {
  let service: AuthSecurityService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisService.isReady.mockReturnValue(true);
    service = new AuthSecurityService(mockRedisService as never);
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
