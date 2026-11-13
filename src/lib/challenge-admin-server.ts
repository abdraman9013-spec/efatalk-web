import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "efaa_admin_challenge";

function secret() {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "efatalk-admin-session"
  );
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminSession() {
  const payload = Buffer.from(
    JSON.stringify({ role: "efaa_admin", exp: Date.now() + 12 * 60 * 60 * 1000 }),
  ).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyAdminSession(request: NextRequest) {
  const value = request.cookies.get(ADMIN_COOKIE)?.value || "";
  const [payload, sent] = value.split(".");
  if (!payload || !sent) return false;
  const expected = signature(payload);
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      role?: string;
      exp?: number;
    };
    return parsed.role === "efaa_admin" && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

export function validAdminCode(code: string) {
  const expected = process.env.EFAA_ADMIN_CODE || "0680";
  const clean = code.replace(/\D/g, "");
  const a = Buffer.from(clean);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
