import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { BEGINNER_EXAM_ID } from "@/lib/beginner-exam-1";

export const EXAM_UNLOCK_COOKIE = "efaa_exam_unlock";

function secret() {
  return (
    process.env.EXAM_UNLOCK_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "efatalk-exam-unlock"
  );
}

export function examPasswordExpected() {
  return (process.env.EFAA_EXAM_PASSWORD || "EFAA2026").trim();
}

export function validExamPassword(input: string) {
  const a = Buffer.from(String(input || "").trim());
  const b = Buffer.from(examPasswordExpected());
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createExamUnlockToken(examId = BEGINNER_EXAM_ID) {
  const payload = Buffer.from(
    JSON.stringify({ examId, exp: Date.now() + 75 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readExamUnlockToken(request: NextRequest) {
  const header = request.headers.get("x-efaa-exam-unlock") || "";
  if (header.trim()) return header.trim();
  return request.cookies.get(EXAM_UNLOCK_COOKIE)?.value || "";
}

export function verifyExamUnlockToken(token: string, examId = BEGINNER_EXAM_ID) {
  const [payload, sent] = String(token || "").split(".");
  if (!payload || !sent) return false;
  const expected = sign(payload);
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      examId?: string;
      exp?: number;
    };
    return parsed.examId === examId && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

export function verifyExamUnlock(request: NextRequest, examId = BEGINNER_EXAM_ID) {
  return verifyExamUnlockToken(readExamUnlockToken(request), examId);
}

export function examDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
