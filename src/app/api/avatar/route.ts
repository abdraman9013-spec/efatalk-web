import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 1.6 * 1024 * 1024;
const BUCKET = "efaa-avatars";

function serverSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const key = service || anon;
  if (!url || !key) throw new Error("missing-supabase");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function extFor(type: string) {
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("png")) return "png";
  return "webp";
}

export async function POST(request: Request) {
  const incoming = await request.formData().catch(() => null);
  const file = incoming?.get("file");
  const studentId = String(incoming?.get("studentId") || "").trim();
  const email = String(incoming?.get("email") || "").trim().toLowerCase();
  const kind = String(incoming?.get("kind") || "").trim();

  if (!(file instanceof Blob) || file.size < 400) {
    return NextResponse.json({ error: "missing-file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too-large" }, { status: 413 });
  }
  if (!studentId || studentId === "efaa-admin" || !email || !email.includes("@")) {
    return NextResponse.json({ error: "bad-student" }, { status: 400 });
  }

  const type = file.type || "image/webp";
  if (!type.startsWith("image/")) {
    return NextResponse.json({ error: "not-image" }, { status: 400 });
  }

  let supabase: ReturnType<typeof serverSupabase>;
  try {
    supabase = serverSupabase();
  } catch {
    return NextResponse.json({ error: "missing-supabase" }, { status: 503 });
  }

  const practice = await supabase
    .from("efaa_practice_students")
    .select("id, email")
    .eq("id", studentId)
    .eq("email", email)
    .maybeSingle();
  const official = practice.data
    ? null
    : await supabase
        .from("efaa_active_students")
        .select("id, email")
        .eq("id", studentId)
        .eq("email", email)
        .maybeSingle();

  const table = practice.data
    ? "efaa_practice_students"
    : official?.data
      ? "efaa_active_students"
      : null;
  if (!table) {
    return NextResponse.json({ error: "unknown-student" }, { status: 404 });
  }
  if (kind === "official" && table !== "efaa_active_students") {
    return NextResponse.json({ error: "kind-mismatch" }, { status: 409 });
  }
  if (kind === "practice" && table !== "efaa_practice_students") {
    return NextResponse.json({ error: "kind-mismatch" }, { status: 409 });
  }

  const ext = extFor(type);
  const path = `efaa/${studentId}/avatar.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: type,
    upsert: true,
    cacheControl: "3600",
  });
  if (uploadError) {
    return NextResponse.json({ error: uploadError.message || "upload-failed" }, { status: 500 });
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = `${publicData.publicUrl}?v=${Date.now()}`;

  const { data, error } = await supabase.rpc("efaa_set_student_avatar", {
    p_user_id: studentId,
    p_email: email,
    p_url: url,
  });
  if (error) {
    const { error: fallback } = await supabase
      .from(table)
      .update({ avatar_url: url, photo_url: url })
      .eq("id", studentId)
      .eq("email", email);
    if (fallback) {
      return NextResponse.json({ error: error.message || "db-failed" }, { status: 500 });
    }
    await supabase.from("efaa_user_gamification").update({ avatar_url: url }).eq("user_id", studentId);
  }

  return NextResponse.json({ url, kind: table === "efaa_active_students" ? "official" : "practice", row: data || null });
}
