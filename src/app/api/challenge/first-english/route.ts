import { NextRequest, NextResponse } from "next/server";
import { awardInviteeReferrals } from "@/lib/challenge-invitee";
import { challengeIdentity } from "@/lib/challenge-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const identity = await challengeIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: "verified-account-required" }, { status: 401 });
    }
    const header = request.headers.get("authorization") || "";
    const accessToken = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const result = await awardInviteeReferrals(accessToken);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "first-english-failed" },
      { status: 500 },
    );
  }
}
