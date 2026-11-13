import { NextRequest, NextResponse } from "next/server";
import {
  BEGINNER_EXAM_ID,
  BEGINNER_EXAM_1,
  BEGINNER_EXAM_MINUTES,
  BEGINNER_EXAM_TOTAL,
  examQuestionPublic,
} from "@/lib/beginner-exam-1";
import { examDb, verifyExamUnlock } from "@/lib/exam-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = String(request.nextUrl.searchParams.get("userId") || "").trim();
  if (!userId) {
    return NextResponse.json({ error: "user-required" }, { status: 400 });
  }

  const db = examDb();
  const { data: existing } = await db
    .from("efaa_exam_attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("exam_id", BEGINNER_EXAM_ID)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already-done" }, { status: 409 });
  }

  if (!verifyExamUnlock(request)) {
    return NextResponse.json({ error: "unlock-required" }, { status: 403 });
  }

  return NextResponse.json(
    {
      examId: BEGINNER_EXAM_ID,
      title: "Beginner Exam 1 — Level 0",
      minutes: BEGINNER_EXAM_MINUTES,
      total: BEGINNER_EXAM_TOTAL,
      questions: BEGINNER_EXAM_1.map(examQuestionPublic),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
