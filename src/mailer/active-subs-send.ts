/**
 * Hello Stranger mailer script
 *
 * Fetches all users who have joined edition 3 (Copa 2026) but haven't paid yet
 * and sends them a reminder email.
 *
 * Usage:
 * - node --env-file .env dist/mailer/active-subs-send.js
 */

import type { RowDataPacket } from "mysql2";
import type { TransportOptions } from "nodemailer";
import { fileURLToPath } from "url";
import { createTransport } from "nodemailer";
import { connection } from "#database/db.js";
import { logger } from "#logger/logger.service.js";
import { ENV } from "#utils/envParser.js";
import { getAvailableExtrasTemplate } from "./extra-bets-available.template.js";

const EDITION_ID = 3;

interface IUserRow extends RowDataPacket {
  email: string;
  id: number;
  nickname: string;
}

async function sendActiveSubsEmail(): Promise<void> {
  if (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASSWORD) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASSWORD in your .env file.");
  }

  const transporter = createTransport({
    auth: {
      pass: ENV.SMTP_PASSWORD,
      user: ENV.SMTP_USER,
    },
    host: ENV.SMTP_HOST,
    port: ENV.SMTP_PORT ?? 465,
    secure: true,
    tls: {
      rejectUnauthorized: true,
    },
  } as TransportOptions);

  const fromAddress = process.env.SMTP_FROM ?? "bolao@omegafox.me";

  const [selectedUsers] = await connection.query<IUserRow[]>(
    `SELECT users.id, users.email, users.nickname
       FROM users
       LEFT JOIN users_edition ON users.id = users_edition.id_user AND users_edition.id_edition = ?
       WHERE users_edition.is_active = 1`,
    [EDITION_ID],
  );

  logger.info({ total: selectedUsers.length }, `Found ${selectedUsers.length} users active in edition ${EDITION_ID}`);

  let sent = 0;
  let failed = 0;

  // await transporter.sendMail({
  //   from: fromAddress,
  //   html: getAvailableExtrasTemplate("Felipera"),
  //   subject: "[BolaoCopa2026] Extra! Extra!",
  //   to: "sharpion.k@gmail.com",
  // });

  // await transporter.sendMail({
  //   from: fromAddress,
  //   html: getAvailableExtrasTemplate("Mottoca"),
  //   subject: "[BolaoCopa2026] Extra! Extra!",
  //   to: "ngm.motta@gmail.com",
  // });

  for (const user of selectedUsers) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        html: getAvailableExtrasTemplate(user.nickname),
        subject: "[BolaoCopa2026] Extra! Extra!",
        to: user.email,
      });

      setTimeout(function () {
        logger.info({ email: user.email, userId: user.id }, "Email sent");
      }, 500);

      sent++;
    } catch (error) {
      failed++;
      logger.error({ email: user.email, err: error, userId: user.id }, "Failed to send email");
    }
  }

  logger.info({ failed, sent, total: selectedUsers.length }, "Active subs Extra Bets campaign finished");
}

// Run if executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  sendActiveSubsEmail()
    .then(() => {
      logger.info("Script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "Script failed with error");
      process.exit(1);
    });
}
