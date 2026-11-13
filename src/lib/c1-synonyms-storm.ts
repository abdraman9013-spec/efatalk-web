export type StormWord = {
  id: number;
  word: string;
  options: string[];
  correctAnswerIndex: number;
  definition: string;
};

export type StormRun = {
  queue: StormWord[];
  playedIds: Set<number>;
};

export const STORM_ROUND_MS = 10000;
export const STORM_FAST_MS = 5000;
export const STORM_HIGH_SCORE_KEY = "efaa_c1_synonyms_storm_highscore";

export const C1_SYNONYMS_STORM: StormWord[] = [
  { id: 1, word: "benefit", options: ["advantage", "problem", "mistake", "delay"], correctAnswerIndex: 0, definition: "A good result you get from something." },
  { id: 2, word: "challenge", options: ["holiday", "difficulty", "gift", "joke"], correctAnswerIndex: 1, definition: "Something hard that you must try to do." },
  { id: 3, word: "improve", options: ["break", "forget", "get better", "give up"], correctAnswerIndex: 2, definition: "To become better than before." },
  { id: 4, word: "opportunity", options: ["danger", "excuse", "habit", "chance"], correctAnswerIndex: 3, definition: "A good moment to do something useful." },
  { id: 5, word: "responsible", options: ["in charge", "lazy", "lost", "late"], correctAnswerIndex: 0, definition: "Having the job of taking care of something." },
  { id: 6, word: "confident", options: ["afraid", "sure of yourself", "confused", "tired"], correctAnswerIndex: 1, definition: "Feeling sure that you can do it." },
  { id: 7, word: "essential", options: ["optional", "extra", "necessary", "rare"], correctAnswerIndex: 2, definition: "Something you really need." },
  { id: 8, word: "advice", options: ["order", "punishment", "secret", "suggestion"], correctAnswerIndex: 3, definition: "An idea to help someone decide." },
  { id: 9, word: "affect", options: ["influence", "ignore", "copy", "hide"], correctAnswerIndex: 0, definition: "To change how someone or something feels or works." },
  { id: 10, word: "achieve", options: ["fail", "succeed", "wait", "guess"], correctAnswerIndex: 1, definition: "To reach a goal after trying." },
  { id: 11, word: "avoid", options: ["invite", "repeat", "stay away from", "celebrate"], correctAnswerIndex: 2, definition: "To keep away from something." },
  { id: 12, word: "consider", options: ["forget", "refuse", "shout", "think about"], correctAnswerIndex: 3, definition: "To think carefully before you decide." },
  { id: 13, word: "contribute", options: ["add to", "take away", "cancel", "borrow"], correctAnswerIndex: 0, definition: "To give something that helps a group." },
  { id: 14, word: "encourage", options: ["stop", "support", "blame", "confuse"], correctAnswerIndex: 1, definition: "To give someone confidence to continue." },
  { id: 15, word: "expect", options: ["hide", "forget", "think it will happen", "refuse"], correctAnswerIndex: 2, definition: "To believe something will happen." },
  { id: 16, word: "explain", options: ["hide", "guess", "copy", "make clear"], correctAnswerIndex: 3, definition: "To make an idea easy to understand." },
  { id: 17, word: "focus", options: ["concentrate", "sleep", "wander", "delay"], correctAnswerIndex: 0, definition: "To give all your attention to one thing." },
  { id: 18, word: "increase", options: ["reduce", "go up", "stop", "split"], correctAnswerIndex: 1, definition: "To become bigger in number or size." },
  { id: 19, word: "mention", options: ["hide", "delete", "talk about", "ignore"], correctAnswerIndex: 2, definition: "To say something quickly in a conversation." },
  { id: 20, word: "prefer", options: ["hate", "forget", "refuse", "like more"], correctAnswerIndex: 3, definition: "To like one thing more than another." },
  { id: 21, word: "prevent", options: ["stop from happening", "start", "invite", "repeat"], correctAnswerIndex: 0, definition: "To stop something before it happens." },
  { id: 22, word: "provide", options: ["remove", "give", "lose", "break"], correctAnswerIndex: 1, definition: "To give what someone needs." },
  { id: 23, word: "realize", options: ["forget", "guess", "understand", "copy"], correctAnswerIndex: 2, definition: "To suddenly understand something." },
  { id: 24, word: "reduce", options: ["grow", "add", "double", "make smaller"], correctAnswerIndex: 3, definition: "To make something less." },
  { id: 25, word: "refuse", options: ["say no", "accept", "invite", "agree"], correctAnswerIndex: 0, definition: "To not accept something." },
  { id: 26, word: "require", options: ["ignore", "need", "hide", "delay"], correctAnswerIndex: 1, definition: "To need something in order to work." },
  { id: 27, word: "support", options: ["attack", "block", "help", "forget"], correctAnswerIndex: 2, definition: "To help someone succeed." },
  { id: 28, word: "suggest", options: ["order", "hide", "cancel", "propose"], correctAnswerIndex: 3, definition: "To offer an idea." },
  { id: 29, word: "survive", options: ["stay alive", "give up", "disappear", "sleep"], correctAnswerIndex: 0, definition: "To continue to live or exist." },
  { id: 30, word: "worry", options: ["relax", "feel anxious", "celebrate", "ignore"], correctAnswerIndex: 1, definition: "To feel nervous about a problem." },
  { id: 31, word: "available", options: ["busy", "closed", "ready to use", "broken"], correctAnswerIndex: 2, definition: "Ready if you need it." },
  { id: 32, word: "common", options: ["rare", "secret", "strange", "usual"], correctAnswerIndex: 3, definition: "Happening often, not special." },
  { id: 33, word: "current", options: ["happening now", "old", "future", "lost"], correctAnswerIndex: 0, definition: "Of the present time." },
  { id: 34, word: "efficient", options: ["slow", "working well", "messy", "noisy"], correctAnswerIndex: 1, definition: "Doing a job well without wasting time." },
  { id: 35, word: "famous", options: ["unknown", "quiet", "well-known", "hidden"], correctAnswerIndex: 2, definition: "Known by many people." },
  { id: 36, word: "flexible", options: ["fixed", "hard", "broken", "able to change"], correctAnswerIndex: 3, definition: "Able to change when needed." },
  { id: 37, word: "global", options: ["worldwide", "local", "tiny", "private"], correctAnswerIndex: 0, definition: "About the whole world." },
  { id: 38, word: "independent", options: ["dependent", "free", "lost", "weak"], correctAnswerIndex: 1, definition: "Able to do things without help." },
  { id: 39, word: "limited", options: ["endless", "huge", "not enough", "open"], correctAnswerIndex: 2, definition: "Not as much as you want." },
  { id: 40, word: "major", options: ["tiny", "weak", "secret", "important"], correctAnswerIndex: 3, definition: "Very important or large." },
  { id: 41, word: "official", options: ["approved", "fake", "private", "random"], correctAnswerIndex: 0, definition: "Accepted by an organization or government." },
  { id: 42, word: "previous", options: ["next", "before", "current", "never"], correctAnswerIndex: 1, definition: "Happening before now." },
  { id: 43, word: "regular", options: ["strange", "once", "usual", "broken"], correctAnswerIndex: 2, definition: "Happening often in the same way." },
  { id: 44, word: "similar", options: ["opposite", "unique", "empty", "almost the same"], correctAnswerIndex: 3, definition: "Almost the same as something else." },
  { id: 45, word: "useful", options: ["helpful", "useless", "heavy", "silent"], correctAnswerIndex: 0, definition: "Able to help you do a job." },
  { id: 46, word: "willing", options: ["angry", "ready to do it", "busy", "lost"], correctAnswerIndex: 1, definition: "Happy to do something if asked." },
  { id: 47, word: "compare", options: ["hide", "copy", "look at differences", "destroy"], correctAnswerIndex: 2, definition: "To see how two things are different or the same." },
  { id: 48, word: "decide", options: ["wait", "guess", "sleep", "choose"], correctAnswerIndex: 3, definition: "To make a choice." },
  { id: 49, word: "include", options: ["contain", "remove", "forget", "close"], correctAnswerIndex: 0, definition: "To have something as part of a group." },
  { id: 50, word: "notice", options: ["miss", "see", "hide", "invent"], correctAnswerIndex: 1, definition: "To see or become aware of something." },
  { id: 51, word: "respect", options: ["insult", "ignore", "value", "fear"], correctAnswerIndex: 2, definition: "To treat someone as important." },
  { id: 52, word: "result", options: ["start", "plan", "question", "outcome"], correctAnswerIndex: 3, definition: "What happens at the end." },
  { id: 53, word: "waste", options: ["use badly", "save", "create", "share"], correctAnswerIndex: 0, definition: "To use time or money in a bad way." },
  { id: 54, word: "worth", options: ["empty", "value", "noise", "delay"], correctAnswerIndex: 1, definition: "How useful or valuable something is." },
  { id: 55, word: "argue", options: ["agree", "smile", "disagree", "wait"], correctAnswerIndex: 2, definition: "To speak against someone’s idea." },
  { id: 56, word: "cause", options: ["end", "copy", "pause", "reason"], correctAnswerIndex: 3, definition: "The thing that makes something happen." },
  { id: 57, word: "create", options: ["make", "destroy", "hide", "borrow"], correctAnswerIndex: 0, definition: "To make something new." },
  { id: 58, word: "depend", options: ["refuse", "rely", "lead", "forget"], correctAnswerIndex: 1, definition: "To need someone or something for support." },
  { id: 59, word: "fail", options: ["win", "start", "not succeed", "help"], correctAnswerIndex: 2, definition: "To not reach the result you wanted." },
  { id: 60, word: "involve", options: ["exclude", "finish", "hide", "take part"], correctAnswerIndex: 3, definition: "To make someone part of an activity." },
  { id: 61, word: "legal", options: ["allowed by law", "secret", "dangerous", "private"], correctAnswerIndex: 0, definition: "Allowed by the law." },
  { id: 62, word: "typical", options: ["strange", "usual", "unique", "broken"], correctAnswerIndex: 1, definition: "Normal for that person or situation." },
  { id: 63, word: "threaten", options: ["protect", "invite", "put in danger", "thank"], correctAnswerIndex: 2, definition: "To say or show that something bad may happen." },
  { id: 64, word: "reliable", options: ["late", "weak", "random", "can be trusted"], correctAnswerIndex: 3, definition: "Someone or something you can trust." },
  { id: 65, word: "patient", options: ["able to wait", "angry", "rushed", "noisy"], correctAnswerIndex: 0, definition: "Able to wait without getting angry." },
  { id: 66, word: "organize", options: ["mix up", "arrange", "lose", "delay"], correctAnswerIndex: 1, definition: "To plan and put things in order." },
];

