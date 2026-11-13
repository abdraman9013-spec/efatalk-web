import { NextResponse } from "next/server";
import { assertAzoloCode, formationDb } from "@/lib/formation-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_CODE = process.env.EFAA_ADMIN_CODE || "0680";
const PURPOSES = new Set(["certificate", "logo", "copy", "autre", "registration"]);

function authed(code: string) {
  return assertAzoloCode(code) || String(code).trim() === ADMIN_CODE;
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  if (!authed(code)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = formationDb();
  const [{ data: box }, { data: rows }] = await Promise.all([
    db.from("efaa_formation_caisse").select("*").eq("id", 1).maybeSingle(),
    db
      .from("efaa_formation_caisse_entries")
      .select("*")
      .order("entry_at", { ascending: false })
      .limit(80),
  ]);

  return NextResponse.json({
    balance: Number(box?.balance_fcfa) || 0,
    entries: rows || [],
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    code?: string;
    purpose?: string;
    purposeNote?: string;
    amount?: number;
  };

  if (!authed(String(body.code || ""))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const purpose = String(body.purpose || "").toLowerCase();
  if (!PURPOSES.has(purpose)) {
    return NextResponse.json({ error: "bad-purpose" }, { status: 400 });
  }
  const amount = Math.round(Number(body.amount) || 0);
  if (amount <= 0) {
    return NextResponse.json({ error: "bad-amount" }, { status: 400 });
  }

  const actor = assertAzoloCode(String(body.code || "")) ? "azolo" : "admin";
  const note =
    purpose === "autre"
      ? String(body.purposeNote || "").slice(0, 200)
      : String(body.purposeNote || "").slice(0, 120);

  const db = formationDb();
  const { data, error } = await db.rpc("efaa_formation_caisse_move", {
    p_kind: "expense",
    p_purpose: purpose,
    p_amount: amount,
    p_actor: actor,
    p_note: note || null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, entry: data });
}
