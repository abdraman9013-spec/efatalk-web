import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formationDb } from "@/lib/formation-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const applicationId = new URL(request.url).searchParams.get("id") || "";
  if (!applicationId) {
    return NextResponse.json({ error: "missing-id" }, { status: 400 });
  }

  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "auth-required" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: "config" }, { status: 500 });
  }

  const userDb = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await userDb.auth.getUser();
  const user = userData.user;
  if (!user?.email) {
    return NextResponse.json({ error: "auth-required" }, { status: 401 });
  }

  const db = formationDb();
  const { data: row } = await db
    .from("efaa_formation_applications")
    .select("id, status, access_code, email, full_name, level, ocr_amount, amount_total, amount_second")
    .eq("id", applicationId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "not-found" }, { status: 404 });
  }

  if (row.email && row.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    status: row.status,
    accessCode: row.access_code || null,
    level: row.level,
    paid: row.ocr_amount,
    total: row.amount_total,
    reste: Math.max(0, Number(row.amount_total) - Number(row.ocr_amount || 0)),
  });
}