export function shuffleStormDeck<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = copy[i];
    const swap = copy[j];
    if (current === undefined || swap === undefined) continue;
    copy[i] = swap;
    copy[j] = current;
  }
  return copy;
}

export function presentStormCard(card: StormWord): StormWord {
  const pairs = card.options.map((option, index) => ({
    option,
    correct: index === card.correctAnswerIndex,
  }));
  const shuffled = shuffleStormDeck(pairs);
  return {
    ...card,
    options: shuffled.map((pair) => pair.option),
    correctAnswerIndex: shuffled.findIndex((pair) => pair.correct),
  };
}

export function startStormRun(deck: readonly StormWord[] = C1_SYNONYMS_STORM): StormRun {
  return { queue: shuffleStormDeck(deck), playedIds: new Set() };
}

export function dealNextStormWord(
  run: StormRun,
  deck: readonly StormWord[] = C1_SYNONYMS_STORM,
): { card: StormWord; run: StormRun } {
  let queue = run.queue;
  let playedIds = run.playedIds;
  if (queue.length === 0) {
    const unused = deck.filter((word) => !playedIds.has(word.id));
    if (unused.length === 0) {
      playedIds = new Set();
      queue = shuffleStormDeck(deck);
    } else {
      queue = shuffleStormDeck(unused);
    }
  }
  const next = queue[0] ?? shuffleStormDeck(deck)[0];
  if (!next) {
    throw new Error("C1 Synonyms Storm deck is empty");
  }
  return {
    card: presentStormCard(next),
    run: {
      queue: queue.slice(1),
      playedIds: new Set(playedIds).add(next.id),
    },
  };
}

export function scoreStormHit(elapsedMs: number, combo: number): { combo: number; gained: number } {
  if (elapsedMs < STORM_FAST_MS) {
    const nextCombo = combo <= 0 ? 2 : combo + 1;
    return { combo: nextCombo, gained: nextCombo };
  }
  return { combo: 0, gained: 1 };
}

export function readStormHighScore(): number {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(STORM_HIGH_SCORE_KEY));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function writeStormHighScore(score: number): number {
  const next = Math.max(readStormHighScore(), Math.max(0, Math.floor(score)));
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORM_HIGH_SCORE_KEY, String(next));
  }
  return next;
}
