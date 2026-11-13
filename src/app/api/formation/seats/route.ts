import { NextResponse } from "next/server";
import { formationSeats } from "@/lib/formation-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const seats = await formationSeats();
    return NextResponse.json({ seats });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "seats-failed", seats: [] },
      { status: 500 },
    );
  }
}
