import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function award(userId: string, speechSeconds: number) {
  const seconds = Math.min(1800, Math.max(0, Math.floor(speechSeconds)));
  const { data, error } = await serviceDb().rpc("efaa_award_match_points", {
    p_user_id: userId,
    p_speech_seconds: seconds,
  });
  if (error) throw error;
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      speechSeconds?: number;
    };
    const userId = String(body.userId || "").trim();
    const speechSeconds = Number(body.speechSeconds) || 0;
    if (!userId || userId === "efaa-admin") {
      return NextResponse.json({ error: "user-required" }, { status: 400 });
    }
    const data = await award(userId, speechSeconds);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "award-failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
