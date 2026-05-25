import { UnauthorizedException } from '@nestjs/common';
import { SessionService } from './session.service';

const mockSessionRepository = {
  findActiveSessionById: jest.fn(),
  findSessionById: jest.fn(),
  revokeAll: jest.fn(),
  revokeSessionChain: jest.fn(),
};

const mockPasswordService = {
  hash: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue({ refreshTokenExpiresIn: '7d' }),
};

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SessionService(
      mockSessionRepository as any,
      mockPasswordService as any,
      mockConfigService as any,
    );
  });

  describe('verifyRefreshTokenOwnership()', () => {
    it('should return the active session when the raw token matches the stored hash', async () => {
      mockSessionRepository.findActiveSessionById.mockResolvedValue({
        id: 'session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 1000 * 60),
        revokedAt: null,
        createdAt: new Date(),
        refreshTokenHash: 'stored-hash',
      });
      mockPasswordService.verify.mockResolvedValue(true);

      const session = await service.verifyRefreshTokenOwnership(
        'raw-refresh-token',
        'session-id',
        'user-id',
        'tenant-id',
      );

      expect(session.id).toBe('session-id');
      expect(mockSessionRepository.findActiveSessionById).toHaveBeenCalledWith(
        'session-id',
        'user-id',
      );
      expect(mockPasswordService.verify).toHaveBeenCalledWith(
        'raw-refresh-token',
        'stored-hash',
      );
    });

    it('should revoke all sessions and throw when the session is stale but present', async () => {
      mockSessionRepository.findActiveSessionById.mockResolvedValue(null);
      mockSessionRepository.findSessionById.mockResolvedValue({
        id: 'session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: new Date(Date.now() - 2000),
        createdAt: new Date(Date.now() - 5000),
        refreshTokenHash: 'stored-hash',
      });
      mockSessionRepository.revokeAll.mockResolvedValue(1);

      await expect(
        service.verifyRefreshTokenOwnership(
          'raw-refresh-token',
          'session-id',
          'user-id',
          'tenant-id',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-id',
        'tenant-id',
      );
    });

    it('should revoke all sessions and throw when the token does not match', async () => {
      mockSessionRepository.findActiveSessionById.mockResolvedValue({
        id: 'session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 1000 * 60),
        revokedAt: null,
        createdAt: new Date(),
        refreshTokenHash: 'stored-hash',
      });
      mockPasswordService.verify.mockResolvedValue(false);
      mockSessionRepository.revokeAll.mockResolvedValue(1);

      await expect(
        service.verifyRefreshTokenOwnership(
          'raw-refresh-token',
          'session-id',
          'user-id',
          'tenant-id',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-id',
        'tenant-id',
      );
    });
  });

  describe('rotateSession()', () => {
    it('should rotate an active session and return the new session record', async () => {
      mockPasswordService.hash.mockResolvedValue('new-token-hash');
      mockSessionRepository.revokeSessionChain.mockResolvedValue({
        id: 'new-session-id',
        tenantId: 'tenant-id',
        userId: 'user-id',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        revokedAt: null,
        createdAt: new Date(),
      });

      const result = await service.rotateSession(
        'old-session-id',
        'user-id',
        'tenant-id',
        'new-session-id',
        'raw-refresh-token',
        'device-info',
        '127.0.0.1',
        'user-agent',
      );

      expect(result.id).toBe('new-session-id');
      expect(mockPasswordService.hash).toHaveBeenCalledWith('raw-refresh-token');
      expect(mockSessionRepository.revokeSessionChain).toHaveBeenCalledWith(
        'old-session-id',
        'user-id',
        'tenant-id',
        expect.objectContaining({
          id: 'new-session-id',
          tenantId: 'tenant-id',
          userId: 'user-id',
          refreshTokenHash: 'new-token-hash',
        }),
      );
    });

    it('should revoke all sessions and throw when rotation fails due to a concurrent refresh', async () => {
      mockPasswordService.hash.mockResolvedValue('new-token-hash');
      mockSessionRepository.revokeSessionChain.mockResolvedValue(null);
      mockSessionRepository.revokeAll.mockResolvedValue(2);

      await expect(
        service.rotateSession(
          'old-session-id',
          'user-id',
          'tenant-id',
          'new-session-id',
          'raw-refresh-token',
          'device-info',
          '127.0.0.1',
          'user-agent',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockSessionRepository.revokeAll).toHaveBeenCalledWith(
        'user-id',
        'tenant-id',
      );
    });
  });
});
