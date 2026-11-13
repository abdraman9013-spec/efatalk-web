import webpush from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export function vapidReady() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function configureVapid() {
  if (!vapidReady()) return false;
  webpush.setVapidDetails(
    "mailto:hello@efatalk.fyi",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  return true;
}

export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
) {
  if (!configureVapid()) return false;
  await webpush.sendNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    JSON.stringify(payload),
  );
  return true;
}
