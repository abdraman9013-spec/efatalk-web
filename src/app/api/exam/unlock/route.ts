import { NextRequest, NextResponse } from "next/server";
import {
  BEGINNER_EXAM_ID,
  BEGINNER_EXAM_PASS,
  motivationalMessage,
} from "@/lib/beginner-exam-1";
import {
  EXAM_UNLOCK_COOKIE,
  createExamUnlockToken,
  examDb,
  validExamPassword,
} from "@/lib/exam-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    password?: string;
    userId?: string;
    locale?: "en" | "fr" | "ar";
  };
  const userId = String(body.userId || "").trim();
  const locale = body.locale === "fr" || body.locale === "ar" ? body.locale : "en";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "user-required" }, { status: 400 });
  }
  if (!validExamPassword(String(body.password || ""))) {
    return NextResponse.json({ ok: false, error: "bad-password" }, { status: 401 });
  }

  const db = examDb();
  const { data: existing } = await db
    .from("efaa_exam_attempts")
    .select("id, score, total, items, submitted_at")
    .eq("user_id", userId)
    .eq("exam_id", BEGINNER_EXAM_ID)
    .maybeSingle();

  if (existing) {
    const score = Number(existing.score) || 0;
    const total = Number(existing.total) || 50;
    return NextResponse.json({
      ok: true,
      alreadyDone: true,
      attempt: existing,
      message: motivationalMessage(score, total, locale),
      passed: score >= BEGINNER_EXAM_PASS,
    });
  }

  const token = createExamUnlockToken();
  const response = NextResponse.json({ ok: true, alreadyDone: false, token });
  response.cookies.set(EXAM_UNLOCK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 75 * 60,
  });
  return response;
}
