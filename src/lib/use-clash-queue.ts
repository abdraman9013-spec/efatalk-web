"use client";

import { useEffect, useRef, useState } from "react";
import { pairIdOf } from "@/lib/use-lobby";
import type { ClashPeer } from "@/lib/clash";
import { getSupabase } from "@/lib/supabase";

type QueueMeta = ClashPeer & { queuedAt: number };

export function useClashQueue(me: ClashPeer | null, searching: boolean) {
  const [partner, setPartner] = useState<ClashPeer | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const queuedAt = useRef(0);

  useEffect(() => {
    if (!me || !searching) {
      setPartner(null);
      setRoomId(null);
      return;
    }
    queuedAt.current = Date.now();
    const supabase = getSupabase();
    const channel = supabase.channel("efaa-clash-queue", { config: { presence: { key: me.id } } });

    channel.on("presence", { event: "sync" }, () => {
      const waiting: QueueMeta[] = [];
      Object.values(channel.presenceState<QueueMeta>()).forEach((entries) => {
        const peer = entries[entries.length - 1];
        if (peer?.id) waiting.push(peer);
      });
      const sorted = waiting.sort((a, b) => a.queuedAt - b.queuedAt || a.id.localeCompare(b.id));
      for (let i = 0; i + 1 < sorted.length; i += 2) {
        const [a, b] = [sorted[i], sorted[i + 1]];
        if (a.id !== me.id && b.id !== me.id) continue;
        const other = a.id === me.id ? b : a;
        setPartner(other);
        setRoomId(pairIdOf(a.id, b.id));
        return;
      }
    });

    void channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({ ...me, queuedAt: queuedAt.current } satisfies QueueMeta);
      }
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [me, searching]);

  return { partner, roomId };
}
