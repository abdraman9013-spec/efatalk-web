import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/challenge-admin-server";
import { isDebateLevel } from "@/lib/debate-topics";
import {
  listDebateTopics,
  setDebateTopicActive,
  upsertDebateTopic,
} from "@/lib/debate-topics-server";

export const dynamic = "force-dynamic";

function denied() {
  return NextResponse.json({ error: "admin-required" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request)) return denied();
  const level = request.nextUrl.searchParams.get("level") || "";
  try {
    if (level && isDebateLevel(level)) {
      const topics = await listDebateTopics(level, true);
      return NextResponse.json({ topics });
    }
    const [intermediate, advanced] = await Promise.all([
      listDebateTopics("intermediate", true),
      listDebateTopics("advanced", true),
    ]);
    return NextResponse.json({
      topics: [...intermediate, ...advanced],
      counts: { intermediate: intermediate.length, advanced: advanced.length },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminSession(request)) return denied();
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const level = String(body.level || "");
    if (!isDebateLevel(level)) {
      return NextResponse.json({ error: "bad-level" }, { status: 400 });
    }
    const topic = await upsertDebateTopic({
      id: String(body.id || ""),
      level,
      title_en: String(body.title_en || ""),
      title_fr: String(body.title_fr || ""),
      title_ar: String(body.title_ar || ""),
      questions: Array.isArray(body.questions)
        ? body.questions.map((item) => {
            const row = (item || {}) as { en?: string; fr?: string; ar?: string };
            const en = String(row.en || "").trim();
            return { en, fr: String(row.fr || en).trim(), ar: String(row.ar || en).trim() };
          })
        : [],
      sort_order: Number(body.sort_order) || 0,
      active: body.active !== false,
    });
    return NextResponse.json({ topic });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyAdminSession(request)) return denied();
  try {
    const body = (await request.json()) as { id?: string; active?: boolean };
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ error: "id-required" }, { status: 400 });
    const topic = await setDebateTopicActive(id, body.active !== false);
    return NextResponse.json({ topic });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}
