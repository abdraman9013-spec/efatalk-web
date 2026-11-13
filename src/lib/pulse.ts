"use client";

import { playLevelUp } from "@/lib/flash-lesson";

export type PulseKind = "partner" | "lobby" | "board" | "combo" | "invite" | "flame";

export type PulseEvent = {
  id: string;
  kind: PulseKind;
  text: string;
};

type Listener = (event: PulseEvent) => void;

const listeners = new Set<Listener>();
const recent = new Map<string, number>();

function allowed(key: string, gapMs: number) {
  const now = Date.now();
  const last = recent.get(key) || 0;
  if (now - last < gapMs) return false;
  recent.set(key, now);
  return true;
}

function emit(kind: PulseKind, text: string, key: string, gapMs: number) {
  if (typeof window === "undefined") return;
  if (!text.trim()) return;
  if (!allowed(key, gapMs)) return;
  const event: PulseEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    kind,
    text,
  };
  listeners.forEach((fn) => fn(event));
  playLevelUp();
  void showSystemPulse(text);
}

export function onPulse(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function pulsePartner(name: string, copy: string) {
  const who = name.trim();
  if (!who) return;
  emit("partner", copy.replace("{name}", who), `partner:${who}`, 8000);
}

export function pulseLobbyWait(copy: string) {
  emit("lobby", copy, "lobby-wait", 20000);
}

export function pulseBoardPlus(copy: string) {
  emit("board", copy, "board-plus", 4000);
}

export function pulseCombo(n: number, copy: string) {
  if (n < 3) return;
  emit("combo", copy.replace("{n}", String(n)), `combo:${n}`, 2500);
}

export function pulseInvite(copy: string) {
  emit("invite", copy, "invite", 15000);
}

export function pulseFlame(copy: string) {
  emit("flame", copy, "flame", 120000);
}

async function showSystemPulse(body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "denied") return;
  try {
    if (Notification.permission === "default") {
      const next = await Notification.requestPermission();
      if (next !== "granted") return;
    }
    if (Notification.permission !== "granted") return;
    const note = new Notification("EFA Talk", {
      body,
      tag: "efaa-pulse",
      silent: true,
    });
    window.setTimeout(() => note.close(), 4200);
  } catch {
    /* in-app toast is enough */
  }
}
