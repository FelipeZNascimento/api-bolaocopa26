/**
 * Hello Stranger mailer script
 *
 * Fetches all users who have NOT joined edition 3 (Copa 2026) and sends
 * them the hello_stranger invitation email.
 *
 * Usage:
 * - node --env-file .env dist/mailer/hello-stranger-send.js
 */

import type { RowDataPacket } from "mysql2";
import type { TransportOptions } from "nodemailer";
import { fileURLToPath } from "url";
import { createTransport } from "nodemailer";
import { connection } from "#database/db.js";
import { logger } from "#logger/logger.service.js";
import { ENV } from "#utils/envParser.js";
import { getHelloStrangerFinalTemplate } from "./hello-stranger-final.template.js";
// import { getHelloStrangerTemplate } from "./hello-stranger.template.js";

const EDITION_ID = 3;

interface IUserRow extends RowDataPacket {
  email: string;
  id: number;
  nickname: string;
}

async function sendHelloStrangerEmails(): Promise<void> {
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

  // const [selectedUsers] = await connection.query<IUserRow[]>(
  //   `SELECT users.id, users.email, users.nickname
  //      FROM users
  //      LEFT JOIN users_edition ON users.id = users_edition.id_user AND users_edition.id_edition = ?
  //      WHERE users_edition.id_user IS NULL`,
  //   [EDITION_ID],
  // );

  const selectedUsers = [
    {
      email: "birodrigues1988@icloud.com",
      nickname: "Bene",
    },
    {
      email: "thibotana@gmail.com",
      nickname: "Botana",
    },
    {
      email: "alan1eu@yahoo.com.br",
      nickname: "Alan",
    },
    {
      email: "reider.arnaud@gmail.com",
      nickname: "Reider",
    },
    {
      email: "carolina.borques@gmail.com",
      nickname: "CarolBorques",
    },
    {
      email: "luiz.guerra@autbank.com.br",
      nickname: "Luiz Guerra",
    },
    {
      email: "sara_r.santos@hotmail.com",
      nickname: "Sarinha",
    },
    {
      email: "b_of_the_boing@hotmail.co.uk",
      nickname: "England's No. 1",
    },
    {
      email: "carlosfbremer@gmail.com",
      nickname: "Bremer",
    },
    {
      email: "NUNESEDUARDO@LIVE.COM",
      nickname: "EDUARDO",
    },
    {
      email: "carlosjuliano@gmail.com",
      nickname: "Carlos Juliano",
    },
    {
      email: "kjimoto@hotmail.com",
      nickname: "Mick Jagger",
    },
    {
      email: "godoi.lucas@hotmail.com",
      nickname: "Lucas Godoi",
    },
    {
      email: "danielnogueirafisio@gmail.com",
      nickname: "Danieltoko",
    },
    {
      email: "delmaroliveirasantos@gmail.com",
      nickname: "Del",
    },
    {
      email: "carlosatila90@gmail.com",
      nickname: "Pagode90",
    },
    {
      email: "ingridverissimo102@hotmail.com",
      nickname: "ingridverissimo",
    },
    {
      email: "pepe.sp@terra.com.br",
      nickname: "Pepê Lima",
    },
    {
      email: "nociano@gmail.com",
      nickname: "Luciano Guaxupé",
    },
    {
      email: "rlmarfurt@hotmail.com",
      nickname: "Marf",
    },
    {
      email: "acauacarvalho6@gmail.com",
      nickname: "Acauã",
    },
  ];

  logger.info(
    { total: selectedUsers.length },
    `Found ${selectedUsers.length} users not enrolled in edition ${EDITION_ID}`,
  );

  let sent = 0;
  let failed = 0;

  // await transporter.sendMail({
  //   from: fromAddress,
  //   html: getHelloStrangerFinalTemplate("Felipera"),
  //   subject: "[BolaoCopa2026] Última chance!",
  //   to: "sharpion.k@gmail.com",
  // });

  // await transporter.sendMail({
  //   from: fromAddress,
  //   html: getHelloStrangerFinalTemplate("Mottoca"),
  //   subject: "[BolaoCopa2026] Última chance!",
  //   to: "ngm.motta@gmail.com",
  // });

  for (const user of selectedUsers) {
    try {
      await transporter.sendMail({
        from: fromAddress,
        html: getHelloStrangerFinalTemplate(user.nickname),
        subject: "[BolaoCopa2026] Última chance!",
        to: user.email,
      });

      // logger.info({ email: user.email, userId: user.id }, "Email sent");
      setTimeout(function () {
        logger.info({ email: user.email }, "Email sent");
      }, 500);

      sent++;
    } catch (error) {
      failed++;
      // logger.error({ email: user.email, err: error, userId: user.id }, "Failed to send email");
      logger.error({ email: user.email, err: error }, "Failed to send email");
    }
  }

  logger.info({ failed, sent, total: selectedUsers.length }, "Hello stranger email campaign finished");
}

// Run if executed directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  sendHelloStrangerEmails()
    .then(() => {
      logger.info("Script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      logger.error({ err: error }, "Script failed with error");
      process.exit(1);
    });
}
