import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { formationDb } from "@/lib/formation-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function userFromBearer(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const db = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data } = await db.auth.getUser();
  return data.user;
}

export async function POST(request: Request) {
  try {
    const user = await userFromBearer(request.headers.get("authorization"));
    if (!user?.email) {
      return NextResponse.json({ error: "auth-required" }, { status: 401 });
    }

    const body = (await request.json()) as {
      applicationId?: string;
      token?: string;
      fullName?: string;
      country?: string;
      whatsapp?: string;
    };

    const applicationId = String(body.applicationId || "").trim();
    const token = String(body.token || "").trim();
    const fullName = String(body.fullName || "").trim();
    const country = String(body.country || "").trim();
    const whatsapp = String(body.whatsapp || "").replace(/\s+/g, "");

    if (!applicationId || !token || !fullName || !country || whatsapp.length < 8) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 });
    }

    const db = formationDb();
    const { data: row, error } = await db
      .from("efaa_formation_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "not-found" }, { status: 404 });
    }

    const expected = createHash("sha256")
      .update(`${applicationId}:${row.ocr_amount}:${row.level}:efaa-receipt`)
      .digest("hex")
      .slice(0, 40);

    if (token !== expected || !row.ocr_ok) {
      return NextResponse.json({ error: "bad-token" }, { status: 403 });
    }

    if (row.full_name) {
      return NextResponse.json({
        ok: true,
        status: row.status,
        applicationId,
        email: row.email || user.email,
      });
    }

    const { error: upErr } = await db
      .from("efaa_formation_applications")
      .update({
        full_name: fullName,
        country,
        whatsapp,
        email: user.email.toLowerCase(),
        auth_user_id: user.id,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      status: "pending",
      applicationId,
      email: user.email.toLowerCase(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "apply-failed" },
      { status: 500 },
    );
  }
}
