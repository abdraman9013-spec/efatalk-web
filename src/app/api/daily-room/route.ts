import { NextRequest, NextResponse } from "next/server";
import { isLevel } from "@/lib/session";

export async function POST(request: NextRequest) {
  const key = process.env.DAILY_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "missing-key" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    level?: string;
    room?: string;
    audioOnly?: boolean;
    ttlSec?: number;
  };
  const requested = (body.room || body.level || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  const slug = requested || (isLevel(body.level || "") ? body.level! : "beginner");
  const name = `efaa-${slug.slice(0, 48)}`;
  const audioOnly = Boolean(body.audioOnly);
  const ttl = Number(body.ttlSec) || 0;
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  const properties: Record<string, unknown> = {
    enable_prejoin_ui: false,
    start_video_off: audioOnly,
    start_audio_off: false,
    enable_network_ui: false,
    enable_screenshare: true,
  };
  if (ttl > 0) {
    properties.exp = Math.floor(Date.now() / 1000) + ttl;
    properties.eject_at_room_exp = true;
  }

  const existing = await fetch(`https://api.daily.co/v1/rooms/${name}`, { headers });
  if (existing.ok) {
    const room = (await existing.json()) as { url: string; config?: { exp?: number; enable_screenshare?: boolean } };
    const expired = Boolean(room.config?.exp && room.config.exp < Date.now() / 1000);
    if (!expired) {
      // Force screenshare on old rooms that were created without it.
      await fetch(`https://api.daily.co/v1/rooms/${name}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          properties: {
            enable_screenshare: true,
          },
        }),
      }).catch(() => null);
      return NextResponse.json({ url: room.url });
    }
    await fetch(`https://api.daily.co/v1/rooms/${name}`, { method: "DELETE", headers });
  }

  const created = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers,
    body: JSON.stringify({
      name,
      privacy: "public",
      properties,
    }),
  });

  if (!created.ok) {
    const detail = await created.text();
    if (detail.includes("invalid-request-error")) {
      return NextResponse.json({ error: "create-failed", detail }, { status: 500 });
    }
    // Two matched phones commonly request the same room at the same instant.
    // Daily creates it for one request and returns a conflict to the other;
    // both phones must still receive the same Daily URL instead of splitting
    // one participant into the mesh fallback.
    for (const delay of [100, 250, 500]) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      const racedRoom = await fetch(`https://api.daily.co/v1/rooms/${name}`, { headers });
      if (racedRoom.ok) {
        const room = (await racedRoom.json()) as { url?: string };
        if (room.url) return NextResponse.json({ url: room.url });
      }
    }
    return NextResponse.json({ error: "create-failed", detail }, { status: 500 });
  }

  const room = (await created.json()) as { url: string };
  return NextResponse.json({ url: room.url });
}
