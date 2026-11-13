import { NextResponse } from "next/server";
import { warmAirtelOcrEngine } from "@/lib/airtel-ocr-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await warmAirtelOcrEngine();
  return NextResponse.json({ ok: true });
}
