"use client";

import { getSupabase } from "@/lib/supabase";
import type { ClashPeer } from "@/lib/clash";

export type ClashSign = {
  id: string;
  from_user: string;
  to_user: string;
  from_name: string;
  to_name: string;
  status: "pending" | "accepted" | "declined";
  room_id: string | null;
};

export type ClashLobbySnap = {
  online: ClashPeer[];
  inbox: ClashSign[];
};

export async function pulseClashLobby(me: ClashPeer): Promise<ClashLobbySnap> {
  const { data, error } = await getSupabase().rpc("efaa_clash_lobby_pulse", {
    p_user: me.id,
    p_name: me.name,
    p_photo: me.photo || null,
    p_nat: me.nationality || null,
  });
  if (error) throw error;
  const row = (data || {}) as { online?: ClashPeer[]; inbox?: ClashSign[] };
  return {
    online: Array.isArray(row.online) ? row.online : [],
    inbox: Array.isArray(row.inbox) ? row.inbox : [],
  };
}

export async function leaveClashLobby(userId: string) {
  await getSupabase().rpc("efaa_clash_lobby_leave", { p_user: userId });
}

export async function sendClashSign(from: ClashPeer, to: ClashPeer) {
  const { data, error } = await getSupabase().rpc("efaa_clash_sign_send", {
    p_from: from.id,
    p_to: to.id,
    p_from_name: from.name,
    p_to_name: to.name,
  });
  if (error) throw error;
  return data as ClashSign;
}

export async function actClashSign(id: string, userId: string, accept: boolean) {
  const { data, error } = await getSupabase().rpc("efaa_clash_sign_act", {
    p_id: id,
    p_user: userId,
    p_accept: accept,
  });
  if (error) throw error;
  return data as ClashSign;
}
