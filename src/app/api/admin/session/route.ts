import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createAdminSession,
  validAdminCode,
} from "@/lib/challenge-admin-server";

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  const key = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const current = attempts.get(key);
  const limit = !current || current.resetAt <= now ? { count: 0, resetAt: now + WINDOW_MS } : current;
  if (limit.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, error: "too-many-attempts" }, { status: 429 });
  }
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  if (!validAdminCode(String(body.code || ""))) {
    attempts.set(key, { ...limit, count: limit.count + 1 });
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  attempts.delete(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
