"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatFcfa } from "@/lib/formation-pricing";
import { FormationCaissePanel } from "./formation-caisse-panel";
import type { CaisseEntry } from "@/lib/formation-caisse-ui";

type Row = {
  id: string;
  full_name: string;
  level: string;
  status: string;
  email: string;
  whatsapp: string;
  country: string;
  screenshot_url: string;
  ocr_amount: number | null;
  ocr_raw?: string;
  amount_total: number;
  amount_second: number;
  access_code: string | null;
  created_at: string;
  reminder_sent_at: string | null;
};

export function FormationAzoloDesk({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<"inscriptions" | "caisse">("inscriptions");
  const [rows, setRows] = useState<Row[]>([]);
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState<CaisseEntry[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const loadCaisse = useCallback(async (c: string) => {
    const res = await fetch(`/api/formation/caisse?code=${encodeURIComponent(c)}`, { cache: "no-store" });
    const json = (await res.json()) as { balance?: number; entries?: CaisseEntry[]; error?: string };
    if (!res.ok) return;
    setBalance(Number(json.balance) || 0);
    setEntries(json.entries || []);
  }, []);

  const load = useCallback(
    async (c: string) => {
      const res = await fetch(`/api/formation/azolo?code=${encodeURIComponent(c)}`, { cache: "no-store" });
      const json = (await res.json()) as { rows?: Row[]; error?: string };
      if (!res.ok) {
        setError(json.error || "code");
        setAuthed(false);
        return;
      }
      setRows((json.rows || []) as Row[]);
      setAuthed(true);
      setError("");
      await loadCaisse(c);
    },
    [loadCaisse],
  );

  useEffect(() => {
    if (!authed || !code) return;
    const id = window.setInterval(() => void loadCaisse(code), 3000);
    return () => window.clearInterval(id);
  }, [authed, code, loadCaisse]);

  async function act(action: "approve" | "deny" | "remind", id: string) {
    setBusy(id + action);
    try {
      const res = await fetch("/api/formation/azolo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, action, applicationId: id }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        whatsappUrl?: string | null;
        mailto?: string | null;
        accessCode?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(json.error || "fail");
        return;
      }
      if (action === "remind") {
        if (json.whatsappUrl) window.open(json.whatsappUrl, "_blank");
        if (json.mailto) window.open(json.mailto, "_blank");
      }
      await load(code);
    } finally {
      setBusy("");
    }
  }

  async function postExpense(payload: { purpose: string; purposeNote: string; amount: number }) {
    if (payload.purpose === "autre" && !payload.purposeNote.trim()) {
      setError("Précisez la raison");
      return;
    }
    setBusy("expense");
    try {
      const res = await fetch("/api/formation/caisse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          purpose: payload.purpose,
          purposeNote: payload.purposeNote,
          amount: payload.amount,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "depense");
        return;
      }
      setError("");
      await loadCaisse(code);
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0b3a5c]/40 p-3 backdrop-blur-md sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="formation-glass max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[28px] p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#b8860b]">Azolo</p>
            <h3 className="font-display text-2xl text-[#0c4a6e]">Bureau EFAA</h3>
            {authed ? (
              <p className="mt-1 text-[12px] font-bold text-[#0a5c38]">
                Caisse {formatFcfa(balance)}
              </p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
            Fermer
          </button>
        </div>

        {!authed ? (
          <div className="mt-6 space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code Azolo"
              className="w-full rounded-xl border border-[#7dd3fc]/50 bg-white/80 px-3 py-3 text-sm"
            />
            {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
            <button
              type="button"
              className="formation-cta w-full rounded-full py-3 text-sm font-bold"
              onClick={() => void load(code)}
            >
              Entrer
            </button>
          </div>
        ) : (
          <>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTab("inscriptions")}
                className={`flex-1 rounded-full py-2 text-[11px] font-bold ${
                  tab === "inscriptions" ? "formation-cta" : "bg-white/60 text-[#0c4a6e]"
                }`}
              >
                Inscriptions
              </button>
              <button
                type="button"
                onClick={() => setTab("caisse")}
                className={`flex-1 rounded-full py-2 text-[11px] font-bold ${
                  tab === "caisse" ? "formation-cta" : "bg-white/60 text-[#0c4a6e]"
                }`}
              >
                Caisse
              </button>
            </div>

            {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}

            {tab === "inscriptions" ? (
              <ul className="mt-5 space-y-3">
                {rows.map((row) => {
                  const paid = Number(row.ocr_amount) || 0;
                  const total = Number(row.amount_total) || 0;
                  const reste = Math.max(0, total - paid);
                  return (
                    <li key={row.id} className="rounded-2xl border border-white/50 bg-white/55 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-display text-lg text-[#0c4a6e]">{row.full_name || "—"}</p>
                          <p className="text-[12px] text-[#1e4a6a]/8">
                            {row.level} · {row.country} · {row.status}
                          </p>
                          <p className="mt-1 text-[11px] text-[#1e4a6a]/75">
                            {row.email} · {row.whatsapp}
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-[#0a7a4a]">
                            Payé {formatFcfa(paid)} · Reste {formatFcfa(reste)} · Total {formatFcfa(total)}
                          </p>
                          {row.access_code ? (
                            <p className="mt-1 text-[12px] font-bold text-[#0c4a6e]">Code {row.access_code}</p>
                          ) : null}
                        </div>
                        {row.screenshot_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.screenshot_url}
                            alt=""
                            className="h-24 w-20 rounded-lg object-cover ring-1 ring-[#d4af37]/35"
                          />
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {row.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => void act("approve", row.id)}
                              className="rounded-full bg-emerald-600/90 px-3 py-1.5 text-[11px] font-bold text-white"
                            >
                              Approuver (entrée caisse)
                            </button>
                            <button
                              type="button"
                              disabled={!!busy}
                              onClick={() => void act("deny", row.id)}
                              className="rounded-full bg-rose-500/90 px-3 py-1.5 text-[11px] font-bold text-white"
                            >
                              Refuser
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void act("remind", row.id)}
                          className="rounded-full bg-[#0c4a6e] px-3 py-1.5 text-[11px] font-bold text-[#f0d78c]"
                        >
                          Rappel 1 mois
                        </button>
                      </div>
                    </li>
                  );
                })}
                {!rows.length ? (
                  <p className="py-8 text-center text-sm text-[#1e4a6a]/7">Aucune demande pour l’instant.</p>
                ) : null}
              </ul>
            ) : (
              <div className="mt-5">
                <FormationCaissePanel
                  balance={balance}
                  entries={entries}
                  busy={!!busy}
                  onExpense={postExpense}
                  variant="azolo"
                />
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
