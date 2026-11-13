"use client";

import { ADMIN_CODE } from "@/lib/admin";
import { lessonsForBand } from "@/lib/learn-catalog";
import { getSupabase } from "@/lib/supabase";

export type LessonUnlock = {
  band: "0" | "1";
  lesson_no: number;
  unlocked: boolean;
};

export type LessonWork = {
  user_id: string;
  band: "0" | "1";
  lesson_no: number;
  watched: boolean;
  exo_done: boolean;
  exo_score: number;
  exo_total: number;
  test_best: number;
};

export async function fetchLessonUnlocks(band: "0" | "1"): Promise<LessonUnlock[]> {
  const { data, error } = await getSupabase()
    .from("efaa_lesson_unlock")
    .select("band, lesson_no, unlocked")
    .eq("band", band)
    .order("lesson_no");
  const rows = !error && Array.isArray(data) ? (data as LessonUnlock[]) : [];
  return lessonsForBand(band).map((lesson) => {
    const hit = rows.find((row) => Number(row.lesson_no) === lesson.n);
    return {
      band,
      lesson_no: lesson.n,
      unlocked: Boolean(hit?.unlocked),
    };
  });
}

export function unlockedNumbers(rows: LessonUnlock[]) {
  return rows.filter((row) => row.unlocked).map((row) => row.lesson_no);
}

export async function setLessonUnlock(band: "0" | "1", lessonNo: number, open: boolean) {
  const { data, error } = await getSupabase().rpc("efaa_set_lesson_unlock", {
    p_band: band,
    p_lesson_no: lessonNo,
    p_open: open,
    p_code: ADMIN_CODE,
  });
  if (error) throw error;
  return data as LessonUnlock;
}

export async function fetchLessonWork(userId: string, band: "0" | "1"): Promise<LessonWork[]> {
  const { data, error } = await getSupabase()
    .from("efaa_lesson_work")
    .select("user_id, band, lesson_no, watched, exo_done, exo_score, exo_total, test_best")
    .eq("user_id", userId)
    .eq("band", band);
  if (error || !data) return [];
  return data as LessonWork[];
}

export async function saveLessonWork(input: {
  userId: string;
  band: "0" | "1";
  lessonNo: number;
  watched?: boolean;
  exoDone?: boolean;
  exoScore?: number;
  exoTotal?: number;
  testBest?: number;
}) {
  const { data, error } = await getSupabase().rpc("efaa_save_lesson_work", {
    p_user_id: input.userId,
    p_band: input.band,
    p_lesson_no: input.lessonNo,
    p_watched: input.watched ?? null,
    p_exo_done: input.exoDone ?? null,
    p_exo_score: input.exoScore ?? null,
    p_exo_total: input.exoTotal ?? null,
    p_test_best: input.testBest ?? null,
  });
  if (error) throw error;
  return data as LessonWork;
}
