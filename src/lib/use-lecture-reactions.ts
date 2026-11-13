"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type LectureFloat = { id: string; emoji: string; left: number };

export function useLectureReactions(roomId: string, meId?: string) {
  const [floats, setFloats] = useState<LectureFloat[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`efaa-lecture-react-${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "react" }, ({ payload }) => {
        const emoji = String((payload as { emoji?: string })?.emoji || "");
        if (!emoji) return;
        push(emoji);
      })
      .subscribe();
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  function push(emoji: string) {
    const item: LectureFloat = { id: `${Date.now()}-${Math.random()}`, emoji, left: 12 + Math.random() * 76 };
    setFloats((prev) => [...prev.slice(-12), item]);
    window.setTimeout(() => {
      setFloats((prev) => prev.filter((row) => row.id !== item.id));
    }, 1600);
  }

  function send(emoji: string) {
    if (!meId) return;
    push(emoji);
    void channelRef.current?.send({ type: "broadcast", event: "react", payload: { emoji, from: meId } });
  }

  return { floats, send, emojis: ["👏", "🔥", "❤️", "😂", "👍", "😮"] as const };
}
