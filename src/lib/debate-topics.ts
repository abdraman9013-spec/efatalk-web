import { ADVANCED_TOPICS } from "@/lib/advanced-topics";
import { DEBATE_TOPICS, type DebateTopic } from "@/lib/intermediate-topics";
import { academyDateStamp } from "@/lib/whatsapp-groups";

export type DebateLevel = "intermediate" | "advanced";

export type DebateTopicRow = {
  id: string;
  level: DebateLevel;
  title_en: string;
  title_fr: string;
  title_ar: string;
  questions: DebateTopic["questions"];
  sort_order: number;
  active: boolean;
};

export function fallbackCatalog(level: DebateLevel): DebateTopic[] {
  return level === "advanced" ? ADVANCED_TOPICS : DEBATE_TOPICS;
}

export function topicToRow(level: DebateLevel, topic: DebateTopic, index: number): DebateTopicRow {
  return {
    id: topic.id,
    level,
    title_en: topic.title.en,
    title_fr: topic.title.fr,
    title_ar: topic.title.ar,
    questions: topic.questions,
    sort_order: index + 1,
    active: true,
  };
}

export function seedRows(): DebateTopicRow[] {
  return [
    ...DEBATE_TOPICS.map((topic, index) => topicToRow("intermediate", topic, index)),
    ...ADVANCED_TOPICS.map((topic, index) => topicToRow("advanced", topic, index)),
  ];
}

export function rowToTopic(row: DebateTopicRow): DebateTopic {
  const questions = Array.isArray(row.questions)
    ? row.questions
        .map((item) => ({
          en: String(item?.en || "").trim(),
          fr: String(item?.fr || item?.en || "").trim(),
          ar: String(item?.ar || item?.en || "").trim(),
        }))
        .filter((item) => item.en)
    : [];
  return {
    id: row.id,
    title: {
      en: row.title_en,
      fr: row.title_fr || row.title_en,
      ar: row.title_ar || row.title_en,
    },
    questions,
  };
}

export function parseTopicRows(data: unknown, level: DebateLevel): DebateTopic[] {
  if (!Array.isArray(data) || !data.length) return fallbackCatalog(level);
  const mapped = (data as DebateTopicRow[])
    .filter((row) => row.active !== false)
    .map(rowToTopic)
    .filter((topic) => topic.title.en && topic.questions.length);
  return mapped.length ? mapped : fallbackCatalog(level);
}

export function shuffleTopics<T extends { id: string }>(items: T[], seed: string): T[] {
  const copy = [...items];
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619);
  }
  for (let i = copy.length - 1; i > 0; i -= 1) {
    hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
    const j = Math.abs(hash) % (i + 1);
    const current = copy[i];
    copy[i] = copy[j];
    copy[j] = current;
  }
  return copy;
}

export function dailyTopicOrder<T extends { id: string }>(items: T[], extra = "") {
  return shuffleTopics(items, `${academyDateStamp()}:${extra}`);
}

export function isDebateLevel(value: string | null | undefined): value is DebateLevel {
  return value === "intermediate" || value === "advanced";
}
