import type { RowDataPacket } from "mysql2";
import type { PushSubscription, WebPushError } from "web-push";
import webpush from "web-push";
import { connection } from "#database/db.js";
import { logger } from "#logger/logger.service.js";

const EDITION_ID = 3;
const TOTAL_EXTRA_CATEGORIES = 5;

interface ISubscriptionRow extends RowDataPacket {
  auth: string;
  endpoint: string;
  locale: null | string;
  p256dh: string;
  user_id: number;
}

export function initPushNotifications(): void {
  const { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    logger.warn("VAPID keys not configured — push notifications disabled");
    return;
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  logger.info("Push notifications initialized");
}

export async function notifyUsersWithIncompleteBets(): Promise<void> {
  const [rows] = await connection.query<ISubscriptionRow[]>(
    `SELECT ps.user_id, ps.endpoint, ps.p256dh, ps.auth, u.locale
     FROM push_subscriptions ps
     INNER JOIN users u ON ps.user_id = u.id
     INNER JOIN users_edition ue ON ps.user_id = ue.id_user AND ue.id_edition = ?
     LEFT JOIN (
       SELECT id_user, COUNT(DISTINCT id_extra_type) AS bet_count
       FROM extra_bets
       WHERE id_edition = ?
       GROUP BY id_user
     ) eb ON ps.user_id = eb.id_user
     WHERE COALESCE(eb.bet_count, 0) < ?`,
    [EDITION_ID, EDITION_ID, TOTAL_EXTRA_CATEGORIES],
  );

  if (rows.length === 0) {
    logger.info("All subscribed users have completed their extra bets");
    return;
  }

  logger.info({ total: rows.length }, "Notifying users with incomplete extra bets");

  for (const row of rows) {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      keys: { auth: row.auth, p256dh: row.p256dh },
    };

    const isEn = row.locale?.toLowerCase().startsWith("en") ?? false;
    const payload = isEn
      ? { body: "You haven't completed all your extra bets yet. Don't miss out!", title: "Bolão da Copa 2026 🏆" }
      : {
          body: "Você ainda não completou todas as suas apostas extras. Não fique de fora!",
          title: "Bolão da Copa 2026 🏆",
        };

    try {
      await sendPushNotification(subscription, payload);
      logger.info({ userId: row.user_id }, "Incomplete bets notification sent");
    } catch (err) {
      logger.error({ err, userId: row.user_id }, "Failed to send incomplete bets notification");
    }
  }
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
