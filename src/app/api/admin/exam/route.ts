import { NextRequest, NextResponse } from "next/server";
import { BEGINNER_EXAM_ID, BEGINNER_EXAM_PASS, BEGINNER_EXAM_TOTAL } from "@/lib/beginner-exam-1";
import { verifyAdminSession } from "@/lib/challenge-admin-server";
import { examDb } from "@/lib/exam-server";

export const dynamic = "force-dynamic";

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  level: string | null;
  access_code: string | null;
};

export async function GET(request: NextRequest) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json({ error: "admin-required" }, { status: 401 });
  }

  const userId = String(request.nextUrl.searchParams.get("userId") || "").trim();
  const db = examDb();

  const { data: attempts, error } = await db
    .from("efaa_exam_attempts")
    .select("id, user_id, exam_id, score, total, items, answers, started_at, submitted_at")
    .eq("exam_id", BEGINNER_EXAM_ID)
    .order("submitted_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = attempts || [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  let students: StudentRow[] = [];
  if (ids.length) {
    const { data: people } = await db
      .from("efaa_active_students")
      .select("id, first_name, last_name, email, level, access_code")
      .in("id", ids);
    students = (people || []) as StudentRow[];
  }
  const byId = new Map(students.map((s) => [s.id, s]));

  const list = rows.map((row) => {
    const person = byId.get(row.user_id);
    const name = `${person?.first_name || ""} ${person?.last_name || ""}`.replace(/\s+/g, " ").trim();
    return {
      id: row.id,
      userId: row.user_id,
      name: name || row.user_id,
      email: person?.email || "",
      level: person?.level || "",
      accessCode: person?.access_code || "",
      score: row.score,
      total: row.total || BEGINNER_EXAM_TOTAL,
      percent: Math.round((Number(row.score) / (Number(row.total) || BEGINNER_EXAM_TOTAL)) * 100),
      passed: Number(row.score) >= BEGINNER_EXAM_PASS,
      submittedAt: row.submitted_at,
      items: userId && userId === row.user_id ? row.items : undefined,
      answers: userId && userId === row.user_id ? row.answers : undefined,
    };
  });

  const taken = list.length;
  const avg = taken
    ? Math.round((list.reduce((sum, row) => sum + Number(row.score), 0) / taken) * 10) / 10
    : 0;
  const passRate = taken
    ? Math.round((list.filter((row) => row.passed).length / taken) * 100)
    : 0;

  const detail = userId ? list.find((row) => row.userId === userId) || null : null;
  if (detail && userId) {
    const raw = rows.find((r) => r.user_id === userId);
    detail.items = raw?.items;
    detail.answers = raw?.answers;
  }

  return NextResponse.json(
    {
      examId: BEGINNER_EXAM_ID,
      total: BEGINNER_EXAM_TOTAL,
      passMark: BEGINNER_EXAM_PASS,
      summary: { taken, average: avg, passRate },
      attempts: list.map(({ items: _i, answers: _a, ...rest }) => rest),
      detail,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
