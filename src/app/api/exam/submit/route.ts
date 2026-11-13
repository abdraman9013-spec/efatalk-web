import { NextRequest, NextResponse } from "next/server";
import {
  BEGINNER_EXAM_ID,
  BEGINNER_EXAM_MINUTES,
  BEGINNER_EXAM_PASS,
  gradeBeginnerExam,
  motivationalMessage,
} from "@/lib/beginner-exam-1";
import { EXAM_UNLOCK_COOKIE, examDb, verifyExamUnlock } from "@/lib/exam-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!verifyExamUnlock(request)) {
    return NextResponse.json({ ok: false, error: "unlock-required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    answers?: Record<string, string>;
    startedAt?: string;
    locale?: "en" | "fr" | "ar";
  };

  const userId = String(body.userId || "").trim();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "user-required" }, { status: 400 });
  }

  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const graded = gradeBeginnerExam(answers);
  const locale = body.locale === "fr" || body.locale === "ar" ? body.locale : "en";
  const message = motivationalMessage(graded.score, graded.total, locale);

  const db = examDb();
  const { data: existing } = await db
    .from("efaa_exam_attempts")
    .select("id, score, total, items, answers, started_at, submitted_at")
    .eq("user_id", userId)
    .eq("exam_id", BEGINNER_EXAM_ID)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyDone: true,
      score: existing.score,
      total: existing.total,
      items: existing.items,
      message: motivationalMessage(Number(existing.score), Number(existing.total) || graded.total, locale),
      passed: Number(existing.score) >= BEGINNER_EXAM_PASS,
    });
  }

  const startedAt = body.startedAt ? new Date(body.startedAt) : null;
  const maxMs = BEGINNER_EXAM_MINUTES * 60 * 1000 + 90_000;
  if (startedAt && !Number.isNaN(startedAt.getTime())) {
    const elapsed = Date.now() - startedAt.getTime();
    if (elapsed > maxMs) {
      /* still accept late submit once; answers already captured client-side */
    }
  }

  const { data, error } = await db.rpc("efaa_submit_exam_attempt", {
    p_user_id: userId,
    p_exam_id: BEGINNER_EXAM_ID,
    p_score: graded.score,
    p_total: graded.total,
    p_answers: answers,
    p_items: graded.items,
    p_started_at: startedAt && !Number.isNaN(startedAt.getTime()) ? startedAt.toISOString() : null,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const row = (data || {}) as {
    id?: string;
    score?: number;
    total?: number;
    items?: unknown;
    submitted_at?: string;
  };

  const response = NextResponse.json({
    ok: true,
    alreadyDone: false,
    score: Number(row.score ?? graded.score),
    total: Number(row.total ?? graded.total),
    items: Array.isArray(row.items) ? row.items : graded.items,
    message,
    passed: graded.passed,
    submittedAt: row.submitted_at,
  });
  // clear unlock cookie after successful submit
  response.cookies.set(EXAM_UNLOCK_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
