# Push Notifications Documentation

## Overview

The push notification system uses the [Web Push Protocol](https://web.dev/push-notifications-overview/) with VAPID authentication to send notifications directly to users' browsers, even when the app is not open. Notifications are localised based on the user's stored `locale`.

## Architecture

### Components

1. **`push.service.ts`** (`src/push/push.service.ts`)
   - Initialises VAPID credentials on app startup
   - `sendPushNotification()` — low-level helper; handles stale subscription cleanup (HTTP 410)
   - `notifyUsersWithIncompleteBets()` — sends reminders to edition-3 users who haven't placed all 5 extra bets

2. **`send-test-notification.ts`** (`src/push/send-test-notification.ts`)
   - Standalone runnable script for manual testing
   - Sends a localised test notification to one user or all subscribers

3. **`POST /user/push/subscribe`** (`src/user/user.routes.ts`)
   - Authenticated endpoint called by the client after the user grants notification permission
   - Stores the subscription (`endpoint`, `p256dh`, `auth`) in `push_subscriptions`

### Database Table

```sql
push_subscriptions (
  user_id   INT         -- FK to users.id
  endpoint  VARCHAR     -- browser push endpoint URL (unique per device/browser)
  p256dh    VARCHAR     -- client public key
  auth      VARCHAR     -- client auth secret
)
```

Subscriptions are upserted on `endpoint` — the same user can have multiple entries (one per device/browser).

### Notification Payload

The service worker on the client receives a JSON payload:

```json
{
  "title": "Bolão da Copa 2026 🏆",
  "body": "..."
}
```

The `body` is chosen based on `users.locale`: English if the locale starts with `"en"`, Portuguese otherwise.

---

## Environment Variables

| Variable            | Description                                  |
| ------------------- | -------------------------------------------- |
| `VAPID_SUBJECT`     | Contact URI, e.g. `mailto:admin@example.com` |
| `VAPID_PUBLIC_KEY`  | Base64url-encoded VAPID public key           |
| `VAPID_PRIVATE_KEY` | Base64url-encoded VAPID private key          |

Generate a fresh key pair with:

```sh
npx web-push generate-vapid-keys
```

If any of the three variables are missing the service starts in degraded mode — a warning is logged and no notifications are sent.

---

## Startup Initialisation

`initPushNotifications()` is called automatically in `app.ts` when the server starts. No manual step is required after setting the env variables.

---

## Triggering Notifications Manually

### 1. Test notification (one user)

Useful for verifying that a specific user's subscription is alive.

```sh
npm run build
node --env-file .env.development dist/push/send-test-notification.js --user=<userId>
```

### 2. Test notification (all subscribers)

```sh
node --env-file .env.development dist/push/send-test-notification.js
```

### 3. Incomplete extra-bets reminder

Sends a notification to every subscribed user in edition 3 who has fewer than 5 distinct extra bet types registered.

```sh
# From a Node REPL or a one-off script:
import { initPushNotifications, notifyUsersWithIncompleteBets } from "./dist/push/push.service.js";
initPushNotifications();
await notifyUsersWithIncompleteBets();
```

Or call `notifyUsersWithIncompleteBets()` programmatically from `MatchSyncService` or an admin route.

---

## Stale Subscription Handling

When the browser revokes notification permission the push endpoint returns **HTTP 410 Gone**. `sendPushNotification()` detects this, logs a warning, and asynchronously deletes the row from `push_subscriptions` so it is never retried.

---

## Client-Side Integration (summary)

1. Register a service worker that listens for the `push` event and calls `event.data.json()`.
2. Call `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: VAPID_PUBLIC_KEY })`.
3. POST the resulting `PushSubscription` object to `POST /user/push/subscribe`.
