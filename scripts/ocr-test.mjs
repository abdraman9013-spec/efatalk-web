import fs from "fs";
import path from "path";
import { createWorker, PSM } from "tesseract.js";
import sharp from "sharp";

const assets = process.argv.slice(2);
if (!assets.length) {
  console.error("Usage: node scripts/ocr-test.mjs <image paths>");
  process.exit(1);
}

async function preprocess(buffer) {
  const base = sharp(buffer).rotate();
  const meta = await base.metadata();
  const width = Math.min(720, meta.width || 720);
  const [dark, light, lcd] = await Promise.all([
    base.clone().resize({ width, withoutEnlargement: true }).greyscale().normalize().negate().sharpen().jpeg().toBuffer(),
    base.clone().resize({ width, withoutEnlargement: true }).greyscale().normalize().linear(1.25, -12).sharpen().jpeg().toBuffer(),
    base.clone().resize({ width, withoutEnlargement: true }).greyscale().normalize().linear(2.2, -48).sharpen().jpeg().toBuffer(),
  ]);
  return [dark, light, lcd];
}

const worker = await createWorker("fra", 1, { logger: () => {} });
await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });

for (const file of assets) {
  const buf = fs.readFileSync(file);
  console.log("\n=== ", path.basename(file), "size", buf.length);
  for (const [i, v] of (await preprocess(buf)).entries()) {
    const { data } = await worker.recognize(v);
    console.log("--- variant", i, "---");
    console.log(data.text);
  }
}

await worker.terminate();
