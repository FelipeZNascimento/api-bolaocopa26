import type { PushSubscription, WebPushError } from "web-push";
import webpush from "web-push";
import { connection } from "#database/db.js";
import { logger } from "#logger/logger.service.js";

export function initPushNotifications(): void {
  const { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    logger.warn("VAPID keys not configured — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info("Push notifications initialized");
}

export async function sendPushNotification(subscription: PushSubscription, payload: object): Promise<void> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    if ((err as WebPushError).statusCode === 410) {
      logger.warn({ endpoint: subscription.endpoint }, "Subscription gone (410) — removing from DB");
      connection
        .query("DELETE FROM push_subscriptions WHERE endpoint = ?", [subscription.endpoint])
        .catch((dbErr) => logger.error({ err: dbErr }, "Failed to delete stale push subscription"));
      return;
    }
    throw err;
  }
}
