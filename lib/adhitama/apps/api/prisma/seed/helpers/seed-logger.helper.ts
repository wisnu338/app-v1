/**
 * SeedLogger — centralized logging for seed scripts.
 *
 * All seed output goes through this helper — no raw console.log() in seed files.
 * Provides consistent [SEED] prefix and step formatting.
 */
export const SeedLogger = {
  /** Start of a seeder step */
  step: (label: string): void => {
    console.log(`\n[SEED] ▶ ${label}`);
  },

  /** Successful operation result */
  success: (message: string): void => {
    console.log(`[SEED] ✅ ${message}`);
  },

  /** Item was skipped (already exists) */
  skip: (message: string): void => {
    console.log(`[SEED] ⏭  ${message}`);
  },

  /** Informational message */
  info: (message: string): void => {
    console.log(`[SEED]    ${message}`);
  },

  /** Warning — non-fatal but notable */
  warn: (message: string): void => {
    console.warn(`[SEED] ⚠️  ${message}`);
  },

  /** Fatal error — will cause seed to fail */
  error: (message: string, error?: unknown): void => {
    console.error(`[SEED] ❌ ${message}`);
    if (error instanceof Error) {
      console.error(`[SEED]    ${error.message}`);
    }
  },

  /** Section divider */
  divider: (): void => {
    console.log('[SEED] ' + '─'.repeat(50));
  },

  /** Summary line at the end */
  summary: (label: string, count: number): void => {
    console.log(`[SEED] ${label}: ${count}`);
  },
};
