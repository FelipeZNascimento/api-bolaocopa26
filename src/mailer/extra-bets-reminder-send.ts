/**
 * Hello Stranger mailer script
 *
 * Fetches all users who have NOT joined edition 3 (Copa 2026) and sends
 * them the hello_stranger invitation email.
 *
 * Usage:
 * - node --env-file .env dist/mailer/extra-bets-reminder-send.js
 */

import type { RowDataPacket } from "mysql2";
import type { TransportOptions } from "nodemailer";
import { fileURLToPath } from "url";
import { createTransport } from "nodemailer";
import { connection } from "#database/db.js";
import { logger } from "#logger/logger.service.js";
import { ENV } from "#utils/envParser.js";
import { getExtraBetsReminder } from "./extra-bets-reminder.template.js";

const EDITION_ID = 3;

interface IUserRow extends RowDataPacket {
  email: string;
  id: number;
  nickname: string;
}

async function sendExtraBetsReminderEmails(): Promise<void> {
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
    `SELECT users.id, users.email, users.nickname,
        (SELECT COUNT(*) FROM extra_bets WHERE id_edition = users_edition.id_edition
        AND id_user = users.id) AS extrasCount
        FROM users
        JOIN users_edition ON users.id = users_edition.id_user
        WHERE users_edition.id_edition = 3 AND users_edition.is_active = 1
        HAVING extrasCount < 5
        ORDER BY users.nickname ASC;`,
    [EDITION_ID],
  );

  logger.info({ total: selectedUsers.length }, `Found ${selectedUsers.length} users are still pending extras`);

  let sent = 0;
  let failed = 0;

  // await transporter.sendMail({
  //   from: fromAddress,
  //   html: getExtraBetsReminder("Felipera"),
  //   subject: "[BolaoCopa2026] Extras!",
  //   to: "sharpion.k@gmail.com",
  // });

  // await transporter.sendMail({
  //   from: fromAddress,
  //   html: getExtraBetsReminder("Mottoca"),
  //   subject: "[BolaoCopa2026] Extras!",
  //   to: "ngm.motta@gmail.com",
  // });

  for (const user of selectedUsers) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        html: getExtraBetsReminder(user.nickname),
        subject: "[BolaoCopa2026] Extras!",
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

  logger.info({ failed, sent, total: selectedUsers.length }, "Extras reminder email campaign finished");
}

// Run if executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  sendExtraBetsReminderEmails()
    .then(() => {
      logger.info("Script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "Script failed with error");
      process.exit(1);
    });
}
