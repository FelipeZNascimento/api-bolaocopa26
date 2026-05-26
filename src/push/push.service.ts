import type { PushSubscription } from "web-push";
import webpush from "web-push";
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
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
