import { canCaptureMic, capturePcm, encodeWav } from "@/lib/speech-pcm";
import { transcribeLocal } from "@/lib/whisper-local";

export function normalizeSpeech(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string) {
  return normalizeSpeech(text).split(" ").filter(Boolean);
}

function levenshtein(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const grid = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) grid[i][0] = i;
  for (let j = 0; j < cols; j += 1) grid[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      grid[i][j] = Math.min(grid[i - 1][j] + 1, grid[i][j - 1] + 1, grid[i - 1][j - 1] + cost);
    }
  }
  return grid[a.length][b.length];
}

function closeEnough(heard: string, expected: string) {
  if (heard === expected) return true;
  const limit = expected.length <= 3 ? 1 : expected.length <= 6 ? 2 : 3;
  if (Math.abs(heard.length - expected.length) > limit + 1) return false;
  return levenshtein(heard, expected) <= limit;
}

const ALIASES: Record<string, string[]> = {
  good: ["good", "god", "gud"],
  evening: ["evening", "evenin", "evenning", "evenig", "evenings"],
  everyone: ["everyone", "everybody", "evryone", "every", "everyones"],
  how: ["how", "hao"],
  are: ["are", "r"],
  you: ["you", "u", "ya"],
  doing: ["doing", "doin", "dooing"],
  name: ["name", "nam"],
  here: ["here", "hear"],
  learn: ["learn", "lern"],
  years: ["years", "year"],
  old: ["old"],
  speak: ["speak", "speek"],
  english: ["english", "inglish"],
  fluently: ["fluently", "fluent"],
  favorite: ["favorite", "favourite"],
  color: ["color", "colour"],
  like: ["like", "lik"],
  football: ["football", "soccer"],
  practice: ["practice", "practise", "pratis"],
  improve: ["improve", "improv"],
  with: ["with"],
  have: ["have", "has", "hav", "haf"],
  question: ["question", "questions", "kwestion", "queston", "quistion"],
  hello: ["hello", "hallo", "helo", "hi", "hellow"],
  thanks: ["thanks", "thank", "tanks", "thx", "thankyou"],
  thank: ["thank", "thanks"],
  nice: ["nice", "nais", "ice"],
  meet: ["meet", "met", "meat"],
  where: ["where", "were", "wear"],
  from: ["from", "form"],
  what: ["what", "wat", "whats"],
  your: ["your", "youre", "ur"],
  iam: ["iam", "im"],
};

function wordHeard(heardTokens: string[], expected: string) {
  const options = ALIASES[expected] || [expected];
  if (heardTokens.some((token) => options.some((opt) => closeEnough(token, opt)))) return true;
  if (expected === "everyone" && heardTokens.includes("every") && heardTokens.includes("one")) return true;
  return false;
}

export function speechMatches(transcript: string, target: string, flexible: string[] = []) {
  const heard = normalizeSpeech(transcript);
  if (!heard) return { ok: false, score: 0 };

  const expected = normalizeSpeech(target);
  const distance = levenshtein(heard, expected);
  const ratio = 1 - distance / Math.max(heard.length, expected.length, 1);

  const flex = new Set(flexible.flatMap((value) => tokens(value)));
  const needed = tokens(expected).filter((word) => word.length > 2 && !flex.has(word));
  const heardTokens = tokens(heard);
  const hits = needed.filter((word) => wordHeard(heardTokens, word)).length;
  const recall = needed.length ? hits / needed.length : 0;
  const almostAll = needed.length > 0 && hits >= Math.max(1, needed.length - 1);
  const ok =
    ratio >= 0.2 ||
    recall >= 0.3 ||
    almostAll ||
    (needed.length >= 3 && hits >= 2) ||
    (needed.length <= 3 && hits >= 1) ||
    (heardTokens.length > 0 && needed.some((word) => wordHeard(heardTokens, word)));
  return { ok, score: Math.max(ratio, recall) };
}

type RecognitionCtor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionEngine(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const speech = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return speech.SpeechRecognition || speech.webkitSpeechRecognition || null;
}

export function canRecognizeSpeech() {
  return canCaptureMic();
}

function stopSpeechPlayback() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

async function transcribeServer(blob: Blob) {
  try {
    const body = new FormData();
    body.append("file", blob, "speech.wav");
    const response = await fetch("/api/stt", { method: "POST", body });
    if (response.status === 503) return "";
    if (!response.ok) return "";
    const data = (await response.json()) as { text?: string };
    return (data.text || "").trim();
  } catch {
    return "";
  }
}

export type ListenResult = {
  ok: boolean;
  transcript: string;
  reason?: "unsupported" | "denied" | "empty" | "mismatch";
};

function phraseHits(text: string, target: string, flexible: string[], extraTargets: string[]) {
  if (speechMatches(text, target, flexible).ok) return true;
  return extraTargets.some((line) => speechMatches(text, line, flexible).ok);
}

