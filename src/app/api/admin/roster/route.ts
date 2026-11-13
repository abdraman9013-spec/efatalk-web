import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/challenge-admin-server";
import { loadAdminRoster } from "@/lib/admin-roster";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "admin-required" }, { status: 401 });
  }
  try {
    const roster = await loadAdminRoster();
    return NextResponse.json(roster, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "roster-failed" },
      { status: 500 },
    );
  }
}
