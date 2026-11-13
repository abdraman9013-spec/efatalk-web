"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, LockKeyhole, ShieldCheck, Timer } from "lucide-react";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { useI18n } from "@/i18n/provider";
import { readOfficialStudent } from "@/lib/session";

type Stage = "boot" | "gate" | "rules" | "run" | "result";

type PaperQuestion = {
  id: string;
  part: "A" | "B" | "C" | "D";
  kind: "type" | "choice" | "contains";
  prompt: string;
  hint?: string;
  choices?: string[];
  points: number;
};

type ItemResult = {
  id: string;
  part: string;
  prompt: string;
  given: string;
  correct: boolean;
  expected: string[];
  earned: number;
  points: number;
};

function fill(template: string, map: Record<string, string | number>) {
  return Object.entries(map).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function fetchJson(input: RequestInfo | URL, init?: RequestInit, ms = 20000) {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    const response = await fetch(input, { ...init, signal: ctrl.signal });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    window.clearTimeout(timer);
  }
}

export function BeginnerExamScreen() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("boot");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState("");
  const [busy, setBusy] = useState(false);
  const [acks, setAcks] = useState<boolean[]>([false, false, false, false, false]);
  const [questions, setQuestions] = useState<PaperQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string>("");
  const [examMinutes, setExamMinutes] = useState(75);
  const [leftSec, setLeftSec] = useState(75 * 60);
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(50);
  const [items, setItems] = useState<ItemResult[]>([]);
  const [message, setMessage] = useState("");
  const [passed, setPassed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const answersRef = useRef<Record<string, string>>({});
  const draftRef = useRef("");
  const currentIdRef = useRef("");
  const submittingRef = useRef(false);
  const unlockTokenRef = useRef("");

  const allAcked = acks.every(Boolean);
  const current = questions[index];
  const isLast = index >= questions.length - 1;

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  useEffect(() => {
    currentIdRef.current = current?.id || "";
  }, [current?.id]);

  useEffect(() => {
    const student = readOfficialStudent();
    if (!student || student.kind !== "official") {
      router.replace("/");
      return;
    }
    setUserId(student.id);
    void fetch(
      `/api/exam/me?userId=${encodeURIComponent(student.id)}&locale=${encodeURIComponent(locale)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then((data) => {
        if (data?.done && data.attempt) {
          setScore(Number(data.attempt.score) || 0);
          setTotal(Number(data.attempt.total) || 50);
          setItems(Array.isArray(data.attempt.items) ? data.attempt.items : []);
          setPassed(Boolean(data.passed) || Number(data.attempt.score) >= 25);
          setMessage(String(data.message || ""));
          setStage("result");
          return;
        }
        setStage("gate");
      })
      .catch(() => setStage("gate"));
  }, [locale, router]);

  const finishExam = useCallback(
    async (finalAnswers: Record<string, string>, startIso: string) => {
      if (submittingRef.current || !userId) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const { response, data } = await fetchJson("/api/exam/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(unlockTokenRef.current
              ? { "x-efaa-exam-unlock": unlockTokenRef.current }
              : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            userId,
            answers: finalAnswers,
            startedAt: startIso,
            locale,
          }),
        });
        if (!response.ok && data?.error === "unlock-required") {
          setStage("gate");
          setGateError(t.official.examBadPassword);
          return;
        }
        setScore(Number(data.score) || 0);
        setTotal(Number(data.total) || 50);
        setItems(Array.isArray(data.items) ? data.items : []);
        setMessage(String(data.message || ""));
        setPassed(Boolean(data.passed));
        setStage("result");
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [locale, t.official.examBadPassword, userId],
  );

  useEffect(() => {
    if (stage !== "run" || !startedAt) return;
    const tick = window.setInterval(() => {
      const start = new Date(startedAt).getTime();
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, examMinutes * 60 - elapsed);
      setLeftSec(left);
      if (left <= 0) {
        window.clearInterval(tick);
        const merged = { ...answersRef.current };
        if (currentIdRef.current) merged[currentIdRef.current] = draftRef.current.trim();
        void finishExam(merged, startedAt);
      }
    }, 500);
    return () => window.clearInterval(tick);
  }, [examMinutes, finishExam, stage, startedAt]);

  async function onUnlock(event: FormEvent) {
    event.preventDefault();
    if (!userId || busy) return;
    setBusy(true);
    setGateError("");
    try {
      const { response, data } = await fetchJson("/api/exam/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, userId, locale }),
      });
      if (!response.ok) {
        setGateError(t.official.examBadPassword);
        return;
      }
      if (data.alreadyDone && data.attempt) {
        setScore(Number(data.attempt.score) || 0);
        setTotal(Number(data.attempt.total) || 50);
        setItems(Array.isArray(data.attempt.items) ? data.attempt.items : []);
        setPassed(Boolean(data.passed) || Number(data.attempt.score) >= 25);
        setMessage(String(data.message || ""));
        setStage("result");
        return;
      }
      if (typeof data.token === "string" && data.token) {
        unlockTokenRef.current = data.token;
        try {
          sessionStorage.setItem("efaa_exam_unlock_token", data.token);
        } catch {
          /* private mode */
        }
      }
      setStage("rules");
    } finally {
      setBusy(false);
    }
  }

  async function onStart() {
    if (!allAcked || !userId || busy) return;
    setBusy(true);
    try {
      if (!unlockTokenRef.current) {
        try {
          unlockTokenRef.current = sessionStorage.getItem("efaa_exam_unlock_token") || "";
        } catch {
          unlockTokenRef.current = "";
        }
      }
      const { response, data } = await fetchJson(
        `/api/exam/paper?userId=${encodeURIComponent(userId)}`,
        {
          cache: "no-store",
          credentials: "include",
          headers: unlockTokenRef.current
            ? { "x-efaa-exam-unlock": unlockTokenRef.current }
            : undefined,
        },
      );
      if (!response.ok) {
        setStage("gate");
        setGateError(t.official.examBadPassword);
        return;
      }
      setQuestions(Array.isArray(data.questions) ? data.questions : []);
      setIndex(0);
      setDraft("");
      setAnswers({});
      const mins = Number(data.minutes) > 0 ? Number(data.minutes) : 75;
      setExamMinutes(mins);
      const iso = new Date().toISOString();
      setStartedAt(iso);
      setLeftSec(mins * 60);
      setStage("run");
    } finally {
      setBusy(false);
    }
  }

  function commitCurrent() {
    if (!current) return answers;
    return { ...answers, [current.id]: draft.trim() };
  }

  function onNext() {
    const nextAnswers = commitCurrent();
    setAnswers(nextAnswers);
    if (isLast) {
      void finishExam(nextAnswers, startedAt);
      return;
    }
    setIndex((i) => i + 1);
    setDraft(nextAnswers[questions[index + 1]?.id] || "");
  }

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return ((index + 1) / questions.length) * 100;
  }, [index, questions.length]);

  const rules = [
    t.official.examRule1,
    t.official.examRule2,
    t.official.examRule3,
    t.official.examRule4,
    t.official.examRule5,
  ];

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#060608] text-[#f3e6c8]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.18),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(30,64,175,0.35),transparent_50%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-700/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-4 pt-4 md:px-8">
        <button
          type="button"
          onClick={() => router.push("/vip-dashboard")}
          className="rounded-full border border-[#c4a574]/30 bg-white/5 px-3 py-1.5 text-[12px] font-semibold text-[#e8d5b0]"
        >
          ←
        </button>
        <p className="font-display text-[12px] tracking-[0.2em] text-[#c4a574] uppercase">
          EFA Talk · Exam
        </p>
        <LanguageSwitcher />
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-2xl flex-col px-4 pb-28 pt-6 md:px-8">
        {stage === "boot" ? (
          <p className="m-auto text-[14px] text-[#c4a574]">{t.official.examLoading}</p>
        ) : null}

        <AnimatePresence mode="wait">
          {stage === "gate" ? (
            <motion.section
              key="gate"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="m-auto w-full max-w-md"
            >
              <div className="rounded-[28px] border border-[#c4a574]/25 bg-[#0c0c10]/80 p-6 shadow-[0_0_80px_rgba(212,175,55,0.12)] backdrop-blur-xl md:p-8">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10">
                  <LockKeyhole className="h-6 w-6 text-amber-300" />
                </div>
                <h1 className="mt-5 text-center font-display text-[32px] text-[#f3e6c8] md:text-[38px]">
                  {t.official.examTitle}
                </h1>
                <p className="mt-2 text-center text-[13px] text-[#c4a574]">{t.official.examSubtitle}</p>
                <p className="mt-4 text-center text-[13px] text-[#e8d5b0]/80">{t.official.examGateHint}</p>
                <form onSubmit={onUnlock} className="mt-6 space-y-3">
                  <label className="block text-[11px] uppercase tracking-[0.22em] text-[#c4a574]">
                    {t.official.examPassword}
                    <input
                      type="password"
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[#c4a574]/25 bg-black/40 px-4 py-3 text-[15px] text-[#f3e6c8] outline-none focus:border-amber-400/60"
                    />
                  </label>
                  {gateError ? <p className="text-[12px] text-rose-300">{gateError}</p> : null}
                  <button
                    type="submit"
                    disabled={busy || !password.trim()}
                    className="w-full rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 py-3.5 text-[13px] font-black tracking-wide text-[#1a1205] uppercase disabled:opacity-50"
                  >
                    {busy ? t.official.examBusy : t.official.examUnlock}
                  </button>
                </form>
              </div>
            </motion.section>
          ) : null}

          {stage === "rules" ? (
            <motion.section
              key="rules"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="m-auto w-full max-w-lg"
            >
              <div className="rounded-[28px] border border-[#c4a574]/25 bg-[#0c0c10]/85 p-6 backdrop-blur-xl md:p-8">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-amber-300" />
                  <h1 className="font-display text-[28px] text-[#f3e6c8]">{t.official.examRulesTitle}</h1>
                </div>
                <ul className="mt-6 space-y-3">
                  {rules.map((rule, i) => (
                    <li key={rule}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                        <button
                          type="button"
                          onClick={() =>
                            setAcks((prev) => {
                              const next = [...prev];
                              next[i] = !next[i];
                              return next;
                            })
                          }
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            acks[i]
                              ? "border-amber-400 bg-amber-400 text-[#1a1205]"
                              : "border-[#c4a574]/40 bg-transparent"
                          }`}
                          aria-pressed={acks[i]}
                        >
                          {acks[i] ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                        <span className="text-[13px] leading-relaxed text-[#e8d5b0]/90">{rule}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[12px] text-[#c4a574]">{t.official.examAck}</p>
                <button
                  type="button"
                  disabled={!allAcked || busy}
                  onClick={() => void onStart()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-amber-500 py-3.5 text-[13px] font-black tracking-wide text-white uppercase disabled:opacity-40"
                >
                  {busy ? t.official.examBusy : t.official.examStart}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.section>
          ) : null}

          {stage === "run" && current ? (
            <motion.section
              key={`q-${current.id}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="flex flex-1 flex-col"
            >
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#c4a574]">
                  <span>{fill(t.official.examPart, { p: current.part })}</span>
                  <span>{fill(t.official.examOf, { n: index + 1, t: questions.length })}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-sky-400"
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>

              <div className="rounded-[28px] border border-[#c4a574]/20 bg-[#0c0c10]/75 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-7">
                <p className="font-display text-[22px] leading-snug text-[#f3e6c8] md:text-[26px]">
                  {current.prompt}
                </p>
                {current.hint ? (
                  <p className="mt-2 text-[12px] text-[#c4a574]">{current.hint}</p>
                ) : null}

                {current.kind === "choice" && current.choices ? (
                  <div className="mt-6 space-y-2">
                    {current.choices.map((choice) => {
                      const active = draft === choice;
                      return (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setDraft(choice)}
                          className={`flex w-full items-center rounded-2xl border px-4 py-3.5 text-left text-[15px] transition ${
                            active
                              ? "border-amber-400/70 bg-amber-400/15 text-[#f8ecc8]"
                              : "border-white/10 bg-white/[0.03] text-[#e8d5b0] hover:border-[#c4a574]/40"
                          }`}
                        >
                          {choice}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <label className="mt-6 block">
                    <span className="text-[11px] uppercase tracking-[0.2em] text-[#c4a574]">
                      {t.official.examAnswer}
                    </span>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={current.part === "C" ? 4 : 2}
                      placeholder={t.official.examTypeHere}
                      className="mt-2 w-full resize-none rounded-2xl border border-[#c4a574]/25 bg-black/35 px-4 py-3 text-[15px] text-[#f3e6c8] outline-none focus:border-amber-400/50"
                    />
                  </label>
                )}

                <button
                  type="button"
                  disabled={submitting || !draft.trim()}
                  onClick={onNext}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-300 py-3.5 text-[13px] font-black tracking-wide text-[#1a1205] uppercase disabled:opacity-40"
                >
                  {submitting
                    ? t.official.examBusy
                    : isLast
                      ? t.official.examSubmit
                      : t.official.examNext}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </motion.section>
          ) : null}

          {stage === "result" ? (
            <motion.section
              key="result"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full pb-8"
            >
              <div className="rounded-[28px] border border-[#c4a574]/25 bg-[#0c0c10]/85 p-6 text-center backdrop-blur-xl md:p-8">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#c4a574]">
                  {t.official.examResultTitle}
                </p>
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}
                  className="mx-auto mt-5 flex h-36 w-36 items-center justify-center rounded-full border border-amber-400/40 bg-[radial-gradient(circle_at_30%_30%,rgba(251,191,36,0.35),transparent_60%)] shadow-[0_0_60px_rgba(212,175,55,0.25)]"
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[#c4a574]">
                      {t.official.examScore}
                    </p>
                    <p className="font-display text-[42px] text-[#f8ecc8]">
                      {score}
                      <span className="text-[20px] text-[#c4a574]">/{total}</span>
                    </p>
                  </div>
                </motion.div>
                {passed ? (
                  <p className="mt-3 text-[13px] font-semibold text-emerald-300">{t.official.examPassed}</p>
                ) : null}
                {message ? (
                  <p className="mx-auto mt-4 max-w-md text-[14px] leading-relaxed text-[#e8d5b0]/95">
                    {message}
                  </p>
                ) : (
                  <p className="mt-4 text-[13px] text-[#c4a574]">{t.official.examAlreadyDone}</p>
                )}
                <p className="mt-2 text-[12px] text-[#c4a574]/80">{t.official.examRetryHint}</p>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-[22px] text-[#f3e6c8]">{t.official.examCorrection}</h2>
                <ul className="mt-4 space-y-3">
                  {items.map((row, i) => (
                    <li
                      key={row.id}
                      className={`rounded-2xl border p-4 ${
                        row.correct
                          ? "border-emerald-400/30 bg-emerald-500/10"
                          : "border-rose-400/30 bg-rose-500/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[13px] font-semibold text-[#f3e6c8]">
                          {i + 1}. {row.prompt}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            row.correct ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"
                          }`}
                        >
                          {row.correct ? t.official.examCorrect : t.official.examWrong}
                        </span>
                      </div>
                      <p className="mt-2 text-[12px] text-[#e8d5b0]/85">
                        <span className="text-[#c4a574]">{t.official.examYourAnswer}: </span>
                        {row.given || "—"}
                      </p>
                      {!row.correct ? (
                        <p className="mt-1 text-[12px] text-emerald-200/90">
                          <span className="text-[#c4a574]">{t.official.examExpected}: </span>
                          {(row.expected || []).slice(0, 2).join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => router.push("/vip-dashboard")}
                className="mt-8 w-full rounded-2xl border border-[#c4a574]/35 bg-white/5 py-3.5 text-[13px] font-bold text-[#e8d5b0]"
              >
                {t.official.examBackProfile}
              </button>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>

      {stage === "run" ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#c4a574]/20 bg-[#08080c]/92 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#c4a574]">
              <Timer className="h-4 w-4" />
              <span className="text-[11px] uppercase tracking-[0.18em]">{t.official.examTime}</span>
            </div>
            <p
              className={`font-display text-[28px] tabular-nums ${
                leftSec <= 300 ? "text-rose-300" : "text-[#f8ecc8]"
              }`}
            >
              {formatClock(leftSec)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
