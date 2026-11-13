import "server-only";

import { normAnswer } from "@/lib/level0-lessons";

export const BEGINNER_EXAM_ID = "beginner_1" as const;
export const BEGINNER_EXAM_TOTAL = 50;
export const BEGINNER_EXAM_MINUTES = 75;
export const BEGINNER_EXAM_PASS = 25;

export type ExamQuestionKind = "type" | "choice" | "contains";

export type ExamQuestion = {
  id: string;
  part: "A" | "B" | "C" | "D";
  kind: ExamQuestionKind;
  prompt: string;
  hint?: string;
  choices?: string[];
  answers: string[];
  points: number;
};

/** Beginner Exam 1 — Level 0 lessons 1–7 (writing only). /50 */
export const BEGINNER_EXAM_1: ExamQuestion[] = [
  // ── Part A — Fix the sentence (12) · L1–L7 classic mistakes
  {
    id: "a1",
    part: "A",
    kind: "type",
    prompt: "Fix: I have question.",
    answers: ["i have a question"],
    points: 1,
  },
  {
    id: "a2",
    part: "A",
    kind: "type",
    prompt: "Fix: I no understand.",
    answers: ["i don't understand", "i do not understand"],
    points: 1,
  },
  {
    id: "a3",
    part: "A",
    kind: "type",
    prompt: "Fix: Can you repeat again please?",
    answers: ["can you repeat please", "can you repeat", "can you say that again please", "can you say that again"],
    points: 1,
  },
  {
    id: "a4",
    part: "A",
    kind: "type",
    prompt: "Fix: Where you live?",
    answers: ["where do you live"],
    points: 1,
  },
  {
    id: "a5",
    part: "A",
    kind: "type",
    prompt: "Fix: What you do in the morning?",
    answers: ["what do you do in the morning"],
    points: 1,
  },
  {
    id: "a6",
    part: "A",
    kind: "type",
    prompt: "Fix: How is your parents?",
    answers: ["how are your parents"],
    points: 1,
  },
  {
    id: "a7",
    part: "A",
    kind: "type",
    prompt: "Fix: I have 20 years.",
    answers: ["i am 20 years old", "i'm 20 years old", "i am twenty years old", "i'm twenty years old"],
    points: 1,
  },
  {
    id: "a8",
    part: "A",
    kind: "type",
    prompt: "Fix: My name Ahmed.",
    answers: ["my name is ahmed"],
    points: 1,
  },
  {
    id: "a9",
    part: "A",
    kind: "type",
    prompt: "Fix: I am study computer science.",
    answers: ["i study computer science", "i am studying computer science"],
    points: 1,
  },
  {
    id: "a10",
    part: "A",
    kind: "type",
    prompt: "Fix: She don’t wake up early.",
    answers: ["she doesn't wake up early", "she does not wake up early"],
    points: 1,
  },
  {
    id: "a11",
    part: "A",
    kind: "type",
    prompt: "Fix: He go to university every day.",
    answers: ["he goes to university every day"],
    points: 1,
  },
  {
    id: "a12",
    part: "A",
    kind: "type",
    prompt: "Fix: I goed to school yesterday.",
    answers: ["i went to school yesterday"],
    points: 1,
  },

  // ── Part B — Complete / choose (14) · grammar L2–L7
  {
    id: "b1",
    part: "B",
    kind: "choice",
    prompt: "Where ____ you live?",
    choices: ["do", "does", "is"],
    answers: ["do"],
    points: 1,
  },
  {
    id: "b2",
    part: "B",
    kind: "choice",
    prompt: "What ____ she do in the morning?",
    choices: ["do", "does", "is"],
    answers: ["does"],
    points: 1,
  },
  {
    id: "b3",
    part: "B",
    kind: "choice",
    prompt: "How ____ you today?",
    choices: ["do", "does", "are"],
    answers: ["are"],
    points: 1,
  },
  {
    id: "b4",
    part: "B",
    kind: "choice",
    prompt: "____ she study English every day?",
    choices: ["Do", "Does", "Is"],
    answers: ["does"],
    points: 1,
  },
  {
    id: "b5",
    part: "B",
    kind: "choice",
    prompt: "He ____ to university every day.",
    choices: ["go", "goes", "going"],
    answers: ["goes"],
    points: 1,
  },
  {
    id: "b6",
    part: "B",
    kind: "choice",
    prompt: "She doesn’t ____ late.",
    choices: ["wakes", "wake", "waking"],
    answers: ["wake"],
    points: 1,
  },
  {
    id: "b7",
    part: "B",
    kind: "choice",
    prompt: "I ____ to school at 7 AM. (go / goes)",
    choices: ["go", "goes"],
    answers: ["go"],
    points: 1,
  },
  {
    id: "b8",
    part: "B",
    kind: "choice",
    prompt: "She ____ breakfast at 7 AM. (eat / eats)",
    choices: ["eat", "eats"],
    answers: ["eats"],
    points: 1,
  },
  {
    id: "b9",
    part: "B",
    kind: "type",
    prompt: "Complete: I ______ understand. (negative)",
    answers: ["don't", "do not", "i don't", "i do not", "don't understand", "i don't understand"],
    points: 1,
  },
  {
    id: "b10",
    part: "B",
    kind: "type",
    prompt: "Complete: Why ______ you study English?",
    answers: ["do", "why do you study english"],
    points: 1,
  },
  {
    id: "b11",
    part: "B",
    kind: "type",
    prompt: "Past form: go →",
    answers: ["went"],
    points: 1,
  },
  {
    id: "b12",
    part: "B",
    kind: "type",
    prompt: "Past form: eat →",
    answers: ["ate"],
    points: 1,
  },
  {
    id: "b13",
    part: "B",
    kind: "choice",
    prompt: "I ____ to school yesterday.",
    choices: ["go", "went", "goed"],
    answers: ["went"],
    points: 1,
  },
  {
    id: "b14",
    part: "B",
    kind: "choice",
    prompt: "She did not ____ to school. (go / went)",
    choices: ["go", "went", "goes"],
    answers: ["go"],
    points: 1,
  },

  // ── Part C — Personal production (12) · intro + routine + past
  {
    id: "c1",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence: your name. (My name is …)",
    hint: "Must include name",
    answers: ["my name", "name is", "i am"],
    points: 1,
  },
  {
    id: "c2",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence: your age. (I am … years old.)",
    hint: "years old / I am",
    answers: ["years old", "i am", "i'm"],
    points: 1,
  },
  {
    id: "c3",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence: where you are from. (I am from …)",
    hint: "from",
    answers: ["from", "i am from", "i'm from"],
    points: 1,
  },
  {
    id: "c4",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence: where you live. (I live in …)",
    hint: "live",
    answers: ["live", "i live"],
    points: 1,
  },
  {
    id: "c5",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence: what you study or do. (I study … / I work …)",
    hint: "study / work / student",
    answers: ["study", "work", "student", "i am a", "i'm a"],
    points: 1,
  },
  {
    id: "c6",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence: your English goal. (My goal is … / I want to …)",
    hint: "english / goal / improve / want",
    answers: ["english", "goal", "improve", "want"],
    points: 1,
  },
  {
    id: "c7",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence about the morning (present simple).",
    hint: "wake / eat / go / morning",
    answers: ["wake", "eat", "go", "morning", "breakfast", "get up"],
    points: 1,
  },
  {
    id: "c8",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence about the afternoon or evening (present simple).",
    hint: "study / play / watch / evening / afternoon",
    answers: ["study", "play", "watch", "afternoon", "evening", "homework", "family"],
    points: 1,
  },
  {
    id: "c9",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence about night / before bed (present simple).",
    hint: "night / sleep / review / watch",
    answers: ["night", "sleep", "review", "watch", "bed", "lesson"],
    points: 1,
  },
  {
    id: "c10",
    part: "C",
    kind: "contains",
    prompt: "Write 1 WH question with Where (about you or your life).",
    hint: "Must include where",
    answers: ["where"],
    points: 1,
  },
  {
    id: "c11",
    part: "C",
    kind: "contains",
    prompt: "Write 1 sentence about YESTERDAY (past simple).",
    hint: "yesterday / last / went / ate / watched…",
    answers: ["yesterday", "last", "went", "ate", "watched", "played", "studied", "had", "saw"],
    points: 1,
  },
  {
    id: "c12",
    part: "C",
    kind: "contains",
    prompt: "Write 1 negative past sentence (I did not … / I didn’t …).",
    hint: "did not / didn't",
    answers: ["did not", "didn't", "didnt"],
    points: 1,
  },

  // ── Part D — Class English, WH, present, past mix (12)
  {
    id: "d1",
    part: "D",
    kind: "type",
    prompt: "Translate into English: j’ai une question / لدي سؤال",
    answers: ["i have a question", "i've a question", "i have got a question"],
    points: 1,
  },
  {
    id: "d2",
    part: "D",
    kind: "type",
    prompt: "What do you say if you want the teacher to repeat?",
    answers: ["can you repeat", "can you repeat please", "can you repeat?", "sorry can you repeat", "can you say that again"],
    points: 1,
  },
  {
    id: "d3",
    part: "D",
    kind: "type",
    prompt: "Answer: Do you understand?",
    answers: ["yes i do", "yes i understand", "yes i do understand", "yes"],
    points: 1,
  },
  {
    id: "d4",
    part: "D",
    kind: "contains",
    prompt: "Make a sentence with the verb “need”.",
    hint: "Must include need",
    answers: ["need"],
    points: 1,
  },
  {
    id: "d5",
    part: "D",
    kind: "type",
    prompt: "Ask when someone wakes up.",
    answers: ["when do you wake up", "when do you wake up?"],
    points: 1,
  },
  {
    id: "d6",
    part: "D",
    kind: "type",
    prompt: "Correct: I want improve my English.",
    answers: ["i want to improve my english"],
    points: 1,
  },
  {
    id: "d7",
    part: "D",
    kind: "type",
    prompt: "Correct: I am a engineer.",
    answers: ["i am an engineer", "i'm an engineer"],
    points: 1,
  },
  {
    id: "d8",
    part: "D",
    kind: "type",
    prompt: "Correct: Does she studies English?",
    answers: ["does she study english"],
    points: 1,
  },
  {
    id: "d9",
    part: "D",
    kind: "type",
    prompt: "Correct: I goes to school at 8 AM.",
    answers: ["i go to school at 8 am", "i go to school at 8"],
    points: 1,
  },
  {
    id: "d10",
    part: "D",
    kind: "type",
    prompt: "Correct: She did not went to school.",
    answers: ["she did not go to school", "she didn't go to school"],
    points: 1,
  },
  {
    id: "d11",
    part: "D",
    kind: "type",
    prompt: "Make a question: you / go / school / yesterday",
    answers: ["did you go to school yesterday", "did you go to school yesterday?"],
    points: 1,
  },
  {
    id: "d12",
    part: "D",
    kind: "type",
    prompt: "I ______ (watch) TV last night.",
    answers: ["watched"],
    points: 1,
  },
];

