"use client";

import { getSupabase } from "@/lib/supabase";
import type {
  ChallengeMe,
  ChallengePublicPayload,
} from "@/lib/challenge-types";
import { CHALLENGE_NEXT_KEY, CHALLENGE_REF_KEY } from "@/lib/challenge-types";

export function rememberChallengeIntent(referralToken?: string) {
  try {
    window.localStorage.setItem(CHALLENGE_NEXT_KEY, "/challenge");
    if (referralToken) {
      window.localStorage.setItem(CHALLENGE_REF_KEY, referralToken.trim().toUpperCase());
    }
  } catch {
    /* private browsing */
  }
}

export function rememberedChallengeReferral() {
  try {
    return (window.localStorage.getItem(CHALLENGE_REF_KEY) || "").trim().toUpperCase();
  } catch {
    return "";
  }
}

export function readChallengeNext(clear = false) {
  try {
    const next = window.localStorage.getItem(CHALLENGE_NEXT_KEY) || "";
    if (clear) window.localStorage.removeItem(CHALLENGE_NEXT_KEY);
    return next === "/challenge" ? next : "";
  } catch {
    return "";
  }
}

async function authorization(): Promise<Record<string, string>> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchChallengePublic(): Promise<ChallengePublicPayload> {
  const response = await fetch("/api/challenge", { cache: "no-store" });
  if (!response.ok) throw new Error("challenge-unavailable");
  return response.json();
}

export async function fetchChallengeMe(): Promise<ChallengeMe | null> {
  const headers = await authorization();
  if (!("Authorization" in headers)) return null;
  const response = await fetch("/api/challenge/me", {
    headers,
    cache: "no-store",
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("challenge-profile-unavailable");
  return response.json();
}

export async function joinChallenge(input: {
  acceptRules: boolean;
  tiktok: boolean;
  facebook: boolean;
  referralToken?: string;
}) {
  const headers = await authorization();
  if (!("Authorization" in headers)) throw new Error("verified-account-required");
  const response = await fetch("/api/challenge/join", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "join-failed");
  return payload as { ok: true; participantId: string; referralToken: string };
}

export async function reportFirstEnglish(source: "survival" | "formation") {
  const headers = await authorization();
  if (!("Authorization" in headers)) return;
  await fetch("/api/challenge/first-english", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  }).catch(() => null);
}
