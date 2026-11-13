"use client";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function subscribePush(opts: {
  userId: string;
  locale: string;
  level?: string;
  requestPermission?: boolean;
}) {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key || !pushSupported()) return { ok: false as const, reason: "unsupported" };
  if (Notification.permission === "denied") return { ok: false as const, reason: "denied" };

  if (Notification.permission === "default") {
    if (!opts.requestPermission) return { ok: false as const, reason: "need-gesture" };
    const next = await Notification.requestPermission();
    if (next !== "granted") return { ok: false as const, reason: "denied" };
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: opts.userId,
      locale: opts.locale,
      level: opts.level || "beginner",
      subscription: sub.toJSON(),
    }),
  });
  if (!res.ok) return { ok: false as const, reason: "save" };
  return { ok: true as const };
}

export async function pingPushTick() {
  try {
    await fetch("/api/push/tick", { method: "POST" });
  } catch {
    /* offline */
  }
}

export async function pingSomeoneWaiting(opts: {
  level: string;
  waiterId: string;
  waiterName: string;
  count: number;
}) {
  try {
    await fetch("/api/push/waiting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    });
  } catch {
    /* offline */
  }
}