export type ExamItemResult = {
  id: string;
  part: ExamQuestion["part"];
  prompt: string;
  kind: ExamQuestionKind;
  given: string;
  correct: boolean;
  expected: string[];
  points: number;
  earned: number;
};

export function examQuestionPublic(q: ExamQuestion) {
  return {
    id: q.id,
    part: q.part,
    kind: q.kind,
    prompt: q.prompt,
    hint: q.hint,
    choices: q.choices,
    points: q.points,
  };
}

export function gradeExamAnswer(item: ExamQuestion, raw: string): boolean {
  const got = normAnswer(raw);
  if (!got) return false;
  if (item.kind === "contains") {
    return item.answers.some((needle) => got.includes(normAnswer(needle)));
  }
  if (item.kind === "choice") {
    return item.answers.some((ok) => got === normAnswer(ok));
  }
  return item.answers.some((ok) => {
    const want = normAnswer(ok);
    if (!want) return false;
    if (got === want) return true;
    return want.length >= 4 && got.includes(want);
  });
}

export function gradeBeginnerExam(answers: Record<string, string>) {
  const items: ExamItemResult[] = BEGINNER_EXAM_1.map((q) => {
    const given = String(answers[q.id] ?? "");
    const correct = gradeExamAnswer(q, given);
    return {
      id: q.id,
      part: q.part,
      prompt: q.prompt,
      kind: q.kind,
      given,
      correct,
      expected: q.answers,
      points: q.points,
      earned: correct ? q.points : 0,
    };
  });
  const score = items.reduce((sum, row) => sum + row.earned, 0);
  const total = BEGINNER_EXAM_TOTAL;
  return { score, total, items, passed: score >= BEGINNER_EXAM_PASS };
}

