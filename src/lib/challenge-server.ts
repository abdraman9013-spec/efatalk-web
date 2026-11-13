import "server-only";

import { createHash } from "node:crypto";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { resolveChallengePhase } from "@/lib/challenge-logic";
import { CHALLENGE_ID } from "@/lib/challenge-types";

type StudentIdentity = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  nationality: string;
  city: string;
  level: string;
  photo_url: string | null;
  avatar_url?: string | null;
  kind: "practice" | "official";
};

export function challengeDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const scopedSecret = process.env.CHALLENGE_SERVER_SECRET;
  if (!url || !key || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !scopedSecret)) {
    throw new Error("Challenge server configuration is missing");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: scopedSecret
      ? { headers: { "x-efaa-server-secret": scopedSecret } }
      : undefined,
  });
}

function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase auth configuration is missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticatedUser(request: NextRequest): Promise<User | null> {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await authClient().auth.getUser(token);
  if (error || !data.user?.email) return null;
  return data.user;
}

export async function challengeIdentity(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user?.email) return null;
  const db = challengeDb();
  const email = user.email.trim().toLowerCase();

  const { data: practice } = await db
    .from("efaa_practice_students")
    .select("id,email,first_name,last_name,nationality,city,level,photo_url,avatar_url,auth_user_id")
    .or(`auth_user_id.eq.${user.id},email.eq.${email}`)
    .limit(1)
    .maybeSingle();

  if (practice) {
    if (!practice.auth_user_id) {
      await db.from("efaa_practice_students").update({ auth_user_id: user.id }).eq("id", practice.id);
    }
    return {
      authUser: user,
      student: { ...practice, kind: "practice" } as StudentIdentity,
    };
  }

  const { data: official } = await db
    .from("efaa_active_students")
    .select("id,email,first_name,last_name,nationality,city,level,photo_url,avatar_url")
    .eq("email", email)
    .maybeSingle();
  if (!official) return null;
  return {
    authUser: user,
    student: { ...official, kind: "official" } as StudentIdentity,
  };
}

export function displayName(student: Pick<StudentIdentity, "first_name" | "last_name">) {
  return `${student.last_name || ""} ${student.first_name || ""}`.replace(/\s+/g, " ").trim();
}

export const challengePhase = resolveChallengePhase;

export function academyDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Ndjamena",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const take = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${take("year")}-${take("month")}-${take("day")}`;
}

export function privateSignal(value: string) {
  const salt =
    process.env.CHALLENGE_HASH_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "efatalk-challenge";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export function requestSignals(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const agent = request.headers.get("user-agent") || "";
  return {
    ipHash: forwarded ? privateSignal(forwarded) : null,
    deviceHash: agent ? privateSignal(agent) : null,
  };
}

export async function currentChallenge(db = challengeDb()) {
  const { data, error } = await db
    .from("efaa_challenges")
    .select("*")
    .eq("id", CHALLENGE_ID)
    .single();
  if (error || !data) throw error || new Error("Challenge is missing");
  return data;
}
