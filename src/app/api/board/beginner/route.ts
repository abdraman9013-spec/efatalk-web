import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Public beginner class board for the landing showcase (top 15). */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ top: [] }, { status: 200 });
  }
  const db = createClient(url, key);
  const { data, error } = await db.rpc("efaa_leaderboard_for_level", {
    p_user_id: "landing-guest",
    p_level: "beginner",
  });
  if (error) {
    return NextResponse.json({ top: [], error: error.message }, { status: 200 });
  }
  const payload = data as { top?: unknown[] };
  const top = Array.isArray(payload?.top) ? payload.top.slice(0, 15) : [];
  return NextResponse.json(
    { top },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
  );
}
