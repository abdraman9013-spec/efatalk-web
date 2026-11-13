import { NextRequest, NextResponse } from "next/server";
import { challengeIdentity } from "@/lib/challenge-server";
import { whatsappGroupForExactLevel } from "@/lib/whatsapp-groups-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = await challengeIdentity(request);
  if (!identity) {
    return NextResponse.json({ error: "login-required" }, { status: 401 });
  }
  const group = whatsappGroupForExactLevel(identity.student.level);
  if (!group) {
    return NextResponse.json({ error: "no-group" }, { status: 404 });
  }
  return NextResponse.json(group, { headers: { "Cache-Control": "private, no-store" } });
}
