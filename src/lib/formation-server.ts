import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  AZOLO_ADMIN_CODE,
  FORMATION_OFFERS,
  SEATS_DEFAULT,
  type FormationLevel,
} from "@/lib/formation-pricing";

export function formationDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = service || anon;
  if (!url || !key) throw new Error("missing-supabase");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type SeatSnapshot = {
  level: FormationLevel;
  seatsTotal: number;
  approved: number;
  remaining: number;
  open: boolean;
};

export async function formationSeats(db = formationDb()): Promise<SeatSnapshot[]> {
  const levels: FormationLevel[] = ["level0", "level1"];
  const { data: seatRows } = await db.from("efaa_formation_seats").select("level, seats_total");
  const { data: apps } = await db
    .from("efaa_formation_applications")
    .select("level")
    .eq("status", "approved");

  const approvedMap: Record<string, number> = { level0: 0, level1: 0 };
  for (const row of apps || []) {
    const lv = String((row as { level?: string }).level || "");
    if (lv in approvedMap) approvedMap[lv] += 1;
  }

  const totalMap: Record<string, number> = {
    level0: SEATS_DEFAULT,
    level1: SEATS_DEFAULT,
  };
  for (const row of seatRows || []) {
    const r = row as { level: string; seats_total: number };
    totalMap[r.level] = Number(r.seats_total) || SEATS_DEFAULT;
  }

  return levels.map((level) => {
    const seatsTotal = totalMap[level] ?? SEATS_DEFAULT;
    const approved = approvedMap[level] ?? 0;
    const remaining = Math.max(0, seatsTotal - approved);
    return {
      level,
      seatsTotal,
      approved,
      remaining,
      open: remaining > 0,
    };
  });
}

export function assertAzoloCode(code: string) {
  return String(code || "").trim() === AZOLO_ADMIN_CODE;
}

export function offerFor(level: FormationLevel) {
  return FORMATION_OFFERS[level];
}

export async function createAccessCode(db: SupabaseClient) {
  for (let i = 0; i < 32; i += 1) {
    const n = Math.floor(1000 + Math.random() * 9000);
    const code = `efaa_${n}`;
    const { data: clash } = await db.from("invitation_codes").select("code").eq("code", code).maybeSingle();
    if (clash) continue;
    const { error } = await db.from("invitation_codes").insert({ code, is_used: false });
    if (!error) return code;
  }
  throw new Error("code-gen-failed");
}
