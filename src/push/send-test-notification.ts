/**
 * Test push notification script
 *
 * Sends a test push notification to a specific user or all stored subscriptions.
 *
 * Usage:
 * - node --env-file .env.development dist/push/send-test-notification.js
 * - node --env-file .env.development dist/push/send-test-notification.js --user=<userId>
 */

import type { PushSubscription } from "web-push";
import { fileURLToPath } from "url";
import { connection } from "#database/db.js";
import { logger } from "#logger/logger.service.js";
import { initPushNotifications, ISubscriptionRow, sendPushNotification } from "#push/push.service.js";

async function sendTestNotification(): Promise<void> {
  initPushNotifications();

  const userArg = process.argv.find((arg) => arg.startsWith("--user="));
  const userId = userArg ? parseInt(userArg.split("=")[1], 10) : null;

  const [rows] = userId
    ? await connection.query<ISubscriptionRow[]>(
        `SELECT ps.user_id, ps.endpoint, ps.p256dh, ps.auth, u.locale
         FROM push_subscriptions ps
         INNER JOIN users u ON ps.user_id = u.id
         WHERE ps.user_id = ?`,
        [userId],
      )
    : await connection.query<ISubscriptionRow[]>(
        `SELECT ps.user_id, ps.endpoint, ps.p256dh, ps.auth, u.locale
         FROM push_subscriptions ps
         INNER JOIN users u ON ps.user_id = u.id`,
      );

  if (rows.length === 0) {
    logger.warn({ userId }, "No subscriptions found");
    return;
  }

  logger.info({ total: rows.length }, "Sending test notification(s)");

  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      keys: { auth: row.auth, p256dh: row.p256dh },
    };

    const isEn = row.locale?.toLowerCase().startsWith("en") ?? false;
    const payload = isEn
      ? { body: "If you're seeing this, notifications are working!", title: "Bolão da Copa 2026 🏆" }
      : { body: "Se você está vendo isso, as notificações estão funcionando!", title: "Bolão da Copa 2026 🏆" };

    try {
      await sendPushNotification(subscription, payload);
      sent++;
      logger.info({ userId: row.user_id }, "Notification sent");
    } catch (error) {
      failed++;
      logger.error({ err: error, userId: row.user_id }, "Failed to send notification");
    }
  }

  logger.info({ failed, sent, total: rows.length }, "Done");
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  sendTestNotification()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ err: error }, "Script failed");
      process.exit(1);
    });
}