export function motivationalMessage(score: number, total: number, locale: "en" | "fr" | "ar" = "en") {
  const pct = total ? score / total : 0;
  if (locale === "fr") {
    if (pct >= 0.85) return "Excellent travail. Tu as vraiment compris les leçons 1 à 7. Continue comme ça.";
    if (pct >= 0.7) return "Très bien. Tu progresses clairement. Corrige les petites erreurs et tu seras encore plus fort.";
    if (pct >= 0.5) return "Bon début. Tu as compris l’essentiel. Relis la correction en rouge et vert, puis révise demain.";
    return "Ce n’est qu’un premier examen. Regarde la correction, note 5 erreurs, et tu avanceras vite. On croit en toi.";
  }
  if (locale === "ar") {
    if (pct >= 0.85) return "عمل ممتاز. لقد فهمت الدروس من 1 إلى 7 جيداً. واصل بهذا المستوى.";
    if (pct >= 0.7) return "جيد جداً. أنت تتقدم بوضوح. صحّح الأخطاء الصغيرة وستكون أقوى.";
    if (pct >= 0.5) return "بداية جيدة. راجِع التصحيح بالأحمر والأخضر ثم راجع غداً.";
    return "هذا أول امتحان فقط. انظر التصحيح، سجّل 5 أخطاء، وستتقدم بسرعة.";
  }
  if (pct >= 0.85) return "Outstanding work. You really understood lessons 1–7. Keep this fire.";
  if (pct >= 0.7) return "Strong result. You are progressing clearly. Fix the small errors and you will be even stronger.";
  if (pct >= 0.5) return "Good start. You understood the core. Read the red and green correction, then review tomorrow.";
  return "This is only the first exam. Study the correction, write down 5 mistakes, and you will rise fast. We believe in you.";
}

// Sanity: bank length must match total
if (BEGINNER_EXAM_1.length !== BEGINNER_EXAM_TOTAL) {
  throw new Error(`Beginner exam bank length ${BEGINNER_EXAM_1.length} !== TOTAL ${BEGINNER_EXAM_TOTAL}`);
}
