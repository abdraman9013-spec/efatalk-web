import fs from "fs";
import sharp from "sharp";
import { createWorker, PSM } from "tesseract.js";
import {
  extractSmsCorpsFromOcr,
  parseAirtelReceiptText,
  receiptLooksLikeAirtelSms,
} from "../src/lib/airtel-receipt-ocr.ts";
import { FORMATION_OFFERS, formationLevelForPaidAmount } from "../src/lib/formation-pricing.ts";

const MAX_EDGE = 720;
const OCR_BUDGET_MS = 14000;

async function preprocessFast(buffer) {
  const base = sharp(buffer).rotate();
  const meta = await base.metadata();
  const width = Math.min(MAX_EDGE, meta.width || MAX_EDGE);
  const jpeg = { quality: 80 };
  const w = meta.width || width;
  const h = meta.height || width;
  let lcd = base.clone().resize({ width, withoutEnlargement: true });
  if (w > 240 && h > 240) {
    lcd = lcd.extract({
      left: Math.max(0, Math.floor(w * 0.1)),
      top: Math.max(0, Math.floor(h * 0.05)),
      width: Math.max(80, Math.floor(w * 0.8)),
      height: Math.max(80, Math.floor(h * 0.9)),
    });
  }
  const [darkSms, lightShot, lcdShot] = await Promise.all([
    base.clone().resize({ width, withoutEnlargement: true }).greyscale().normalize().negate().sharpen().jpeg(jpeg).toBuffer(),
    base.clone().resize({ width, withoutEnlargement: true }).greyscale().normalize().linear(1.25, -12).sharpen().jpeg(jpeg).toBuffer(),
    lcd.greyscale().normalize().linear(2.2, -48).sharpen({ sigma: 1.2 }).jpeg({ quality: 88 }).toBuffer(),
  ]);
  return [darkSms, lightShot, lcdShot];
}

function scoreParsed(parsed) {
  return (
    (parsed.ok ? 8 : 0) +
    (parsed.phone ? 3 : 0) +
    (parsed.amount != null ? 3 : 0) +
    (parsed.reasons.includes("missing-sent-phrase") ? 0 : 1)
  );
}

async function runOcrLikeProd(buffer, level) {
  const worker = await createWorker("fra", 1, { logger: () => {} });
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  const variants = await preprocessFast(buffer);
  let best = { ok: false, amount: null, raw: "", normalized: "", reasons: ["empty"] };

  for (const variant of variants) {
    const { data } = await worker.recognize(variant);
    const raw = data.text || "";
    const cleaned = extractSmsCorpsFromOcr(raw);
    const parsed = parseAirtelReceiptText(cleaned || raw, level);
    const row = { ...parsed, raw: cleaned || raw };
    if (row.ok) {
      best = row;
      break;
    }
    if (scoreParsed(row) > scoreParsed(best) || row.raw.length > best.raw.length) best = row;
  }
  await worker.terminate();

  const plausible =
    best.ok ||
    (best.amount != null &&
      !best.reasons.includes("amount-mismatch") &&
      (best.payeeName || !best.reasons.includes("missing-sent-phrase")));

  if (
    best.raw.trim().length < 12 ||
    (!plausible && !receiptLooksLikeAirtelSms(best.normalized, best.raw))
  ) {
    return { accept: false, best, reason: "gate" };
  }
  if (plausible && !best.ok) {
    return { accept: true, best: { ...best, ok: true, reasons: [] }, reason: "plausible" };
  }
  if (best.ok) return { accept: true, best, reason: "ok" };

  const altLevel = level === "level0" ? "level1" : "level0";
  const alt = parseAirtelReceiptText(best.raw, altLevel);
  if (alt.ok) {
    return { accept: false, best, levelMismatch: alt, reason: "level-mismatch" };
  }
  return { accept: false, best, reason: "reject" };
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: node scripts/verify-receipt-local.mjs <images...>");
  process.exit(1);
}

for (const file of files) {
  const buf = fs.readFileSync(file);
  console.log("\n========", file.split(/[\\/]/).pop(), "========");
  for (const level of ["level1", "level0"]) {
    const r = await runOcrLikeProd(buf, level);
    console.log(level, r.reason, {
      accept: r.accept,
      amount: r.best.amount,
      phone: r.best.phone,
      payee: r.best.payeeName,
      reasons: r.best.reasons,
      rawSnippet: r.best.raw.slice(0, 120).replace(/\n/g, " | "),
    });
    if (r.levelMismatch) {
      console.log("  mismatch ->", r.levelMismatch.amount, formationLevelForPaidAmount(r.levelMismatch.amount));
    }
  }
}
