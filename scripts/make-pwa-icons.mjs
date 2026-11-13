import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const iconsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/icons");
const bg = { r: 7, g: 11, b: 24, alpha: 1 };

function pngInfo(file) {
  const b = fs.readFileSync(file);
  return `${path.basename(file)} ${b.readUInt32BE(16)}x${b.readUInt32BE(20)} ${b.length} bytes`;
}

const candidates = ["icon-512.png", "icon-192.png", "icon-maskable-512.png", "apple-touch-icon.png"];
const sourcePath = candidates.map((name) => path.join(iconsDir, name)).find((file) => fs.existsSync(file));
if (!sourcePath) {
  throw new Error("No source icon in public/icons");
}

const sourceBuf = fs.readFileSync(sourcePath);
console.log("source", pngInfo(sourcePath));

async function writeIcon(size, dest, pad) {
  const inner = Math.max(1, size - pad * 2);
  const glyph = await sharp(sourceBuf)
    .resize(inner, inner, { fit: "contain", background: bg })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: glyph, left: pad, top: pad }])
    .png({ compressionLevel: 9, palette: false })
    .toFile(dest);
}

fs.mkdirSync(iconsDir, { recursive: true });
await writeIcon(192, path.join(iconsDir, "icon-192.png"), 8);
await writeIcon(512, path.join(iconsDir, "icon-512.png"), 20);
await writeIcon(192, path.join(iconsDir, "icon-maskable-192.png"), 24);
await writeIcon(512, path.join(iconsDir, "icon-maskable-512.png"), 64);
await writeIcon(180, path.join(iconsDir, "apple-touch-icon.png"), 8);

for (const name of fs.readdirSync(iconsDir).filter((file) => file.endsWith(".png"))) {
  console.log("out", pngInfo(path.join(iconsDir, name)));
}
