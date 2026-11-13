"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

type AttemptRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  level: string;
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
};

type ItemResult = {
  id: string;
  prompt: string;
  given: string;
  correct: boolean;
  expected: string[];
};

type ExamPayload = {
  summary: { taken: number; average: number; passRate: number };
  attempts: AttemptRow[];
  detail: (AttemptRow & { items?: ItemResult[] }) | null;
  total: number;
  passMark: number;
};

export function ExamAdminPanel() {
  const { t } = useI18n();
  const [data, setData] = useState<ExamPayload | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async (userId?: string | null) => {
    setBusy(true);
    try {
      const qs = userId ? `?userId=${encodeURIComponent(userId)}` : "";
      const response = await fetch(`/api/admin/exam${qs}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        setData(null);
        return;
      }
      const json = (await response.json()) as ExamPayload;
      setData(json);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  async function openDetail(userId: string) {
    setSelected(userId);
    await load(userId);
  }

  const detail = data?.detail;

  return (
    <section className="mt-4 space-y-4">
      <div className="kingdom-glass p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#c4a574]">{t.admin.examTab}</p>
        <h2 className="mt-1 font-display text-[26px] text-[#f3e6c8]">{t.admin.examPanelTitle}</h2>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#c4a574]/20 bg-black/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#c4a574]">{t.admin.examTaken}</p>
            <p className="mt-1 font-display text-[28px] text-[#f8ecc8]">{data?.summary.taken ?? "—"}</p>
          </div>
          <div className="rounded-2xl border border-[#c4a574]/20 bg-black/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#c4a574]">{t.admin.examAverage}</p>
            <p className="mt-1 font-display text-[28px] text-[#f8ecc8]">
              {data ? `${data.summary.average}/${data.total}` : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-[#c4a574]/20 bg-black/30 p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#c4a574]">{t.admin.examPassRate}</p>
            <p className="mt-1 font-display text-[28px] text-[#f8ecc8]">
              {data ? `${data.summary.passRate}%` : "—"}
            </p>
          </div>
        </div>
      </div>

      {busy && !data ? <p className="text-[13px] text-[#c4a574]">…</p> : null}

      {!busy && data && data.attempts.length === 0 ? (
        <p className="kingdom-glass p-4 text-[13px] text-[#c4a574]">{t.admin.examEmpty}</p>
      ) : null}

      <ul className="max-h-[50dvh] space-y-2 overflow-y-auto pe-1">
        {(data?.attempts || []).map((row) => (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => void openDetail(row.userId)}
              className={`kingdom-glass flex w-full items-center justify-between gap-3 p-3 text-left transition ${
                selected === row.userId ? "ring-1 ring-amber-400/50" : ""
              }`}
            >
              <div>
                <p className="font-display text-[#f3e6c8]">{row.name}</p>
                <p className="text-[11px] text-[#c4a574]">
                  {row.level} · {t.admin.examSubmitted}{" "}
                  {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[22px] text-amber-200">
                  {row.score}/{row.total}
                </p>
                <p className={`text-[11px] ${row.passed ? "text-emerald-300" : "text-rose-300"}`}>
                  {row.percent}%
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {detail ? (
        <div className="kingdom-glass p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#c4a574]">{t.admin.examDetail}</p>
              <h3 className="font-display text-[22px] text-[#f3e6c8]">{detail.name}</h3>
              <p className="text-[12px] text-[#c4a574]">
                {detail.score}/{detail.total} · {detail.percent}%
              </p>
            </div>
            <button
              type="button"
              className="kingdom-cta-ghost px-3 py-2 text-[11px]"
              onClick={() => {
                setSelected(null);
                void load(null);
              }}
            >
              {t.admin.examCloseDetail}
            </button>
          </div>
          <ul className="mt-4 max-h-[40dvh] space-y-2 overflow-y-auto">
            {(detail.items || []).map((item, i) => (
              <li
                key={item.id}
                className={`rounded-xl border p-3 text-[12px] ${
                  item.correct
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-400/30 bg-rose-500/10 text-rose-100"
                }`}
              >
                <p className="font-semibold text-[#f3e6c8]">
                  {i + 1}. {item.prompt}
                </p>
                <p className="mt-1 opacity-90">→ {item.given || "—"}</p>
                {!item.correct ? (
                  <p className="mt-1 text-emerald-200/90">
                    ✓ {(item.expected || []).slice(0, 2).join(" · ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
