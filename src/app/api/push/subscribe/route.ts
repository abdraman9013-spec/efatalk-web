import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    locale?: string;
    level?: string;
    subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  };
  const endpoint = body.subscription?.endpoint || "";
  const p256dh = body.subscription?.keys?.p256dh || "";
  const auth = body.subscription?.keys?.auth || "";
  const userId = (body.userId || "").trim();
  if (!endpoint || !p256dh || !auth || !userId) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const locale = body.locale === "ar" || body.locale === "en" ? body.locale : "fr";
  const level =
    body.level === "intermediate" || body.level === "advanced" || body.level === "beginner"
      ? body.level
      : "beginner";
  const { error } = await getSupabase().from("efaa_push_subs").upsert({
    endpoint,
    user_id: userId,
    p256dh,
    auth,
    locale,
    level,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: true });
}
