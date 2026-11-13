import { NextRequest, NextResponse } from "next/server";
import {
  BEGINNER_EXAM_ID,
  BEGINNER_EXAM_PASS,
  BEGINNER_EXAM_TOTAL,
  motivationalMessage,
} from "@/lib/beginner-exam-1";
import { examDb } from "@/lib/exam-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = String(request.nextUrl.searchParams.get("userId") || "").trim();
  const localeParam = String(request.nextUrl.searchParams.get("locale") || "en");
  const locale = localeParam === "fr" || localeParam === "ar" ? localeParam : "en";
  if (!userId) {
    return NextResponse.json({ error: "user-required" }, { status: 400 });
  }
  const db = examDb();
  const { data, error } = await db
    .from("efaa_exam_attempts")
    .select("id, score, total, items, answers, started_at, submitted_at")
    .eq("user_id", userId)
    .eq("exam_id", BEGINNER_EXAM_ID)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const score = Number(data?.score) || 0;
  const total = Number(data?.total) || BEGINNER_EXAM_TOTAL;

  return NextResponse.json(
    {
      examId: BEGINNER_EXAM_ID,
      total: BEGINNER_EXAM_TOTAL,
      done: Boolean(data),
      attempt: data || null,
      message: data ? motivationalMessage(score, total, locale) : "",
      passed: data ? score >= BEGINNER_EXAM_PASS : false,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
