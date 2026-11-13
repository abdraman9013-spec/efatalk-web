"use client";

import { ADMIN_CODE } from "@/lib/admin";
import { getSupabase } from "@/lib/supabase";

export type BonusWindow = {
  open: boolean;
  expires_at: string | null;
};

export function bonusIsLive(row: BonusWindow | null) {
  if (!row?.open || !row.expires_at) return false;
  return new Date(row.expires_at).getTime() > Date.now();
}

export async function fetchBonusWindow(): Promise<BonusWindow> {
  const { data, error } = await getSupabase()
    .from("efaa_bonus_window")
    .select("open, expires_at")
    .eq("id", "main")
    .maybeSingle();
  if (error) throw error;
  return { open: Boolean(data?.open), expires_at: data?.expires_at || null };
}

export async function setBonus24h(open: boolean): Promise<BonusWindow> {
  const { data, error } = await getSupabase().rpc("efaa_set_bonus_24h", {
    p_open: open,
    p_code: ADMIN_CODE,
  });
  if (error) throw error;
  const row = (data || {}) as BonusWindow;
  return { open: Boolean(row.open), expires_at: row.expires_at || null };
}
