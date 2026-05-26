/**
 * Password migration utility
 *
 * Migrates all existing stored passwords (SHA1 hashes sent from the frontend)
 * to bcrypt-wrapped hashes, enabling server-side password verification.
 *
 * Safe to run against a live database: each row is updated atomically and
 * already-migrated rows (detected by the $2b$ bcrypt prefix) are skipped.
 *
 * Usage:
 * - node --env-file .env dist/database/migrate-passwords.js
 *
 * Run ONCE after deploying the bcrypt changes to the API.
 */

import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import { RowDataPacket } from "mysql2";

import { logger } from "#logger/logger.service.js";

import { connection } from "./db.js";

const SALT_ROUNDS = 12;
const BCRYPT_PREFIX = "$2b$";

interface IUserPasswordRow extends RowDataPacket {
  id: number;
  password: string;
}

export async function migratePasswords(): Promise<void> {
  logger.info("Starting password migration...");

  const [rows] = await connection.query<IUserPasswordRow[]>("SELECT id, password FROM users");

  let migrated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.password.startsWith(BCRYPT_PREFIX)) {
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(row.password, SALT_ROUNDS);
    await connection.query("UPDATE users SET password = ?, is_migrated = 1 WHERE id = ?", [hashed, row.id]);
    migrated++;
  }

  logger.info({ migrated, skipped, total: rows.length }, "Password migration completed");
}

// Run if executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  migratePasswords()
    .then(() => {
      logger.info("Migration finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "Migration failed with error");
      process.exit(1);
    });
}
