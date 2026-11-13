"use client";

import { Download, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ADMIN_CODE } from "@/lib/admin";
import { useI18n } from "@/i18n/provider";
import type { Level } from "@/i18n/translations";

type RosterPayload = {
  counts: { beginner: number; intermediate: number; advanced: number; total: number };
};

const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

export function AdminRosterPanel({ liveByLevel }: { liveByLevel: Record<Level, number> }) {
  const { t } = useI18n();
  const [counts, setCounts] = useState<RosterPayload["counts"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    let response = await fetch("/api/admin/roster", { cache: "no-store", credentials: "include" });
    if (response.status === 401) {
      await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: ADMIN_CODE }),
      }).catch(() => null);
      response = await fetch("/api/admin/roster", { cache: "no-store", credentials: "include" });
    }
    if (!response.ok) {
      setError("Impossible de charger les inscrits.");
      return;
    }
    const data = (await response.json()) as RosterPayload;
    setCounts(data.counts);
  }, []);

  useEffect(() => {
    void load();
    const tick = window.setInterval(() => void load(), 12000);
    return () => window.clearInterval(tick);
  }, [load]);

  async function downloadPdf() {
    setBusy(true);
    setError("");
    try {
      let response = await fetch("/api/admin/roster/pdf", { credentials: "include" });
      if (response.status === 401) {
        await fetch("/api/admin/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ code: ADMIN_CODE }),
        }).catch(() => null);
        response = await fetch("/api/admin/roster/pdf", { credentials: "include" });
      }
      if (!response.ok) throw new Error("pdf");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "efatalk-whatsapp-numeros.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("PDF indisponible.");
    }
    setBusy(false);
  }

  return (
    <section className="kingdom-glass mt-5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c4a574]">Inscrits</p>
          <h2 className="mt-1 font-display text-[24px] text-[#f3e6c8]">Effectifs exacts</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c4a574]/25 px-3 py-2 text-sm font-black text-[#f0d78c]">
            <Users className="h-4 w-4" />
            {counts?.total ?? "—"}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => void downloadPdf()}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f0d78c] px-3 py-2 text-[11px] font-black text-[#0c1b4d]"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {LEVELS.map((level) => (
          <article key={level} className="rounded-2xl border border-[#c4a574]/20 bg-black/20 px-2 py-3 text-center">
            <p className="truncate text-[10px] font-bold uppercase tracking-wide text-[#c4a574]">{t.levels[level]}</p>
            <p className="mt-1 font-display text-3xl text-[#f6e7a1]">{counts ? counts[level] : "—"}</p>
            <p className="text-[9px] text-[#e8d5b0]/60">inscrits</p>
            <p className="mt-1 text-[10px] font-bold text-emerald-200">{liveByLevel[level]} en ligne</p>
          </article>
        ))}
      </div>
      {error ? <p className="mt-3 text-center text-[11px] text-[#e2b07a]">{error}</p> : null}
    </section>
  );
}
