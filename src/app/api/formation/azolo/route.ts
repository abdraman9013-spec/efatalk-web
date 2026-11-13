import { NextResponse } from "next/server";
import {
  assertAzoloCode,
  createAccessCode,
  formationDb,
  formationSeats,
  offerFor,
} from "@/lib/formation-server";
import type { FormationLevel } from "@/lib/formation-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  if (!assertAzoloCode(code)) return unauthorized();

  const db = formationDb();
  const { data, error } = await db
    .from("efaa_formation_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seats = await formationSeats(db);
  const rows = await Promise.all(
    (data || []).map(async (row) => {
      const r = row as Record<string, unknown>;
      let shot = String(r.screenshot_url || "");
      if (shot && !shot.startsWith("http")) {
        const signed = await db.storage
          .from("efaa-formation-receipts")
          .createSignedUrl(shot, 60 * 30);
        shot = signed.data?.signedUrl || shot;
      }
      return { ...r, screenshot_url: shot };
    }),
  );

  return NextResponse.json({ rows, seats });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    code?: string;
    action?: "approve" | "deny" | "remind";
    applicationId?: string;
    note?: string;
  };

  if (!assertAzoloCode(String(body.code || ""))) return unauthorized();

  const action = body.action;
  const applicationId = String(body.applicationId || "").trim();
  if (!action || !applicationId) {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
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

  if (action === "deny") {
    await db
      .from("efaa_formation_applications")
      .update({
        status: "denied",
        denied_at: new Date().toISOString(),
        admin_note: String(body.note || row.admin_note || "denied"),
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
    return NextResponse.json({ ok: true, status: "denied" });
  }

  if (action === "remind") {
    const wa = String(row.whatsapp || "").replace(/\D/g, "");
    const email = String(row.email || "");
    const level = row.level as FormationLevel;
    const offer = offerFor(level);
    const msg = encodeURIComponent(
      `Bonjour ${row.full_name || ""}, rappel EFA Talk (${offer.label}) : le 2e paiement de ${offer.secondAmount} F est dû. Airtel Money 69592822 — Mr Azolo.`,
    );
    await db
      .from("efaa_formation_applications")
      .update({
        reminder_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    return NextResponse.json({
      ok: true,
      whatsappUrl: wa ? `https://wa.me/${wa}?text=${msg}` : null,
      mailto: email
        ? `mailto:${email}?subject=${encodeURIComponent("Rappel paiement EFA Talk")}&body=${msg}`
        : null,
    });
  }

  if (action === "approve") {
    const seats = await formationSeats(db);
    const seat = seats.find((s) => s.level === row.level);
    if (!seat?.open && row.status !== "approved") {
      return NextResponse.json({ error: "full" }, { status: 409 });
    }

    let accessCode = String(row.access_code || "");
    if (!accessCode) {
      accessCode = await createAccessCode(db);
    }

    const paid = Number(row.ocr_amount) || offerFor(row.level as FormationLevel).firstAmount;
    const total = Number(row.amount_total) || offerFor(row.level as FormationLevel).total;
    const due = Math.max(0, total - paid);

    await db
      .from("efaa_formation_applications")
      .update({
        status: "approved",
        access_code: accessCode,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    const { error: caisseErr } = await db.rpc("efaa_formation_caisse_move", {
      p_kind: "income",
      p_purpose: "registration",
      p_amount: paid,
      p_actor: "azolo",
      p_note: `${row.full_name || "student"} · ${row.level}`,
      p_application_id: applicationId,
    });
    if (caisseErr) {
      return NextResponse.json({ error: caisseErr.message }, { status: 400 });
    }

    // Seed official student shell if we have identity
    if (row.full_name && row.email && row.whatsapp) {
      const parts = String(row.full_name).trim().split(/\s+/);
      const firstName = parts[0] || "Student";
      const lastName = parts.slice(1).join(" ") || "EFA";
      const levelMap =
        row.level === "level1" ? "intermediate" : "beginner";
      const { data: existing } = await db
        .from("efaa_active_students")
        .select("id")
        .eq("access_code", accessCode)
        .maybeSingle();
      if (!existing) {
        await db.from("efaa_active_students").insert({
          access_code: accessCode,
          email: String(row.email).toLowerCase(),
          first_name: firstName,
          last_name: lastName,
          status: "student",
          nationality: String(row.country || "TD"),
          city: "Online",
          whatsapp: String(row.whatsapp),
          level: levelMap,
          amount_paid: paid,
          amount_due: due,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      status: "approved",
      accessCode,
      paid,
      due,
      total,
    });
  }

  return NextResponse.json({ error: "unknown-action" }, { status: 400 });
}
