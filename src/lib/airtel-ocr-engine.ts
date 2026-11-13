import "server-only";
import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";
import {
  extractSmsCorpsFromOcr,
  parseAirtelReceiptText,
  receiptLooksLikeAirtelSms,
  type ReceiptParseResult,
} from "@/lib/airtel-receipt-ocr";
import type { FormationLevel } from "@/lib/formation-pricing";

const OCR_BUDGET_MS = 22000;
const WORKER_WARM_MS = 45000;
const MAX_EDGE = 560;

let workerReady: Promise<Worker> | null = null;

function getFraWorker() {
  if (!workerReady) {
    workerReady = (async () => {
      const worker = await createWorker("fra", 1, {
        logger: () => undefined,
      });
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        });
      } catch {
        /* optional */
      }
      return worker;
    })();
  }
  return workerReady;
}

/** Call from enrollment UI so the first verify is not killed by cold-start. */
export async function warmAirtelOcrEngine() {
  await withTimeout(getFraWorker(), WORKER_WARM_MS, "ocr-warm-timeout");
}

async function preprocessFast(buffer: Buffer) {
  const base = sharp(buffer).rotate();
  const meta = await base.metadata();
  const width = Math.min(MAX_EDGE, meta.width || MAX_EDGE);
  const jpeg = { quality: 78 } as const;
  const w = meta.width || width;
  const h = meta.height || width;

  const lightShot = await base
    .clone()
    .resize({ width, withoutEnlargement: true })
    .greyscale()
    .normalize()
    .linear(1.25, -12)
    .sharpen()
    .jpeg(jpeg)
    .toBuffer();

  let lcdShot = base.clone().resize({ width, withoutEnlargement: true });
  if (w > 240 && h > 240) {
    lcdShot = lcdShot.extract({
      left: Math.max(0, Math.floor(w * 0.1)),
      top: Math.max(0, Math.floor(h * 0.05)),
      width: Math.max(80, Math.floor(w * 0.8)),
      height: Math.max(80, Math.floor(h * 0.9)),
    });
  }
  const lcd = await lcdShot
    .greyscale()
    .normalize()
    .linear(2.2, -48)
    .sharpen({ sigma: 1.2 })
    .jpeg({ quality: 85 })
    .toBuffer();

  const darkSms = await base
    .clone()
    .resize({ width, withoutEnlargement: true })
    .greyscale()
    .normalize()
    .negate()
    .sharpen()
    .jpeg(jpeg)
    .toBuffer();

  return [lightShot, lcd, darkSms] as const;
}

function scoreParsed(parsed: ReceiptParseResult) {
  return (
    (parsed.ok ? 8 : 0) +
    (parsed.phone ? 3 : 0) +
    (parsed.amount != null ? 3 : 0) +
    (parsed.reasons.includes("missing-sent-phrase") ? 0 : 1)
  );
}

async function recognizeOne(
  worker: Worker,
  image: Buffer,
  level: FormationLevel,
): Promise<ReceiptParseResult & { raw: string }> {
  const { data } = await worker.recognize(image);
  const raw = data.text || "";
  const cleaned = extractSmsCorpsFromOcr(raw);
  const parsed = parseAirtelReceiptText(cleaned || raw, level);
  return { ...parsed, raw: cleaned || raw };
}

function withTimeout<T>(promise: Promise<T>, ms: number, code = "ocr-timeout"): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(code)), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export async function ocrAirtelReceipt(
  image: Buffer,
  level: FormationLevel,
): Promise<ReceiptParseResult & { raw: string }> {
  const prepP = preprocessFast(image);
  let worker: Worker;
  let variants: readonly Buffer[];
  try {
    [worker, variants] = await Promise.all([getFraWorker(), prepP]);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ocr-warm-fail";
    return emptyFail([code]);
  }
  try {
    return await withTimeout(runRecognize(worker, variants, level), OCR_BUDGET_MS);
  } catch (e) {
    const code = e instanceof Error ? e.message : "ocr-timeout";
    return emptyFail([code]);
  }
}

function emptyFail(reasons: string[]): ReceiptParseResult & { raw: string } {
  return {
    ok: false,
    amount: null,
    phone: null,
    payeeName: null,
    reasons,
    normalized: "",
    raw: "",
  };
}

async function runRecognize(
  worker: Worker,
  variants: readonly Buffer[],
  level: FormationLevel,
): Promise<ReceiptParseResult & { raw: string }> {
  let best: ReceiptParseResult & { raw: string } = {
    ok: false,
    amount: null,
    phone: null,
    payeeName: null,
    reasons: ["ocr-empty"],
    normalized: "",
    raw: "",
  };

  for (const variant of variants) {
    const result = await recognizeOne(worker, variant, level);
    if (result.ok) {
      best = result;
      break;
    }
    if (scoreParsed(result) > scoreParsed(best) || result.raw.length > best.raw.length) {
      best = result;
    }
  }

  const plausible =
    best.ok ||
    (best.amount != null &&
      !best.reasons.includes("amount-mismatch") &&
      (best.payeeName || !best.reasons.includes("missing-sent-phrase")));

  if (
    best.raw.trim().length < 12 ||
    (!plausible && !receiptLooksLikeAirtelSms(best.normalized, best.raw))
  ) {
    return {
      ok: false,
      amount: null,
      phone: null,
      payeeName: best.payeeName ?? null,
      reasons: best.reasons.length ? best.reasons : ["not-airtel-receipt"],
      normalized: best.normalized,
      raw: best.raw,
    };
  }

  if (plausible && !best.ok) {
    return { ...best, ok: true, reasons: [] };
  }

  return best;
}
