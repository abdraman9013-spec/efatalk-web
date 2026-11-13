import fs from "fs";
import { ocrAirtelReceipt } from "../src/lib/airtel-ocr-engine.ts";

const path = process.argv[2];
const level = process.argv[3] || "level1";
const buf = fs.readFileSync(path);
const r = await ocrAirtelReceipt(buf, level);
console.log(JSON.stringify(r, null, 2));
