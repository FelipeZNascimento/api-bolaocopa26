/**
 * Manual session cleanup utility
 *
 * This script cleans up expired sessions from the database.
 * Run manually or via cron job to avoid timeout issues during runtime.
 *
 * Usage:
 * - Manually: node --env-file .env dist/database/cleanup-sessions.js
 * - Cron: 0 2 * * * cd /path/to/app && node --env-file .env dist/database/cleanup-sessions.js
 */

import { fileURLToPath } from "url";

import { logger } from "#logger/logger.service.js";

import { connection } from "./db.js";

export async function cleanupExpiredSessions(): Promise<void> {
  try {
    logger.info("Starting session cleanup...");

    const [result] = await connection.query("DELETE FROM sessions WHERE expires < ?", [Math.floor(Date.now() / 1000)]);

    const affectedRows = (result as { affectedRows: number }).affectedRows;

    logger.info({ deletedSessions: affectedRows }, "Session cleanup completed");

    return;
  } catch (error) {
    logger.error({ err: error }, "Session cleanup failed");
    throw error;
  }
}

// Run if executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  cleanupExpiredSessions()
    .then(() => {
      logger.info("Cleanup finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "Cleanup failed with error");
      process.exit(1);
    });
}
