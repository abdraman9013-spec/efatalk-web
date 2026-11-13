import type { Level0Lesson } from "@/lib/level0-lessons";

export const LEVEL1_LESSONS: Level0Lesson[] = [
  {
    n: 1,
    title: "Revision — 3 tenses",
    summary:
      "First day Level 1. Present simple, past simple, present continuous. Affirmative, negative, question.",
    youtubeId: "-h9Z_4lnXUM",
    quiz: [
      { id: "r1-1", kind: "type", prompt: "What tense? I wake up at 6 AM every day.", answers: ["present simple", "simple present"] },
      { id: "r1-2", kind: "type", prompt: "What tense? I went to school yesterday.", answers: ["past simple", "simple past"] },
      { id: "r1-3", kind: "type", prompt: "What tense? I am sitting in class now.", answers: ["present continuous", "present progressive"] },
      { id: "r1-4", kind: "type", prompt: "I ______ (study) English every day.", answers: ["study"] },
      { id: "r1-5", kind: "type", prompt: "He ______ (go) to school every day.", answers: ["goes"] },
      { id: "r1-6", kind: "type", prompt: "She ______ (not / like) coffee.", answers: ["does not like", "doesn't like"] },
      { id: "r1-7", kind: "type", prompt: "______ you live in Chad? (present simple)", answers: ["do"] },
      { id: "r1-8", kind: "type", prompt: "I ______ (go) to school yesterday.", answers: ["went"] },
      { id: "r1-9", kind: "type", prompt: "She ______ (eat) breakfast yesterday.", answers: ["ate"] },
      { id: "r1-10", kind: "type", prompt: "I did not ______ (watch) TV last night.", answers: ["watch"] },
      { id: "r1-11", kind: "type", prompt: "______ she study English yesterday?", answers: ["did"] },
      { id: "r1-12", kind: "type", prompt: "I ______ (study) English now.", answers: ["am studying"] },
      { id: "r1-13", kind: "type", prompt: "They ______ (play) football at the moment.", answers: ["are playing"] },
      { id: "r1-14", kind: "type", prompt: "She ______ (not / cook) now.", answers: ["is not cooking", "isn't cooking"] },
      { id: "r1-15", kind: "type", prompt: "Add -ing: study →", answers: ["studying"] },
      { id: "r1-16", kind: "type", prompt: "Add -ing: sit →", answers: ["sitting"] },
      { id: "r1-17", kind: "type", prompt: "Past form: go →", answers: ["went"] },
      { id: "r1-18", kind: "type", prompt: "Correct: I am wake up at 6 AM every day.", answers: ["i wake up at 6 am every day", "i wake up at 6 every day"] },
    ],
    speak: [
      { emoji: "☀️", phrase: "I study English every day." },
      { emoji: "📅", phrase: "I went to school yesterday." },
      { emoji: "🟢", phrase: "I am learning English now." },
      { emoji: "❓", phrase: "Did she eat breakfast?" },
      { emoji: "🗣️", phrase: "Are they playing football?" },
    ],
    test: [
      { id: "t1-1", kind: "type", prompt: "Negative: I study English every day.", answers: ["i do not study english every day", "i don't study english every day"] },
      { id: "t1-2", kind: "type", prompt: "Question: I study English every day.", answers: ["do i study english every day"] },
      { id: "t1-3", kind: "type", prompt: "Negative: She goes to school every morning.", answers: ["she does not go to school every morning", "she doesn't go to school every morning"] },
      { id: "t1-4", kind: "type", prompt: "Question: She goes to school every morning.", answers: ["does she go to school every morning"] },
      { id: "t1-5", kind: "type", prompt: "Negative: They played football yesterday.", answers: ["they did not play football yesterday", "they didn't play football yesterday"] },
      { id: "t1-6", kind: "type", prompt: "Question: they / play / football / yesterday", answers: ["did they play football yesterday"] },
      { id: "t1-7", kind: "type", prompt: "Negative: He went to the market.", answers: ["he did not go to the market", "he didn't go to the market"] },
      { id: "t1-8", kind: "type", prompt: "Question: he / go / to school / yesterday", answers: ["did he go to school yesterday"] },
      { id: "t1-9", kind: "type", prompt: "Negative: I am studying now.", answers: ["i am not studying now", "i'm not studying now"] },
      { id: "t1-10", kind: "type", prompt: "Question: she / cook / now", answers: ["is she cooking now"] },
      { id: "t1-11", kind: "type", prompt: "Question: they / play / at the moment", answers: ["are they playing at the moment"] },
      { id: "t1-12", kind: "type", prompt: "I ______ English every day. (study / am studying / studied)", answers: ["study"] },
      { id: "t1-13", kind: "type", prompt: "I ______ English now. (study / am studying / studied)", answers: ["am studying"] },
      { id: "t1-14", kind: "type", prompt: "I ______ English yesterday. (study / am studying / studied)", answers: ["studied"] },
      { id: "t1-15", kind: "type", prompt: "He ______ to school now. (goes / is going / went)", answers: ["is going"] },
      { id: "t1-16", kind: "type", prompt: "Correct: She don't went to school yesterday.", answers: ["she did not go to school yesterday", "she didn't go to school yesterday"] },
      { id: "t1-17", kind: "type", prompt: "Correct: I am study English every day.", answers: ["i study english every day"] },
      { id: "t1-18", kind: "type", prompt: "Correct: He go to school now.", answers: ["he is going to school now"] },
      { id: "t1-19", kind: "type", prompt: "Correct: They is playing football at the moment.", answers: ["they are playing football at the moment"] },
      { id: "t1-20", kind: "type", prompt: "Correct: Did she ate breakfast?", answers: ["did she eat breakfast"] },
      { id: "t1-21", kind: "type", prompt: "Past form: take →", answers: ["took"] },
      { id: "t1-22", kind: "type", prompt: "Past form: see →", answers: ["saw"] },
      { id: "t1-23", kind: "type", prompt: "Add -ing: make →", answers: ["making"] },
      { id: "t1-24", kind: "type", prompt: "Add -ing: run →", answers: ["running"] },
    ],
  },
];

export function lesson1ByN(n: number) {
  return LEVEL1_LESSONS.find((row) => row.n === n) || null;
}
