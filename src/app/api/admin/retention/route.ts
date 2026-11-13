import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  const db = admin();
  if (!db) return NextResponse.json({ ok: false }, { status: 503 });
  const { data, error } = await db.rpc("efaa_retention_pulse");
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
  return NextResponse.json(data);
}
