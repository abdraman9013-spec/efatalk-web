import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { translations } from "@/i18n/translations";
import { firstNameOf, waitingBody } from "@/lib/flame-copy";
import { sendPush, vapidReady } from "@/lib/web-push";

type SubRow = {
  endpoint: string;
  user_id: string;
  p256dh: string;
  auth: string;
  locale: string;
  level?: string;
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function dict(locale: string) {
  if (locale === "ar") return translations.ar;
  if (locale === "en") return translations.en;
  return translations.fr;
}

function levelLabel(locale: string, level: string) {
  const t = dict(locale);
  if (level === "intermediate") return t.levels.intermediate;
  if (level === "advanced") return t.levels.advanced;
  return t.levels.beginner;
}

function windowBucket() {
  return String(Math.floor(Date.now() / (10 * 60 * 1000)));
}

export async function POST(request: Request) {
  if (!vapidReady()) return NextResponse.json({ ok: false, reason: "vapid" }, { status: 503 });
  const db = admin();
  if (!db) return NextResponse.json({ ok: false, reason: "db" }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as {
    level?: string;
    waiterId?: string;
    waiterName?: string;
    count?: number;
  };

  const level =
    body.level === "intermediate" || body.level === "advanced" || body.level === "beginner"
      ? body.level
      : "beginner";
  const waiterId = (body.waiterId || "").trim();
  const waiterName = (body.waiterName || "").trim();
  const count = Math.max(1, Number(body.count) || 1);
  if (!waiterId) return NextResponse.json({ ok: false }, { status: 400 });

  const kind = `wait:${level}:${windowBucket()}`;
  const { data: claimed } = await db.rpc("efaa_claim_push", { p_kind: kind, p_user_id: waiterId });
  if (!claimed) return NextResponse.json({ ok: true, sent: 0, dup: true });

  const { data: subs } = await db.from("efaa_push_subs").select("endpoint,user_id,p256dh,auth,locale,level");
  let sent = 0;
  const url = `/lobby/${level}`;

  for (const sub of (subs || []) as SubRow[]) {
    if (sub.user_id === waiterId) continue;
    if (sub.level && sub.level !== level) continue;
    const t = dict(sub.locale);
    const text = waitingBody(t, {
      name: firstNameOf(waiterName) || t.lobby.you,
      count,
      levelLabel: levelLabel(sub.locale, level),
    });
    try {
      await sendPush(sub, { title: "EFA Talk — MATCH", body: text, url });
      sent += 1;
    } catch {
      await db.from("efaa_push_subs").delete().eq("endpoint", sub.endpoint);
    }
  }

  return NextResponse.json({ ok: true, sent, kind });
}
