import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CurrentUser } from '@core/auth';
import type { AuthUser } from '@core/auth';
import { AuthService } from '../services/auth.service';
import type { LoginResponse, RefreshResponse, MeResponse } from '../services/auth.service';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';

/**
 * AuthController — HTTP layer for authentication endpoints.
 *
 * Responsibilities (per CODING_STANDARDS.md controller rules):
 *   - Route definition
 *   - DTO validation (delegated to ValidationPipe via class-validator)
 *   - Guard application
 *   - Delegate to AuthService
 *   - Format HTTP response
 *
 * Controller MUST NOT contain:
 *   - Business logic
 *   - Password hashing
 *   - Token signing
 *   - Session management
 *   - Direct DB access
 *
 * Guard placement:
 *   - login  : NO guard (public endpoint)
 *   - refresh: NO guard (uses refresh token, not access token)
 *   - logout : @UseGuards(JwtAuthGuard) — must be authenticated
 *   - logout-all: @UseGuards(JwtAuthGuard) — must be authenticated
 *   - me     : @UseGuards(JwtAuthGuard) — must be authenticated
 *
 * Device metadata:
 *   Extracted from request headers and passed to AuthService for session storage.
 *   AuthService and SessionService handle null/fallback gracefully.
 *
 * ResponseInterceptor wraps all return values in standard ApiSuccessResponse.
 * GlobalExceptionFilter handles UnauthorizedException → 401 response.
 *
 * TODO markers indicate future AuditModule integration points.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── POST /auth/login ──────────────────────────────────────

  /**
   * Login with email or NIP + password.
   * Returns token pair and user display info.
   * No authentication required — public endpoint.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<LoginResponse> {
    // TODO: Audit log — login attempt (before service call)
    const result = await this.authService.login({
      identifier: dto.identifier,
      password: dto.password,
      tenantId: this.extractTenantId(req),
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      deviceInfo: req.headers['x-device-info'] as string | null ?? null,
    });
    // TODO: Audit log — login success (after service call)
    return result;
  }

  // ─── POST /auth/refresh ────────────────────────────────────

  /**
   * Rotate refresh token — returns new token pair.
   * No JwtAuthGuard — refresh token IS the credential here.
   * TokenService verifies the refresh token's signature and expiry.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<RefreshResponse> {
    const result = await this.authService.refreshTokens({
      rawRefreshToken: dto.refreshToken,
      ipAddress: this.extractIpAddress(req),
      userAgent: req.headers['user-agent'] ?? null,
      deviceInfo: req.headers['x-device-info'] as string | null ?? null,
    });
    // TODO: Audit log — refresh token rotated
    return result;
  }

  // ─── POST /auth/logout ─────────────────────────────────────

  /**
   * Revoke the current session (single-device logout).
   * Requires valid access token — JwtAuthGuard validates session.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.sessionId, user.id);
    // TODO: Audit log — logout (single device)
    return { message: 'Logged out successfully' };
  }

  // ─── POST /auth/logout-all ─────────────────────────────────

  /**
   * Revoke ALL sessions for this user (logout all devices).
   * Requires valid access token — JwtAuthGuard validates session.
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: AuthUser,
  ): Promise<{ message: string; sessionsRevoked: number }> {
    const count = await this.authService.logoutAll(user.id, user.tenantId);
    // TODO: Audit log — logout all devices
    return {
      message: 'All sessions revoked successfully',
      sessionsRevoked: count,
    };
  }

  // ─── GET /auth/me ──────────────────────────────────────────

  /**
   * Get current user's profile and onboarding/security state.
   * Requires valid access token — JwtAuthGuard validates session.
   *
   * Response includes derived booleans (emailVerified, profileCompleted)
   * rather than raw timestamps — see MeResponse in AuthService.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMe(@CurrentUser() user: AuthUser): Promise<MeResponse> {
    return this.authService.getMe(user.id, user.tenantId);
  }

  // ─── Private Helpers ─────────────────────────────────────────

  /**
   * Extract tenant ID from request.
   *
   * In the current single-tenant phase, tenantId is expected from:
   *   1. Custom header x-tenant-id (development/testing convenience)
   *   2. Future: JWT sub-domain routing
   *   3. Future: TenantMiddleware resolves from subdomain
   *
   * Defaults to empty string if not present — AuthService will fail
   * at repository level (no user found for empty tenantId).
   *
   * TODO: Replace with TenantMiddleware in Phase 2 tenant work.
   */
  private extractTenantId(req: Request): string {
    return (req.headers['x-tenant-id'] as string | undefined) ?? '';
  }

  /**
   * Extract client IP address from request.
   * Handles common proxy headers (X-Forwarded-For, X-Real-IP).
   */
  private extractIpAddress(req: Request): string | null {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
      return (ip ?? '').trim() || null;
    }
    return req.socket.remoteAddress ?? null;
  }
}
