/**
 * Test push notification script
 *
 * Sends a test push notification to a specific user or all stored subscriptions.
 *
 * Usage:
 * - node --env-file .env.development dist/push/send-extas-notification.js
 * - node --env-file .env.development dist/push/send-extras-notification.js --user=<userId>
 */

import { fileURLToPath } from "url";
import { logger } from "#logger/logger.service.js";
import { initPushNotifications, notifyUsersWithIncompleteExtras } from "#push/push.service.js";

async function sendExtrasNotification(): Promise<void> {
  initPushNotifications();

  const userArg = process.argv.find((arg) => arg.startsWith("--user="));
  const userId = userArg ? parseInt(userArg.split("=")[1], 10) : null;

  await notifyUsersWithIncompleteExtras(userId);
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  sendExtrasNotification()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error({ err: error }, "Script failed");
      process.exit(1);
    });
}
