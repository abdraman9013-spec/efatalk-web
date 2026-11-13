import { NextRequest, NextResponse } from "next/server";
import {
  GENERATE_BATCH,
  MIN_DICTIONARY_FILL,
  createDictionaryClient,
  getAdaptiveWords,
  ingestVocabulary,
  type AdaptiveWordsPayload,
  type GeneratedWord,
} from "@/lib/adaptive-dictionary";

export const runtime = "edge";

type FetchWordsBody = {
  userId?: string;
  user_id?: string;
  limit?: number;
  limit_amount?: number;
};

type GroqChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
};

const WORD_RE = /^[\p{L}][\p{L}\s'-]{0,46}$/u;

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId") || request.nextUrl.searchParams.get("user_id") || "";
  const limit = Number(request.nextUrl.searchParams.get("limit") || request.nextUrl.searchParams.get("limit_amount") || 20);
  return respond(userId, limit);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as FetchWordsBody;
  const userId = body.userId || body.user_id || "";
  const limit = Number(body.limit ?? body.limit_amount ?? 20);
  return respond(userId, limit);
}

async function respond(rawUserId: string, rawLimit: number) {
  const userId = rawUserId.trim().slice(0, 128);
  if (!userId) {
    return NextResponse.json({ error: "missing-user" }, { status: 400 });
  }

  const client = createDictionaryClient();
  let payload: AdaptiveWordsPayload;
  try {
    payload = await getAdaptiveWords(userId, rawLimit, client);
  } catch (error) {
    return NextResponse.json(
      { error: "rpc-failed", detail: error instanceof Error ? error.message : "unknown" },
      { status: 500 },
    );
  }

  let generated = 0;
  let source: "dictionary" | "hybrid" = "dictionary";

  if (payload.words.length < MIN_DICTIONARY_FILL) {
    const minted = await generateWords(payload.effective_mastery);
    if (minted.length) {
      generated = await ingestVocabulary(minted, client).catch(() => 0);
      payload = await getAdaptiveWords(userId, rawLimit, client).catch(() => payload);
      if (payload.words.length < MIN_DICTIONARY_FILL) {
        payload = {
          ...payload,
          words: mergeWords(payload.words, minted, rawLimit),
        };
      }
      source = "hybrid";
    }
  }

  return NextResponse.json({
    ...payload,
    generated,
    source,
  });
}

function mergeWords(existing: AdaptiveWordsPayload["words"], minted: GeneratedWord[], limit: number) {
  const seen = new Set(existing.map((word) => word.word_en.toLowerCase()));
  const extra = minted
    .filter((word) => !seen.has(word.word_en.toLowerCase()))
    .map((word, index) => ({
      id: -1 - index,
      word_en: word.word_en,
      translation_fr: word.translation_fr,
      translation_ar: word.translation_ar,
      difficulty_index: word.difficulty_index,
      category: word.category,
      image_url: word.image_url || null,
    }));
  return [...existing, ...extra].slice(0, Math.max(MIN_DICTIONARY_FILL, Math.min(limit, 50)));
}

async function generateWords(mastery: number): Promise<GeneratedWord[]> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return [];

  const prompt = `Generate a JSON array of 20 English words with French and Arabic translations, suitable for a difficulty level of ${mastery} out of 100. Provide standard, commonly used words.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Return JSON only, shape: {"words":[{"word_en":"HOUSE","translation_fr":"maison","translation_ar":"بيت","difficulty_index":5,"category":"home"}]}. English in CAPITAL letters. No explanations.',
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!response.ok) return [];
    const body = (await response.json()) as GroqChatResponse;
    return parseGeneratedWords(body.choices?.[0]?.message?.content || "", mastery);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseGeneratedWords(raw: string, mastery: number): GeneratedWord[] {
  const json = extractJson(raw);
  if (!json) return [];
  const list = Array.isArray(json)
    ? json
    : Array.isArray((json as { words?: unknown }).words)
      ? (json as { words: unknown[] }).words
      : [];

  const unique = new Map<string, GeneratedWord>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const word_en = String(row.word_en || row.en || row.word || "")
      .trim()
      .toUpperCase();
    const translation_fr = String(row.translation_fr || row.fr || "").trim();
    const translation_ar = String(row.translation_ar || row.ar || "").trim();
    if (!WORD_RE.test(word_en) || !translation_fr || !translation_ar) continue;
    unique.set(word_en, {
      word_en,
      translation_fr,
      translation_ar,
      difficulty_index: clampDifficulty(row.difficulty_index, mastery),
      category: String(row.category || "generated").slice(0, 32),
      image_url: null,
    });
    if (unique.size >= GENERATE_BATCH) break;
  }
  return [...unique.values()];
}

function clampDifficulty(value: unknown, mastery: number) {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return Math.max(1, Math.min(100, Math.round(parsed)));
  }
  return Math.max(1, Math.min(100, mastery));
}

function extractJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.search(/[\[{]/);
    const end = Math.max(trimmed.lastIndexOf("]"), trimmed.lastIndexOf("}"));
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}
