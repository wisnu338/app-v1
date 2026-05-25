/**
 * System Role Definitions — Adhitama ERP Seeder
 *
 * Defines the system roles and their permission assignments.
 * Uses explicit mapping — not dynamic or implicit.
 *
 * Role hierarchy (for documentation only — not enforced in code):
 *   OWNER      > ADMIN > STAFF
 *
 * Rules:
 *   - OWNER and SUPER_ADMIN are protected by isSystemRole()
 *   - Permission mapping is additive in seeder (not destructive)
 *   - Adding permissions here will grant them on next seed run
 *   - Removing permissions here does NOT revoke them (non-destructive seeder)
 */

export interface RoleSeed {
  name: string;
  description: string;
}

/** The three system roles seeded for every tenant */
export const SYSTEM_ROLES_SEED: RoleSeed[] = [
  {
    name: 'OWNER',
    description:
      'Tenant owner — full access to all features. Cannot be deleted or renamed.',
  },
  {
    name: 'ADMIN',
    description:
      'Administrator — manages users, roles, and operational features.',
  },
  {
    name: 'STAFF',
    description: 'Staff member — read-only access to basic operational data.',
  },
];

/**
 * ROLE_PERMISSION_MAP — explicit permission assignment per role.
 *
 * Each role lists the permission KEYS it should have.
 * The seeder will assign these during bootstrap.
 *
 * Design decision: explicit over dynamic.
 * This makes it immediately clear what each role can do
 * without tracing code. Changes here require intentional edit.
 */
export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  /**
   * OWNER — full access to all system permissions.
   * Listed explicitly (not "all permissions") so new permissions
   * require conscious decision to grant to OWNER.
   */
  OWNER: [
    // Auth
    'auth.me',
    'auth.logout',
    // Users
    'users.read',
    'users.create',
    'users.update',
    'users.update-status',
    'users.delete',
    // Roles
    'roles.read',
    'roles.create',
    'roles.update',
    'roles.delete',
    // Permissions
    'permissions.read',
    'permissions.assign',
    'permissions.remove',
  ],

  /**
   * ADMIN — manages users and roles, cannot assign permissions.
   * Cannot delete users or roles (destructive ops reserved for OWNER).
   */
  ADMIN: [
    // Auth
    'auth.me',
    'auth.logout',
    // Users
    'users.read',
    'users.create',
    'users.update',
    'users.update-status',
    // Roles
    'roles.read',
    // Permissions (read-only)
    'permissions.read',
  ],

  /**
   * STAFF — read-only basic access.
   * Can authenticate and view their own profile only.
   */
  STAFF: [
    'auth.me',
    'auth.logout',
    'users.read',
    'roles.read',
    'permissions.read',
  ],
};
