import { parseAirtelReceiptText, extractSmsCorpsFromOcr } from "@/lib/airtel-receipt-ocr";
import type { FormationLevel } from "@/lib/formation-pricing";
import { compressReceiptImageForUpload } from "@/lib/formation-receipt-image";

async function fileToJpegBuffer(file: File): Promise<Blob> {
  const f = await compressReceiptImageForUpload(file);
  if (f.type === "image/jpeg" && f.size > 0) return f;
  const bitmap = await createImageBitmap(f);
  const canvas = document.createElement("canvas");
  const w = Math.min(720, bitmap.width);
  const scale = w / bitmap.width;
  canvas.width = w;
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return f;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return (
    (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85))) || f
  );
}

/** Runs on the student device (no server timeout). */
export async function clientOcrFormationReceipt(
  file: File,
  level: FormationLevel,
  onProgress?: (pct: number) => void,
): Promise<{ text: string; parsed: ReturnType<typeof parseAirtelReceiptText> }> {
  const { createWorker, PSM } = await import("tesseract.js");
  const blob = await fileToJpegBuffer(file);
  const worker = await createWorker("fra", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const {
      data: { text },
    } = await worker.recognize(blob);
    const cleaned = extractSmsCorpsFromOcr(text || "");
    const body = cleaned.length > 12 ? cleaned : text || "";
    const parsed = parseAirtelReceiptText(body, level);
    return { text: body, parsed };
  } finally {
    await worker.terminate();
  }
}
