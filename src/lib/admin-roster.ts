import "server-only";

import { challengeDb } from "@/lib/challenge-server";
import type { Level } from "@/i18n/translations";

export type RosterRow = {
  id: string;
  name: string;
  whatsapp: string;
  email: string;
  level: Level;
  kind: "practice" | "official";
};

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

function asLevel(value: string): Level {
  if (value === "intermediate" || value === "advanced") return value;
  return "beginner";
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function displayName(last: string, first: string) {
  return `${last || ""} ${first || ""}`.replace(/\s+/g, " ").trim() || "—";
}

export async function loadAdminRoster() {
  const db = challengeDb();
  const [{ data: practice }, { data: official }] = await Promise.all([
    db
      .from("efaa_practice_students")
      .select("id,first_name,last_name,whatsapp,email,level")
      .order("created_at", { ascending: true }),
    db
      .from("efaa_active_students")
      .select("id,first_name,last_name,whatsapp,email,level")
      .order("created_at", { ascending: true }),
  ]);

  const byKey = new Map<string, RosterRow>();
  function put(
    row: {
      id: string;
      first_name: string | null;
      last_name: string | null;
      whatsapp: string | null;
      email: string | null;
      level: string | null;
    },
    kind: "practice" | "official",
  ) {
    if (row.id === "efaa-admin") return;
    const email = String(row.email || "").trim().toLowerCase();
    const phone = digits(String(row.whatsapp || ""));
    const key = email || phone || row.id;
    const next: RosterRow = {
      id: row.id,
      name: displayName(String(row.last_name || ""), String(row.first_name || "")),
      whatsapp: String(row.whatsapp || "").trim(),
      email,
      level: asLevel(String(row.level || "beginner")),
      kind,
    };
    const prev = byKey.get(key);
    if (!prev || (kind === "official" && prev.kind !== "official")) byKey.set(key, next);
  }

  (practice || []).forEach((row) => put(row, "practice"));
  (official || []).forEach((row) => put(row, "official"));

  const students = [...byKey.values()].sort((a, b) => {
    const rank = LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level);
    if (rank) return rank;
    return a.name.localeCompare(b.name, "fr");
  });

  const counts = {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
    total: students.length,
  };
  students.forEach((row) => {
    counts[row.level] += 1;
  });

  return { counts, students };
}