/** Tap-handler entry. Live Web Speech first; PCM/STT only if nothing is heard. Accepts as soon as the phrase matches. */
export async function listenForPhrase(
  target: string,
  flexible: string[] = [],
  timeoutMs = 14000,
  onTranscript?: (text: string) => void,
  extraTargets: string[] = [],
): Promise<ListenResult> {
  if (!canCaptureMic() && !recognitionEngine()) {
    return { ok: false, transcript: "", reason: "unsupported" };
  }
  stopSpeechPlayback();

  const waitMs = Math.min(16000, Math.max(8000, timeoutMs));
  const deadline = Date.now() + waitMs;
  let latest = "";
  let settled = false;
  let pcmStarted = false;
  let transcribing = false;
  const pcmAbort = new AbortController();
  let rec: SpeechRecognitionLike | null = null;
  let hardStop = 0;
  let pcmDelay = 0;

  const abortSpeech = () => {
    if (!rec) return;
    rec.onresult = null;
    rec.onerror = null;
    rec.onend = null;
    try {
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    rec = null;
  };

  return new Promise<ListenResult>((resolve) => {
    const finish = (result: ListenResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(hardStop);
      window.clearTimeout(pcmDelay);
      window.removeEventListener("pagehide", onHide);
      pcmAbort.abort();
      abortSpeech();
      resolve(result);
    };

    const consider = (text: string) => {
      const next = text.trim();
      if (!next) return;
      latest = next;
      onTranscript?.(next);
      if (phraseHits(next, target, flexible, extraTargets)) {
        finish({ ok: true, transcript: next });
      }
    };

    const onHide = () => {
      if (!settled) finish(pack(latest));
    };

    const pack = (text: string): ListenResult => {
      const transcript = text.trim();
      if (!transcript) return { ok: false, transcript: "", reason: "empty" };
      const ok = phraseHits(transcript, target, flexible, extraTargets);
      return { ok, transcript, reason: ok ? undefined : "mismatch" };
    };

    const transcribeClip = async (samples: Float32Array, sampleRate: number, peak: number, allowLocal: boolean) => {
      if (settled || transcribing) return;
      if (peak < 0.012 || samples.length < 1600) return;
      transcribing = true;
      try {
        const wav = encodeWav(samples, sampleRate);
        let text = await transcribeServer(wav);
        if (!text && allowLocal) text = await transcribeLocal(samples, sampleRate);
        if (!settled && text) consider(text);
      } catch {
        /* keep listening */
      } finally {
        transcribing = false;
      }
    };

    const startPcm = () => {
      if (settled || pcmStarted) return;
      pcmStarted = true;
      abortSpeech();
      const remain = Math.max(4000, deadline - Date.now());
      void capturePcm(remain, {
        signal: pcmAbort.signal,
        onProgress: (clip) => {
          void transcribeClip(clip.samples, clip.sampleRate, clip.peak, false);
        },
      }).then(async (clip) => {
        if (settled) return;
        if (clip.denied && !latest) {
          finish({ ok: false, transcript: "", reason: "denied" });
          return;
        }
        await transcribeClip(clip.samples, clip.sampleRate, clip.peak, true);
        if (!settled) finish(pack(latest));
      });
    };

    const Ctor = recognitionEngine();
    if (Ctor) {
      rec = new Ctor();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 5;
      rec.onresult = (event) => consider(bestTranscript(event));
      rec.onerror = (event) => {
        if (settled) return;
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          finish({ ok: false, transcript: latest, reason: latest ? "mismatch" : "denied" });
          return;
        }
        if (!latest) startPcm();
      };
      rec.onend = () => {
        if (settled) return;
        if (latest && phraseHits(latest, target, flexible, extraTargets)) {
          finish({ ok: true, transcript: latest });
          return;
        }
        try {
          rec?.start();
        } catch {
          if (!latest) startPcm();
        }
      };
      try {
        rec.start();
      } catch {
        rec = null;
        startPcm();
      }
    } else {
      startPcm();
    }

    pcmDelay = window.setTimeout(() => {
      if (!settled && !latest) startPcm();
    }, Ctor ? 3500 : 0);
    hardStop = window.setTimeout(() => {
      if (settled) return;
      if (latest || !pcmStarted) finish(pack(latest));
    }, waitMs);
    window.addEventListener("pagehide", onHide);
  });
}

function bestTranscript(event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) {
  const parts: string[] = [];
  for (let i = 0; i < event.results.length; i += 1) {
    const row = event.results[i];
    let best = "";
    for (let j = 0; j < row.length; j += 1) {
      const text = row[j]?.transcript || "";
      if (text.length > best.length) best = text;
    }
    if (best) parts.push(best);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function startSpeechCapture(lang = "en-US") {
  const Ctor = recognitionEngine();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 5;
  let heard = "";
  rec.onresult = (event) => {
    const next = bestTranscript(event);
    if (next) heard = next;
  };

  const abortRec = () => {
    try {
      rec.abort();
    } catch {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
  };

  const onHide = () => abortRec();
  window.addEventListener("pagehide", onHide);

  try {
    rec.start();
  } catch {
    window.removeEventListener("pagehide", onHide);
    return null;
  }

  return {
    stop() {
      return new Promise<{ transcript: string }>((resolve) => {
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          window.removeEventListener("pagehide", onHide);
          rec.onend = null;
          rec.onerror = null;
          rec.onresult = null;
          resolve({ transcript: heard });
        };
        rec.onend = done;
        rec.onerror = done;
        try {
          rec.stop();
        } catch {
          done();
        }
        window.setTimeout(done, 700);
      });
    },
  };
}
