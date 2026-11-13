"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { dailyTopicOrder } from "@/lib/debate-topics";
import { DEBATE_TOPICS, type DebateTopic } from "@/lib/intermediate-topics";
import { getSupabase } from "@/lib/supabase";

export function TopicRoulette({
  pairId,
  onTopic,
  catalog = DEBATE_TOPICS,
}: {
  pairId: string;
  onTopic: (topic: DebateTopic) => void;
  catalog?: DebateTopic[];
}) {
  const { t } = useI18n();
  const [offset, setOffset] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>["channel"]> | null>(null);
  const pool = dailyTopicOrder(catalog.length ? catalog : DEBATE_TOPICS, pairId);
  const topic = pool[((offset % pool.length) + pool.length) % pool.length];

  useEffect(() => {
    onTopic(topic);
  }, [topic, onTopic]);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase.channel(`efaa-mid-topic-${pairId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;
    channel.on("broadcast", { event: "spin" }, (payload) => {
      const next = Number((payload.payload as { offset?: number })?.offset);
      if (Number.isFinite(next)) setOffset(next);
    });
    void channel.subscribe();
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [pairId]);

  function spin() {
    if (spinning) return;
    setSpinning(true);
    const next = offset + 1 + Math.floor(Math.random() * Math.max(1, pool.length - 1));
    setOffset(next);
    void channelRef.current?.send({ type: "broadcast", event: "spin", payload: { offset: next } });
    window.setTimeout(() => setSpinning(false), 520);
  }

  return (
    <section className={`mid-roulette ${spinning ? "mid-spinning" : ""}`}>
      <p className="mid-roulette-kicker">{t.mid.topic}</p>
      <h2 className="mid-roulette-title" dir="ltr">{topic.title.en}</h2>
      <button type="button" className="mid-spin" onClick={spin}>
        {t.mid.changeTopic}
      </button>
    </section>
  );
}
