"use client";

import { useEffect, useRef, useState } from "react";
import { studentBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export type LiveChatMsg = {
  id: string;
  name: string;
  text: string;
};

export function useLiveChat(roomId: string, me: EfaaStudent | null) {
  const [messages, setMessages] = useState<LiveChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`efaa-chat-${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const msg = payload as LiveChatMsg;
        if (!msg?.id || !msg.text) return;
        setMessages((prev) => [...prev.slice(-40), msg]);
      })
      .subscribe();
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight });
  }, [messages]);

  function send() {
    const text = draft.trim();
    if (!text || !me) return;
    const msg: LiveChatMsg = {
      id: `${Date.now()}-${me.id}`,
      name: studentBoardName(me) || me.firstName,
      text,
    };
    setMessages((prev) => [...prev.slice(-40), msg]);
    setDraft("");
    void channelRef.current?.send({ type: "broadcast", event: "chat", payload: msg });
  }

  return { messages, draft, setDraft, send, boxRef };
}
