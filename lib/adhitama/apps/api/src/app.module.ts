import { Module } from '@nestjs/common';
import { ConfigModule } from '@config/index';
import { DatabaseModule } from '@core/database';
import { RedisModule } from '@core/redis';
import { CoreAuthModule } from '@core/auth';
import { HealthModule } from '@core/health';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { RbacModule } from '@modules/rbac/rbac.module';

/**
 * AppModule — Root application module.
 *
 * Import order is SIGNIFICANT:
 *   1. ConfigModule    — MUST be first (validates env vars before anything connects)
 *   2. DatabaseModule  — depends on DATABASE_URL being validated
 *   3. RedisModule     — depends on REDIS_* vars being validated
 *   4. CoreAuthModule  — depends on DATABASE_URL (PrismaService) + auth config
 *   5. HealthModule    — depends on PrismaService + RedisService (global)
 *   6. AuthModule      — business auth (login/logout/me)
 *   7. UsersModule     — user management
 *
 * Phase 1 (complete):
 *   ✅ ConfigModule    — env validation + typed config (Task 2.2.3)
 *   ✅ DatabaseModule  — Prisma connection (Task 2.2.2.b)
 *   ✅ RedisModule     — Redis connection, non-fatal (Task 2.2.4)
 *   ✅ HealthModule    — GET /api/v1/health (Task 2.2.5)
 *
 * Phase 2 (complete):
 *   ✅ CoreAuthModule  — JWT infrastructure (JwtStrategy, JwtAuthGuard, TokenService)
 *   ✅ AuthModule      — Auth endpoints (login, logout, refresh, me)
 *
 * Phase 3 (active):
 *   ✅ UsersModule     — User management (Phase 3.4)
 *   ⬜ RbacModule      — Role + Permission management (Phase 3.5+)
 *
 * Rules:
 *   - ConfigModule, DatabaseModule, RedisModule, CoreAuthModule are @Global
 *   - DO NOT re-import global modules in any feature module
 *   - Each new import requires approval per MASTER_IMPLEMENTATION_PLAN.md
 */
@Module({
  imports: [
    // ─── 1. Config (always first) ────────────────────────────
    ConfigModule,

    // ─── 2. Core Infrastructure ──────────────────────────────
    DatabaseModule,
    RedisModule,

    // ─── 3. Core Auth Infrastructure ─────────────────────────
    CoreAuthModule,

    // ─── 4. Core Services ────────────────────────────────────
    HealthModule,

    // ─── 5. Business Modules ─────────────────────────────────
    AuthModule,
    UsersModule,
    RbacModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
