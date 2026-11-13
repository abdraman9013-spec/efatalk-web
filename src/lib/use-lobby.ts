"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { slimAvatarUrl } from "@/lib/avatar";
import { removeRealtimeChannel, waitForChannelRemoval } from "@/lib/realtime-channel";
import { studentBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export type LobbyPeer = {
  id: string;
  name: string;
  nationality?: string;
  streak?: number;
  photo?: string;
  queuedAt: number | null;
  pairId?: string | null;
  inMatch?: boolean;
};

export type MatchMember = {
  id: string;
  name: string;
  avatarUrl?: string;
};

export type LobbyRoom = {
  id: string;
  members: LobbyPeer[];
};

type MatchBroadcast = {
  id: string;
  members: { id: string; name: string }[];
};

type PresenceWire = {
  userId?: string;
  id?: string;
  name?: string;
  streak?: number;
  pairId?: string | null;
  queuedAt?: number | null;
  inMatch?: boolean;
};

const MATCH_SEAT_PREFIX = "efaa_match:";

function isLiveMatch(peer: LobbyPeer, all: LobbyPeer[]) {
  if (!(peer.inMatch || peer.pairId)) return false;
  if (!peer.pairId) return Boolean(peer.inMatch);
  return all.some((other) => other.id !== peer.id && other.pairId === peer.pairId);
}

function freeToPair(peer: LobbyPeer, all: LobbyPeer[]) {
  return Boolean(peer.queuedAt) && !isLiveMatch(peer, all);
}

/** Same queue snapshot on every device produces the same pairs, so no server is needed. */
function pairsFromQueue(queue: LobbyPeer[]) {
  const sorted = [...queue].sort(
    (a, b) => (a.queuedAt || 0) - (b.queuedAt || 0) || a.id.localeCompare(b.id),
  );
  const pairs: [LobbyPeer, LobbyPeer][] = [];
  for (let i = 0; i + 1 < sorted.length; i += 2) {
    pairs.push([sorted[i], sorted[i + 1]]);
  }
  return pairs;
}

export function pairIdOf(a: string, b: string) {
  return [a, b]
    .sort()
    .map((id) => id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24))
    .join("-");
}

export function writeMatchSeat(pairId: string, members: MatchMember[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      `${MATCH_SEAT_PREFIX}${pairId}`,
      JSON.stringify({
        pairId,
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          avatarUrl: slimAvatarUrl(member.avatarUrl),
        })),
        at: Date.now(),
      }),
    );
  } catch {
    /* quota */
  }
}

