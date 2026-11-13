"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Level } from "@/i18n/translations";
import { removeRealtimeChannel, waitForChannelRemoval } from "@/lib/realtime-channel";

export type LiveRoomCard = {
  roomId: string;
  level: Level;
  count: number;
  ids: string[];
  names: string[];
  photos: (string | undefined)[];
};

type IndexPresence = {
  roomId: string;
  level: Level;
  id: string;
  name: string;
  ghost?: boolean;
};

export function useLiveIndex(publish?: IndexPresence | null) {
  const [rooms, setRooms] = useState<LiveRoomCard[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const publishedRef = useRef("");
  const publishRef = useRef(publish);

  useEffect(() => {
    publishRef.current = publish;
  }, [publish]);

  useEffect(() => {
    const supabase = getSupabase();
    const topic = "efaa-live-index";
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void waitForChannelRemoval(topic).then(() => {
      if (cancelled) return;
      const connectionKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const nextChannel = supabase.channel(topic, {
        config: { presence: { key: `connection-${connectionKey}` } },
      });
      channel = nextChannel;
      channelRef.current = nextChannel;
      subscribedRef.current = false;
      publishedRef.current = "";

      nextChannel.on("presence", { event: "sync" }, () => {
        const state = nextChannel.presenceState<IndexPresence>();
        const grouped = new Map<string, LiveRoomCard>();
        Object.values(state).forEach((entries) => {
          const row = entries[entries.length - 1];
          if (!row?.roomId || row.ghost) return;
          const current = grouped.get(row.roomId) || {
            roomId: row.roomId,
            level: row.level,
            count: 0,
            ids: [],
            names: [],
            photos: [],
          };
          if (row.id && current.ids.includes(row.id)) return;
          current.count += 1;
          if (row.id) current.ids.push(row.id);
          if (row.name) {
            current.names.push(row.name);
            current.photos.push(undefined);
          }
          grouped.set(row.roomId, current);
        });
        setRooms([...grouped.values()].sort((a, b) => b.count - a.count));
      });

      nextChannel.subscribe((status) => {
        if (cancelled) return;
        if (status !== "SUBSCRIBED") {
          subscribedRef.current = false;
          return;
        }
        subscribedRef.current = true;
        const current = publishRef.current;
        if (!current) return;
        const signature = JSON.stringify(current);
        void nextChannel.track(current).then((result) => {
          if (result === "ok" && channelRef.current === nextChannel) publishedRef.current = signature;
        });
      });
    });

    return () => {
      cancelled = true;
      if (!channel) return;
      if (channelRef.current === channel) {
        channelRef.current = null;
        subscribedRef.current = false;
      }
      void removeRealtimeChannel(topic, supabase, channel);
    };
  }, []);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !subscribedRef.current || !publish) return;
    const signature = JSON.stringify(publish);
    if (publishedRef.current === signature) return;
    void channel.track(publish).then((result) => {
      if (result === "ok" && channelRef.current === channel) publishedRef.current = signature;
    });
  }, [publish]);

  return rooms;
}
