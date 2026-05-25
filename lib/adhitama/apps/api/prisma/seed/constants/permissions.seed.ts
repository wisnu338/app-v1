/**
 * System Permission Definitions — Adhitama ERP Seeder
 *
 * Static list of all system-level permissions.
 * This is the SINGLE SOURCE OF TRUTH for what permissions exist.
 *
 * Format: { key, module, description }
 * key convention: {module}.{action} (lowercase, dot-separated)
 *
 * Rules:
 *   - Add new permissions here when a new module is built
 *   - Never remove permissions that are in production (breaks RBAC)
 *   - Permission keys are immutable once seeded
 *   - Tenants cannot create custom permissions
 */

export interface PermissionSeed {
  key: string;
  module: string;
  description: string;
}

export const PERMISSIONS_SEED: PermissionSeed[] = [
  // ─── Auth ───────────────────────────────────────────────────
  {
    key: 'auth.me',
    module: 'auth',
    description: 'View own profile and security state',
  },
  {
    key: 'auth.logout',
    module: 'auth',
    description: 'Logout from current session',
  },

  // ─── Users ──────────────────────────────────────────────────
  {
    key: 'users.read',
    module: 'users',
    description: 'View user list and user details',
  },
  {
    key: 'users.create',
    module: 'users',
    description: 'Create new users',
  },
  {
    key: 'users.update',
    module: 'users',
    description: 'Update user profile and information',
  },
  {
    key: 'users.update-status',
    module: 'users',
    description: 'Activate, deactivate, or suspend users',
  },
  {
    key: 'users.delete',
    module: 'users',
    description: 'Soft-delete users',
  },

  // ─── Roles ──────────────────────────────────────────────────
  {
    key: 'roles.read',
    module: 'roles',
    description: 'View roles and role details',
  },
  {
    key: 'roles.create',
    module: 'roles',
    description: 'Create new roles',
  },
  {
    key: 'roles.update',
    module: 'roles',
    description: 'Update role name and description',
  },
  {
    key: 'roles.delete',
    module: 'roles',
    description: 'Delete roles (only if no users assigned)',
  },

  // ─── Permissions ────────────────────────────────────────────
  {
    key: 'permissions.read',
    module: 'permissions',
    description: 'View available system permissions',
  },
  {
    key: 'permissions.assign',
    module: 'permissions',
    description: 'Assign permissions to roles',
  },
  {
    key: 'permissions.remove',
    module: 'permissions',
    description: 'Remove permissions from roles',
  },
];

/** Total permission count — useful for seeder logging */
export const PERMISSION_COUNT = PERMISSIONS_SEED.length;
