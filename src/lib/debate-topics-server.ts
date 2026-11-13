import "server-only";

import { examDb } from "@/lib/exam-server";
import {
  fallbackCatalog,
  parseTopicRows,
  seedRows,
  type DebateLevel,
  type DebateTopicRow,
} from "@/lib/debate-topics";
import type { DebateTopic } from "@/lib/intermediate-topics";

function db() {
  return examDb();
}

function adminCode() {
  return process.env.EFAA_ADMIN_CODE || "0680";
}

function rpcError(error: { message?: string } | null) {
  if (error) throw new Error(error.message || "topics-rpc-failed");
}

export async function ensureDebateTopicSeed() {
  const { error } = await db().rpc("efaa_ensure_debate_topics", {
    p_rows: seedRows(),
    p_code: adminCode(),
  });
  rpcError(error);
}

export async function listDebateTopics(level?: DebateLevel | "", includeHidden = false): Promise<DebateTopicRow[]> {
  await ensureDebateTopicSeed();
  if (includeHidden) {
    const { data, error } = await db().rpc("efaa_admin_list_debate_topics", { p_code: adminCode() });
    rpcError(error);
    const rows = (Array.isArray(data) ? data : []) as DebateTopicRow[];
    if (level === "intermediate" || level === "advanced") {
      return rows.filter((row) => row.level === level);
    }
    return rows;
  }
  let query = db()
    .from("efaa_debate_topics")
    .select("id,level,title_en,title_fr,title_ar,questions,sort_order,active")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (level === "intermediate" || level === "advanced") query = query.eq("level", level);
  const { data, error } = await query;
  rpcError(error);
  return (data || []) as DebateTopicRow[];
}

export async function catalogForLevel(level: DebateLevel): Promise<DebateTopic[]> {
  try {
    await ensureDebateTopicSeed();
    const rows = await listDebateTopics(level, false);
    return parseTopicRows(rows, level);
  } catch {
    return fallbackCatalog(level);
  }
}

function slugId(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .slice(0, 36);
  return `${base || "topic"}-${Date.now().toString(36)}`;
}

function cleanQuestions(input: unknown): DebateTopic["questions"] {
  const list = Array.isArray(input) ? input : [];
  return list
    .map((item) => {
      const row = (item || {}) as { en?: string; fr?: string; ar?: string };
      const en = String(row.en || "").trim();
      return {
        en,
        fr: String(row.fr || en).trim(),
        ar: String(row.ar || en).trim(),
      };
    })
    .filter((item) => item.en)
    .slice(0, 5);
}

export async function upsertDebateTopic(body: Partial<DebateTopicRow> & { level: DebateLevel }) {
  const titleEn = String(body.title_en || "").trim();
  if (!titleEn) throw new Error("title-required");
  const questions = cleanQuestions(body.questions);
  if (!questions.length) throw new Error("questions-required");
  const id = String(body.id || "").trim() || slugId(titleEn);
  const row = {
    id,
    level: body.level,
    title_en: titleEn,
    title_fr: String(body.title_fr || titleEn).trim(),
    title_ar: String(body.title_ar || titleEn).trim(),
    questions,
    active: body.active !== false,
    ...(Number(body.sort_order) > 0 ? { sort_order: Number(body.sort_order) } : {}),
  };
  const { data, error } = await db().rpc("efaa_upsert_debate_topic", {
    p_code: adminCode(),
    p_row: row,
  });
  rpcError(error);
  return data as DebateTopicRow;
}

export async function setDebateTopicActive(id: string, active: boolean) {
  const { data, error } = await db().rpc("efaa_set_debate_topic_active", {
    p_code: adminCode(),
    p_id: id,
    p_active: active,
  });
  rpcError(error);
  return data as DebateTopicRow;
}
