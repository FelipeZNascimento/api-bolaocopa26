/**
 * Email normalisation utility
 *
 * Updates every row in the users table so that the stored email address is
 * lower-cased. Rows that are already lower-case are skipped.
 *
 * Usage:
 * - node --env-file .env dist/database/emails-to-lower-case.js
 *
 * Run ONCE after deploying the lower-case email enforcement to the API.
 */

import { fileURLToPath } from "url";
import { RowDataPacket } from "mysql2";

import { logger } from "#logger/logger.service.js";

import { connection } from "./db.js";

interface IUserEmailRow extends RowDataPacket {
  email: string;
  id: number;
}

export async function emailsToLowerCase(): Promise<void> {
  logger.info("Starting email normalisation...");

  const [rows] = await connection.query<IUserEmailRow[]>("SELECT id, email FROM users");

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const lower = row.email.toLowerCase();

    if (lower === row.email) {
      skipped++;
      continue;
    }

    await connection.query("UPDATE users SET email = ? WHERE id = ?", [lower, row.id]);
    updated++;
  }

  logger.info({ skipped, total: rows.length, updated }, "Email normalisation completed");
}

// Run if executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  emailsToLowerCase()
    .then(() => {
      logger.info("Normalisation finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "Normalisation failed with error");
      process.exit(1);
    });
}
