# COMPLIANCE STATUS

Overall Status: ⚠ PARTIALLY COMPLIANT

## Rule
All queries must include `tenantId` and exclude soft-deleted rows.

## Current Implementation
Most repository methods enforce `tenantId` and `deletedAt: null`. However, some service-level queries bypass those abstractions, including `AuthService` lastLoginAt update and `UserService.assertNotLastOwner()`.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Direct service queries without consistent tenant scoping can leak or mutate data across tenants.

## Required Fix
Ensure all DB queries use repository APIs or explicit `tenantId` scopes. Remove direct Prisma access from services.

---

## Rule
Controllers must never accept tenantId from body, query, or params.

## Current Implementation
`AuthController.login()` extracts tenantId from the `x-tenant-id` header.

## Compliance Status
❌ NON-COMPLIANT

## Risk Level
S1

## Why This Is Dangerous
Header-based tenant resolution is not a secure enterprise pattern and violates the blueprint requirement.

## Required Fix
Centralize tenant resolution in middleware and source tenantId from authenticated context or routing metadata only.

---

## Rule
Tenant isolation must be enforced in auth and RBAC flows.

## Current Implementation
`JwtStrategy` validates the user with `tenantId` but session validation does not include tenantId. `PermissionGuard` relies on roleId tenant binding rather than explicit tenant checks.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
Implicit tenant assumptions can fail if token or role data is compromised.

## Required Fix
Add explicit tenant-scoped queries for session and RBAC authorization, and do not rely solely on roleId as tenant context.

---

## Rule
Role assignment and permissions must not cross tenants.

## Current Implementation
Role and permission operations are tenant-scoped in repository/service methods, but system role validation and permission assign/remove use direct Prisma transactions.

## Compliance Status
⚠ PARTIALLY COMPLIANT

## Risk Level
S2

## Why This Is Dangerous
If tenant scoping is missed in a direct transaction, a permission could be applied to the wrong role or tenant.

## Required Fix
Use tenant-aware repository APIs for permission assignments and avoid direct transaction queries in service layer.
