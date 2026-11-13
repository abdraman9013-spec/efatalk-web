import { NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { ocrAirtelReceipt } from "@/lib/airtel-ocr-engine";
import {
  FORMATION_OFFERS,
  formationLevelForPaidAmount,
  type FormationLevel,
} from "@/lib/formation-pricing";
import { parseAirtelReceiptText } from "@/lib/airtel-receipt-ocr";
import { formationDb, formationSeats } from "@/lib/formation-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 3 * 1024 * 1024;

function isLevel(v: string): v is FormationLevel {
  return v === "level0" || v === "level1";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const levelRaw = String(form.get("level") || "");
    const file = form.get("file");
    if (!isLevel(levelRaw)) {
      return NextResponse.json({ error: "bad-level" }, { status: 400 });
    }
    if (!(file instanceof Blob) || file.size < 800) {
      return NextResponse.json({ error: "missing-file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "too-large" }, { status: 413 });
    }

    const seats = await formationSeats();
    const seat = seats.find((s) => s.level === levelRaw);
    if (!seat?.open) {
      return NextResponse.json({ error: "full", seats }, { status: 409 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ocrText = String(form.get("ocrText") || "").trim().slice(0, 8000);

    let parsed =
      ocrText.length >= 16
        ? (() => {
            const p = parseAirtelReceiptText(ocrText, levelRaw);
            return { ...p, raw: ocrText };
          })()
        : await ocrAirtelReceipt(buffer, levelRaw);

    if (ocrText.length >= 16 && (!parsed.ok || parsed.amount == null)) {
      const altLevel: FormationLevel = levelRaw === "level0" ? "level1" : "level0";
      const alt = parseAirtelReceiptText(ocrText, altLevel);
      if (alt.ok && alt.amount != null) {
        return NextResponse.json(
          {
            ok: false,
            error: "level-mismatch",
            paidAmount: alt.amount,
            suggestLevel: altLevel,
            payeeName: alt.payeeName,
          },
          { status: 422 },
        );
      }
    }
    if (!parsed.ok || parsed.amount == null) {
      const altLevel: FormationLevel = levelRaw === "level0" ? "level1" : "level0";
      const alt = parseAirtelReceiptText(parsed.raw || "", altLevel);
      if (alt.ok && alt.amount != null) {
        return NextResponse.json(
          {
            ok: false,
            error: "level-mismatch",
            paidAmount: alt.amount,
            suggestLevel: altLevel,
            payeeName: alt.payeeName,
          },
          { status: 422 },
        );
      }
      const guess = formationLevelForPaidAmount(
        Number(alt.amount || parsed.amount) || 0,
      );
      return NextResponse.json(
        {
          ok: false,
          error: "ocr-reject",
          reasons: parsed.reasons,
          preview: parsed.normalized.slice(0, 280),
          suggestLevel: guess && guess !== levelRaw ? guess : undefined,
        },
        { status: 422 },
      );
    }

    const db = formationDb();
    const offer = FORMATION_OFFERS[levelRaw];
    const id = randomUUID();
    const path = `${levelRaw}/${id}.jpg`;

    const jpeg = buffer; // store original; OCR already ran on variants
    const { error: upErr } = await db.storage
      .from("efaa-formation-receipts")
      .upload(path, jpeg, { contentType: file.type || "image/jpeg", upsert: true });
    if (upErr) {
      return NextResponse.json({ error: "upload-failed", detail: upErr.message }, { status: 500 });
    }

    const token = createHash("sha256")
      .update(`${id}:${parsed.amount}:${levelRaw}:efaa-receipt`)
      .digest("hex")
      .slice(0, 40);

    const { error: insErr } = await db.from("efaa_formation_applications").insert({
      id,
      level: levelRaw,
      expected_first_amount: offer.firstAmount,
      amount_second: offer.secondAmount,
      amount_total: offer.total,
      amount_list: offer.listTotal,
      status: "pending",
      screenshot_url: path,
      ocr_raw: parsed.raw.slice(0, 4000),
      ocr_amount: parsed.amount,
      ocr_phone: parsed.phone || "",
      ocr_ok: true,
      admin_note: `receipt-token:${token}`,
    });

    if (insErr) {
      return NextResponse.json({ error: "db-failed", detail: insErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      applicationId: id,
      token,
      amount: parsed.amount,
      phone: parsed.phone,
      level: levelRaw,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "verify-failed" },
      { status: 500 },
    );
  }
}
