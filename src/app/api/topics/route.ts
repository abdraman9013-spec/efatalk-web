import { NextRequest, NextResponse } from "next/server";
import { fallbackCatalog, isDebateLevel } from "@/lib/debate-topics";
import { catalogForLevel } from "@/lib/debate-topics-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const level = request.nextUrl.searchParams.get("level") || "intermediate";
  if (!isDebateLevel(level)) {
    return NextResponse.json({ error: "bad-level" }, { status: 400 });
  }
  try {
    const topics = await catalogForLevel(level);
    return NextResponse.json({ level, topics });
  } catch {
    return NextResponse.json({ level, topics: fallbackCatalog(level) });
  }
}
