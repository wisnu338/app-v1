import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@core/auth';
import type { AuthUser } from '@core/auth';
import { PermissionGuard } from '@common/guards';
import { Permission } from '@common/decorators';
import { RbacService } from '../services/rbac.service';
import type { RoleRecord, RoleWithPermissions, PermissionRecord } from '../repositories/rbac.repository.types';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignPermissionDto } from '../dto/assign-permission.dto';
import { RoleQueryDto } from '../dto/role-query.dto';

/**
 * RbacController — HTTP layer for Role and Permission management.
 *
 * Controller rules (CODING_STANDARDS.md):
 *   - Route definition and guard application only
 *   - Extracts tenantId and requestedById from @CurrentUser() — never from body
 *   - Delegates all logic to RbacService
 *   - Returns service result — ResponseInterceptor wraps the envelope
 *   - NO business logic, NO Prisma, NO data mapping
 *
 * Security:
 *   - All endpoints use @UseGuards(JwtAuthGuard, PermissionGuard) at class level
 *   - Every endpoint has an explicit @Permission() — no wildcard, no bypass
 *   - tenantId always from JWT — cross-tenant access impossible from this layer
 */
@Controller()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ─── GET /roles ────────────────────────────────────────────

  @Get('roles')
  @Permission('roles.read')
  @HttpCode(HttpStatus.OK)
  async listRoles(
    @Query() _query: RoleQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleWithPermissions[]> {
    // _query reserved for future pagination — currently passed through unused
    return this.rbacService.listRoles(user.tenantId);
  }

  // ─── GET /roles/:id ────────────────────────────────────────

  @Get('roles/:id')
  @Permission('roles.read')
  @HttpCode(HttpStatus.OK)
  async getRole(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleWithPermissions> {
    return this.rbacService.getRole(id, user.tenantId);
  }

  // ─── POST /roles ───────────────────────────────────────────

  @Post('roles')
  @Permission('roles.create')
  @HttpCode(HttpStatus.CREATED)
  async createRole(
    @Body() dto: CreateRoleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleRecord> {
    return this.rbacService.createRole({
      tenantId: user.tenantId,
      requestedById: user.id,
      name: dto.name,
      description: dto.description,
    });
  }

  // ─── PATCH /roles/:id ─────────────────────────────────────

  @Patch('roles/:id')
  @Permission('roles.update')
  @HttpCode(HttpStatus.OK)
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleRecord> {
    return this.rbacService.updateRole(id, user.tenantId, {
      name: dto.name,
      description: dto.description,
      requestedById: user.id,
    });
  }

  // ─── DELETE /roles/:id ────────────────────────────────────

  /**
   * 204 No Content on success.
   * 403 if system role. 422 if role has assigned users.
   */
  @Delete('roles/:id')
  @Permission('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRole(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.rbacService.deleteRole(id, user.tenantId);
  }

  // ─── GET /permissions ─────────────────────────────────────

  /**
   * Lists all system-level permissions — global, no tenant filter.
   * Used by admin UI to populate permission assignment selects.
   */
  @Get('permissions')
  @Permission('permissions.read')
  @HttpCode(HttpStatus.OK)
  async listPermissions(): Promise<PermissionRecord[]> {
    return this.rbacService.listPermissions();
  }

  // ─── POST /roles/:id/permissions ──────────────────────────

  /**
   * Assign one or more permissions to a role.
   * Idempotent — already-assigned permissions are silently skipped.
   * Returns updated role with full permission list.
   */
  @Post('roles/:id/permissions')
  @Permission('permissions.assign')
  @HttpCode(HttpStatus.OK)
  async assignPermissions(
    @Param('id') roleId: string,
    @Body() dto: AssignPermissionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleWithPermissions> {
    return this.rbacService.assignPermissions({
      roleId,
      tenantId: user.tenantId,
      permissionIds: dto.permissionIds,
    });
  }

  // ─── DELETE /roles/:id/permissions/:permissionId ──────────

  /**
   * Remove a single permission from a role.
   * Idempotent — does not throw if permission was not assigned.
   * Returns updated role with remaining permissions.
   */
  @Delete('roles/:id/permissions/:permissionId')
  @Permission('permissions.remove')
  @HttpCode(HttpStatus.OK)
  async removePermission(
    @Param('id') roleId: string,
    @Param('permissionId') permissionId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RoleWithPermissions> {
    return this.rbacService.removePermission(roleId, user.tenantId, permissionId);
  }
}
