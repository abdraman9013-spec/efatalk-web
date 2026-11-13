import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MODELS = ["whisper-large-v3-turbo", "whisper-large-v3"];
const MAX_BYTES = 4 * 1024 * 1024;

type GroqTranscript = { text?: string };

export async function GET() {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "no-stt", available: false }, { status: 503 });
  }
  return NextResponse.json({ available: true });
}

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "no-stt", available: false }, { status: 503 });
  }

  const incoming = await request.formData().catch(() => null);
  const file = incoming?.get("file");
  if (!(file instanceof Blob) || file.size < 200) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }

  const type = file.type || "audio/wav";
  const ext = type.includes("wav")
    ? "wav"
    : type.includes("mp4") || type.includes("m4a")
      ? "m4a"
      : type.includes("ogg")
        ? "ogg"
        : "webm";

  for (const model of MODELS) {
    const outbound = new FormData();
    outbound.append("file", file, `speech.${ext}`);
    outbound.append("model", model);
    outbound.append("language", "en");
    outbound.append("response_format", "json");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${key}` },
        body: outbound,
      });
      if (!response.ok) continue;
      const data = (await response.json()) as GroqTranscript;
      const text = (data.text || "").trim();
      return NextResponse.json({ text });
    } catch {
      /* try next model */
    } finally {
      clearTimeout(timer);
    }
  }

  return NextResponse.json({ error: "stt-failed" }, { status: 502 });
}
