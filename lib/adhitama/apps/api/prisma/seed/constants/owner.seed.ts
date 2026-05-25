/**
 * Owner Bootstrap Configuration — Adhitama ERP Seeder
 *
 * Reads owner account details from environment variables.
 * Fails fast with a clear error message if any required variable is missing.
 *
 * Required env vars:
 *   SEED_TENANT_NAME   — Display name of the default tenant
 *   SEED_TENANT_SLUG   — URL-safe slug for the tenant (e.g. "adhitama")
 *   SEED_OWNER_NAME    — Full name of the owner user
 *   SEED_OWNER_EMAIL   — Email address of the owner user
 *   SEED_OWNER_PASSWORD — Initial password (will be hashed, mustChangePassword=false for seed)
 *
 * Security:
 *   - Password is read from env, hashed with Argon2id before DB insert
 *   - Raw password is never stored, never logged
 *   - mustChangePassword is set to false for seeded owner (they set it up themselves)
 *   - On re-seed: owner account is NOT overwritten if already exists
 */

export interface OwnerSeedConfig {
  tenantName: string;
  tenantSlug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
}

/**
 * loadOwnerSeedConfig() — load and validate owner seed config from env.
 * Fails fast if any required variable is missing or empty.
 */
export function loadOwnerSeedConfig(): OwnerSeedConfig {
  const required: Array<[keyof OwnerSeedConfig, string]> = [
    ['tenantName',     'SEED_TENANT_NAME'],
    ['tenantSlug',     'SEED_TENANT_SLUG'],
    ['ownerName',      'SEED_OWNER_NAME'],
    ['ownerEmail',     'SEED_OWNER_EMAIL'],
    ['ownerPassword',  'SEED_OWNER_PASSWORD'],
  ];

  const config: Partial<OwnerSeedConfig> = {};
  const missing: string[] = [];

  for (const [field, envKey] of required) {
    const value = process.env[envKey]?.trim();
    if (!value) {
      missing.push(envKey);
    } else {
      config[field] = value;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[SEED] Missing required environment variables:\n` +
        missing.map((k) => `  - ${k}`).join('\n') + '\n' +
        `\nCopy .env.seed.example to .env.seed and fill in values.`,
    );
  }

  return config as OwnerSeedConfig;
}