export function readMatchSeat(pairId: string): MatchMember[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(`${MATCH_SEAT_PREFIX}${pairId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { pairId?: string; members?: MatchMember[]; at?: number };
    if (parsed.pairId !== pairId) return [];
    if (Date.now() - (parsed.at || 0) > 15 * 60 * 1000) return [];
    return parsed.members || [];
  } catch {
    return [];
  }
}

function roomsFromQueue(queue: LobbyPeer[], maxParty: number): LobbyRoom[] {
  const sorted = [...queue].sort(
    (a, b) => (a.queuedAt || 0) - (b.queuedAt || 0) || a.id.localeCompare(b.id),
  );
  const rooms: LobbyRoom[] = [];
  for (let i = 0; i + 1 < sorted.length; i += maxParty) {
    const members = sorted.slice(i, i + maxParty);
    if (members.length < 2) break;
    rooms.push({ id: pairIdOf(members[0].id, members[1].id), members });
  }
  return rooms;
}

/** Presence must stay tiny. Photos blow the channel and matching dies. */
function presenceOf(student: EfaaStudent, queuedAt: number | null, pairId: string | null, inMatch: boolean) {
  return {
    userId: student.id,
    id: student.id,
    name: studentBoardName(student),
    streak: student.streak,
    pairId,
    queuedAt,
    inMatch,
  };
}

export function useLobby(
  level: string,
  me: EfaaStudent | null,
  options?: { autoQueue?: boolean; maxParty?: number },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [peers, setPeers] = useState<LobbyPeer[]>([]);
  const [searching, setSearching] = useState(false);
  const [partner, setPartner] = useState<LobbyPeer | null>(null);
  const [room, setRoom] = useState<LobbyRoom | null>(null);
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [ready, setReady] = useState(false);
  const maxParty = options?.maxParty || 2;

  const meId = me?.id;
  const queuedAtRef = useRef<number | null>(null);
  const pairIdRef = useRef<string | null>(null);
  const committedRef = useRef<LobbyRoom | null>(null);
  const announcedRef = useRef<string | null>(null);
  const subscribedRef = useRef(false);
  const lastPresenceRef = useRef("");
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const pushPresenceRef = useRef<(queuedAt: number | null, pairId: string | null, force?: boolean) => void>(
    () => undefined,
  );
  const meRef = useRef(me);

  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const pushPresence = useCallback((queuedAt: number | null, pairId: string | null, force = false) => {
    const student = meRef.current;
    queuedAtRef.current = queuedAt;
    pairIdRef.current = pairId;
    if (!student || !channelRef.current || !subscribedRef.current) return;
    const channel = channelRef.current;
    const signature = `${studentBoardName(student)}|${student.streak}|${queuedAt ?? ""}|${pairId ?? ""}`;
    if (!force && lastPresenceRef.current === signature) return;
    lastPresenceRef.current = signature;
    void channel.track(presenceOf(student, queuedAt, pairId, Boolean(pairId))).then((result) => {
      if (channelRef.current !== channel || !subscribedRef.current) return;
      if (result === "ok") {
        retryAttemptRef.current = 0;
        setReady(true);
        return;
      }

      if (lastPresenceRef.current === signature) lastPresenceRef.current = "";
      setReady(false);
      if (retryTimerRef.current !== null) return;
      const delay = Math.min(30_000, 2_000 * 2 ** retryAttemptRef.current);
      retryAttemptRef.current += 1;
      retryTimerRef.current = window.setTimeout(() => {
        retryTimerRef.current = null;
        pushPresenceRef.current(queuedAtRef.current, pairIdRef.current, true);
      }, delay);
    });
  }, []);

  useEffect(() => {
    pushPresenceRef.current = pushPresence;
  }, [pushPresence]);

  const lockRoom = useCallback((next: LobbyRoom, studentId: string) => {
    committedRef.current = next;
    setRoom(next);
    setPartner(next.members.find((member) => member.id !== studentId) || null);
  }, []);

  useEffect(() => {
    const student = meRef.current;
    if (!student || student.id !== meId) return;
    let cancelled = false;
    const supabase = getSupabase();
    const topic = `efaa-lobby-${level}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void waitForChannelRemoval(topic).then(() => {
      if (cancelled) return;
      const nextChannel = supabase.channel(topic, {
        config: { presence: { key: student.id }, broadcast: { self: false } },
      });
      channel = nextChannel;
      channelRef.current = nextChannel;
      subscribedRef.current = false;
      lastPresenceRef.current = "";

      nextChannel.on("broadcast", { event: "match" }, ({ payload }) => {
        if (cancelled) return;
        const hit = payload as MatchBroadcast;
        if (!hit?.id || !Array.isArray(hit.members)) return;
        if (!hit.members.some((member) => member.id === student.id)) return;
        if (hit.members.length < 2) return;
        if (committedRef.current?.id === hit.id) return;
        lockRoom(
          {
            id: hit.id,
            members: hit.members.map((member) => ({
              id: member.id,
              name: member.name,
              queuedAt: queuedAtRef.current || Date.now(),
              inMatch: true,
            })),
          },
          student.id,
        );
      });

      nextChannel.on("presence", { event: "sync" }, () => {
        if (cancelled) return;
        const state = nextChannel.presenceState<PresenceWire>();
        const list = Object.values(state)
          .map((entries) => entries[entries.length - 1])
          .filter((entry): entry is PresenceWire & { presence_ref: string } =>
            Boolean(entry?.userId || entry?.id),
          );

        const mapped: LobbyPeer[] = list.map((entry) => {
          const id = String(entry.userId || entry.id || "");
          const pairId = entry.pairId || null;
          return {
            id,
            name: entry.name || "Guest",
          streak: typeof entry.streak === "number" ? entry.streak : undefined,
            queuedAt: entry.queuedAt || null,
            pairId,
            inMatch: Boolean(entry.inMatch || pairId),
          };
        });
        const minePresence = mapped.find((peer) => peer.id === student.id);
        queuedAtRef.current = minePresence?.queuedAt ?? queuedAtRef.current;

        setPeers(mapped);

        const queue = mapped.filter((peer) => freeToPair(peer, mapped));
        const assigned = roomsFromQueue(queue, maxParty);
        const seen = new Set(assigned.map((item) => item.id));
        mapped.forEach((peer) => {
          if (!peer.pairId || seen.has(peer.pairId)) return;
          const members = mapped.filter((other) => other.pairId === peer.pairId);
          if (members.length >= 2) {
            assigned.push({ id: peer.pairId, members: members.slice(0, maxParty) });
            seen.add(peer.pairId);
          }
        });
        setRooms(assigned);

        const locked = committedRef.current;
        if (locked) {
          const partnerId = locked.members.find((member) => member.id !== student.id)?.id;
          const partnerHere = mapped.find((peer) => peer.id === partnerId);
          if (partnerHere) {
            setRoom(locked);
            setPartner(locked.members.find((member) => member.id !== student.id) || null);
            return;
          }
          committedRef.current = null;
          announcedRef.current = null;
          pairIdRef.current = null;
        }

        const mine = assigned.find((item) => item.members.some((peer) => peer.id === student.id)) || null;
        if (mine && mine.members.length >= 2) {
          lockRoom(mine, student.id);
          return;
        }

        setRoom(mine);
        const pair = pairsFromQueue(queue).find((item) => item.some((p) => p.id === student.id));
        setPartner(pair ? pair.find((p) => p.id !== student.id) || null : null);
      });

      nextChannel.subscribe((state) => {
        if (cancelled) return;
        if (state !== "SUBSCRIBED") {
          subscribedRef.current = false;
          setReady(false);
          return;
        }
        subscribedRef.current = true;
        const queuedAt = options?.autoQueue ? Date.now() : null;
        const reconnecting = Boolean(queuedAtRef.current || pairIdRef.current || committedRef.current);
        if (!reconnecting) {
          queuedAtRef.current = queuedAt;
          pairIdRef.current = null;
          committedRef.current = null;
        }
        const activeQueue = reconnecting ? queuedAtRef.current : queuedAt;
        const activePair = reconnecting ? pairIdRef.current : null;
        pushPresence(activeQueue, activePair, true);
        if (options?.autoQueue || activeQueue) setSearching(true);
      });
    });

    return () => {
      cancelled = true;
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (!channel) return;
      if (channelRef.current === channel) {
        channelRef.current = null;
        subscribedRef.current = false;
      }
      void removeRealtimeChannel(topic, supabase, channel);
    };
  }, [level, lockRoom, maxParty, meId, options?.autoQueue, pushPresence]);

  useEffect(() => {
    if (!ready) return;
    const nextPair = searching && (committedRef.current?.id || room?.id) ? committedRef.current?.id || room?.id || null : null;
    pushPresence(queuedAtRef.current, nextPair);
  }, [pushPresence, ready, room?.id, searching]);

  useEffect(() => {
    if (!ready || !me) return;
    pushPresence(queuedAtRef.current, pairIdRef.current);
  }, [me, pushPresence, ready]);

  useEffect(() => {
    if (!searching || !room || room.members.length < 2) return;
    if (announcedRef.current === room.id) return;
    announcedRef.current = room.id;
    void channelRef.current?.send({
      type: "broadcast",
      event: "match",
      payload: {
        id: room.id,
        members: room.members.map((member) => ({ id: member.id, name: member.name })),
      } satisfies MatchBroadcast,
    });
  }, [room, searching]);

  const startMatching = useCallback(() => {
    if (!me || !channelRef.current) return;
    committedRef.current = null;
    announcedRef.current = null;
    pairIdRef.current = null;
    setSearching(true);
    setPartner(null);
    setRoom(null);
    pushPresence(Date.now(), null);
  }, [me, pushPresence]);

  const cancelMatching = useCallback(() => {
    if (!me || !channelRef.current) return;
    committedRef.current = null;
    announcedRef.current = null;
    pairIdRef.current = null;
    setSearching(false);
    setPartner(null);
    setRoom(null);
    pushPresence(null, null);
  }, [me, pushPresence]);

  const roomCommitted = Boolean(room && room.members.length >= 2);
  const inMatchCount = peers.filter((peer) => isLiveMatch(peer, peers)).length;

  return {
    peers,
    ready,
    searching,
    partner,
    room,
    rooms,
    roomCommitted,
    inMatchCount,
    startMatching,
    cancelMatching,
  };
}
