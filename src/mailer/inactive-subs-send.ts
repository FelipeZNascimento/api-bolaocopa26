/**
 * Hello Stranger mailer script
 *
 * Fetches all users who have joined edition 3 (Copa 2026) but haven't paid yet
 * and sends them a reminder email.
 *
 * Usage:
 * - node --env-file .env dist/mailer/inactive-subs-send.js
 */

import type { RowDataPacket } from "mysql2";
import type { TransportOptions } from "nodemailer";
import { fileURLToPath } from "url";
import { createTransport } from "nodemailer";
import { connection } from "#database/db.js";
import { logger } from "#logger/logger.service.js";
import { ENV } from "#utils/envParser.js";
import { getInactiveSubsFinalTemplate } from "./inactive-subs-final.template.js";
// import { getInactiveSubsTemplate } from "./inactive-subs.template.js";

const EDITION_ID = 3;

interface IUserRow extends RowDataPacket {
  email: string;
  id: number;
  nickname: string;
}

async function sendInactiveSubsEmail(): Promise<void> {
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
       WHERE users_edition.is_active = 0`,
    [EDITION_ID],
  );

  logger.info(
    { total: selectedUsers.length },
    `Found ${selectedUsers.length} users not enrolled in edition ${EDITION_ID}`,
  );

  let sent = 0;
  let failed = 0;

  await transporter.sendMail({
    from: fromAddress,
    html: getInactiveSubsFinalTemplate("Felipera"),
    subject: "[BolaoCopa2026] Última Chance | Last Chance",
    to: "sharpion.k@gmail.com",
  });

  await transporter.sendMail({
    from: fromAddress,
    html: getInactiveSubsFinalTemplate("Mottoca"),
    subject: "[BolaoCopa2026] Última Chance | Last Chance",
    to: "ngm.motta@gmail.com",
  });

  for (const user of selectedUsers) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        html: getInactiveSubsFinalTemplate(user.nickname),
        subject: "[BolaoCopa2026] Última Chance | Last Chance",
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

  logger.info({ failed, sent, total: selectedUsers.length }, "Inactive subs reminder campaign finished");
}

// Run if executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  sendInactiveSubsEmail()
    .then(() => {
      logger.info("Script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "Script failed with error");
      process.exit(1);
    });
}
