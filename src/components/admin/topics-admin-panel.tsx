"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/i18n/provider";
import type { DebateLevel, DebateTopicRow } from "@/lib/debate-topics";

const emptyForm = {
  level: "intermediate" as DebateLevel,
  title_en: "",
  title_fr: "",
  title_ar: "",
  q1: "",
  q2: "",
  q3: "",
};

export function TopicsAdminPanel() {
  const { t } = useI18n();
  const [rows, setRows] = useState<DebateTopicRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [fail, setFail] = useState(false);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<DebateLevel | "all">("all");

  const load = useCallback(async () => {
    setBusy(true);
    setFail(false);
    try {
      const response = await fetch("/api/admin/topics", { cache: "no-store", credentials: "include" });
      if (!response.ok) {
        setRows([]);
        setFail(true);
        return;
      }
      const json = (await response.json()) as { topics?: DebateTopicRow[] };
      setRows(json.topics || []);
    } catch {
      setRows([]);
      setFail(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(
    () => ({
      intermediate: rows.filter((row) => row.level === "intermediate" && row.active).length,
      advanced: rows.filter((row) => row.level === "advanced" && row.active).length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.level !== filter) return false;
      if (!needle) return true;
      const blob = `${row.title_en} ${row.title_fr} ${row.title_ar} ${(row.questions || []).map((q) => q.en).join(" ")}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [filter, query, rows]);

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const questions = [form.q1, form.q2, form.q3]
      .map((en) => en.trim())
      .filter(Boolean)
      .map((en) => ({ en, fr: en, ar: en }));
    if (!form.title_en.trim() || questions.length < 1) return;
    const response = await fetch("/api/admin/topics", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: form.level,
        title_en: form.title_en.trim(),
        title_fr: form.title_fr.trim() || form.title_en.trim(),
        title_ar: form.title_ar.trim() || form.title_en.trim(),
        questions,
      }),
    });
    if (!response.ok) {
      setFail(true);
      return;
    }
    setForm(emptyForm);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
    await load();
  }

  async function toggle(row: DebateTopicRow) {
    await fetch("/api/admin/topics", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, active: !row.active }),
    });
    await load();
  }

  return (
    <div className="admin-topics">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="kingdom-glass p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#c4a574]">{t.levels.intermediate}</p>
            <p className="mt-1 font-display text-[28px] text-[#f8ecc8]">{busy ? "—" : counts.intermediate}</p>
          </div>
          <div className="kingdom-glass p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#c4a574]">{t.levels.advanced}</p>
            <p className="mt-1 font-display text-[28px] text-[#f8ecc8]">{busy ? "—" : counts.advanced}</p>
          </div>
        </div>

        <form onSubmit={onAdd} className="kingdom-glass space-y-2 p-4">
          <p className="text-[11px] tracking-[0.16em] text-[#c4a574]">{t.admin.debateAdd}</p>
          <select
            className="kingdom-input"
            value={form.level}
            onChange={(e) => setForm((prev) => ({ ...prev, level: e.target.value as DebateLevel }))}
          >
            <option value="intermediate">{t.levels.intermediate}</option>
            <option value="advanced">{t.levels.advanced}</option>
          </select>
          <input
            className="kingdom-input"
            placeholder={t.admin.debateTitle}
            value={form.title_en}
            onChange={(e) => setForm((prev) => ({ ...prev, title_en: e.target.value }))}
          />
          <input
            className="kingdom-input"
            placeholder={t.admin.debateTitleFr}
            value={form.title_fr}
            onChange={(e) => setForm((prev) => ({ ...prev, title_fr: e.target.value }))}
          />
          <input
            className="kingdom-input"
            placeholder={t.admin.debateTitleAr}
            value={form.title_ar}
            onChange={(e) => setForm((prev) => ({ ...prev, title_ar: e.target.value }))}
          />
          <textarea
            className="kingdom-input min-h-16"
            placeholder={t.admin.debateQ1}
            value={form.q1}
            onChange={(e) => setForm((prev) => ({ ...prev, q1: e.target.value }))}
          />
          <textarea
            className="kingdom-input min-h-16"
            placeholder={t.admin.debateQ2}
            value={form.q2}
            onChange={(e) => setForm((prev) => ({ ...prev, q2: e.target.value }))}
          />
          <textarea
            className="kingdom-input min-h-16"
            placeholder={t.admin.debateQ3}
            value={form.q3}
            onChange={(e) => setForm((prev) => ({ ...prev, q3: e.target.value }))}
          />
          <button type="submit" className="kingdom-cta w-full">
            {t.admin.debateAdd}
          </button>
          {saved ? <p className="text-center text-[12px] text-[#b7f7c8]">{t.admin.debateSaved}</p> : null}
        </form>
      </div>

      <div className="space-y-3">
        <input
          className="kingdom-input"
          placeholder={t.admin.searchTopics}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "intermediate", "advanced"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`rounded-full px-3 py-2 text-[11px] font-semibold ${
                filter === id ? "kingdom-cta" : "kingdom-cta-ghost"
              }`}
            >
              {id === "all" ? t.admin.debateAll : t.levels[id]}
            </button>
          ))}
        </div>
        {fail ? (
          <div className="kingdom-glass space-y-2 p-4 text-center">
            <p className="text-[13px] text-[#e2b07a]">{t.admin.debateLoadFail}</p>
            <button type="button" className="kingdom-cta px-4 py-2 text-[12px]" onClick={() => void load()}>
              {t.admin.debateRetry}
            </button>
          </div>
        ) : null}
        {!fail && !busy && !visible.length ? (
          <p className="kingdom-glass p-4 text-center text-[13px] text-[#e8d5b0]/80">{t.admin.debateEmpty}</p>
        ) : null}
        <ul className="admin-topic-list">
          {visible.map((row) => (
            <li key={row.id} className="kingdom-glass p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#c4a574]">
                    {t.levels[row.level]} · {row.active ? t.admin.lessonOpen : t.admin.lessonLocked}
                  </p>
                  <p className="mt-1 font-display text-[18px] text-[#f3e6c8]" dir="ltr">
                    {row.title_en}
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-[#e8d5b0]/85" dir="ltr">
                    {(row.questions || []).map((q) => (
                      <li key={q.en}>• {q.en}</li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  className="kingdom-cta-ghost shrink-0 px-3 py-2 text-[11px]"
                  onClick={() => void toggle(row)}
                >
                  {row.active ? t.admin.debateHide : t.admin.debateShow}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
