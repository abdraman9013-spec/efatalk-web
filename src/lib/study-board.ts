"use client";

import { getSupabase } from "@/lib/supabase";

export type StudyBadge = "rookie" | "bronze" | "silver" | "gold" | "diamond" | "legend";

export type StudyBoardRow = {
  user_id: string;
  display_name: string;
  photo?: string | null;
  points: number;
  badge: StudyBadge;
  rank: number;
};

export type StudyBoard = {
  band: "0" | "1";
  rows: StudyBoardRow[];
};

export const STUDY_BADGE_THRESHOLDS: { badge: StudyBadge; min: number }[] = [
  { badge: "legend", min: 1000 },
  { badge: "diamond", min: 500 },
  { badge: "gold", min: 200 },
  { badge: "silver", min: 100 },
  { badge: "bronze", min: 50 },
  { badge: "rookie", min: 0 },
];

export function studyBadgeFor(points: number): StudyBadge {
  for (const row of STUDY_BADGE_THRESHOLDS) {
    if (points >= row.min) return row.badge;
  }
  return "rookie";
}

export function nextStudyBadge(points: number): { badge: StudyBadge; need: number } | null {
  const order: StudyBadge[] = ["bronze", "silver", "gold", "diamond", "legend"];
  const mins: Record<StudyBadge, number> = {
    rookie: 0,
    bronze: 50,
    silver: 100,
    gold: 200,
    diamond: 500,
    legend: 1000,
  };
  for (const badge of order) {
    if (points < mins[badge]) return { badge, need: mins[badge] - points };
  }
  return null;
}

export async function fetchStudyBoard(band: "0" | "1"): Promise<StudyBoard> {
  const { data, error } = await getSupabase().rpc("efaa_study_board", { p_band: band });
  if (error) throw error;
  const payload = (data || {}) as { band?: string; rows?: StudyBoardRow[] };
  const rows = Array.isArray(payload.rows)
    ? payload.rows.map((row, i) => ({
        user_id: String(row.user_id || ""),
        display_name: String(row.display_name || "—").trim() || "—",
        photo: row.photo || null,
        points: Math.max(0, Number(row.points) || 0),
        badge: (row.badge as StudyBadge) || studyBadgeFor(Number(row.points) || 0),
        rank: Number(row.rank) || i + 1,
      }))
    : [];
  return { band: payload.band === "1" ? "1" : "0", rows };
}
