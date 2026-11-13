"use client";

import { Copy, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  generateInvitationCode,
  listInvitationCodes,
  type InvitationCodeRow,
} from "@/lib/efaa-db";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvitationCodeGenerator() {
  const [rows, setRows] = useState<InvitationCodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRows(await listInvitationCodes());
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onGenerate() {
    setError("");
    setLoading(true);
    try {
      const { row } = await generateInvitationCode();
      setRows((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
      await navigator.clipboard.writeText(row.code);
      setCopied(row.code);
      window.setTimeout(() => setCopied(""), 2200);
    } catch {
      setError("Impossible de générer le code. Vérifiez Supabase (table invitation_codes).");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    window.setTimeout(() => setCopied(""), 2200);
  }

  return (
    <div className="mt-4 space-y-4">
      <button
        type="button"
        disabled={loading}
        onClick={onGenerate}
        className="group relative w-full overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-r from-sky-500/20 via-blue-600/25 to-indigo-600/20 px-4 py-4 text-left shadow-[0_0_40px_rgba(56,189,248,.15)] transition hover:border-sky-300/50 hover:shadow-[0_0_55px_rgba(56,189,248,.28)] disabled:opacity-60"
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-400/0 via-sky-300/10 to-blue-500/0 opacity-0 transition group-hover:opacity-100" />
        <span className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-400/15 text-sky-200">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-[13px] font-bold tracking-wide text-sky-100">
              Générer un Code Privé (ex: EFAA…)
            </span>
            <span className="mt-0.5 block text-[11px] text-sky-200/70">
              Format efaa_XXXX · copié automatiquement
            </span>
          </span>
        </span>
      </button>

      {copied ? (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-center text-[12px] font-semibold text-emerald-200">
          Copié : {copied}
        </p>
      ) : null}
      {error ? <p className="text-center text-[12px] text-rose-300">{error}</p> : null}

      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.28em] text-sky-200/60">Codes émis</p>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center text-[12px] text-white/45">
            Aucun code pour l&apos;instant. Cliquez le bouton ci-dessus.
          </p>
        ) : (
          rows.map((row) => (
            <article
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-[17px] font-semibold tracking-wide text-sky-100">
                  {row.code.toUpperCase()}
                </p>
                <p className="mt-1 text-[11px] text-white/45">
                  {fmtDate(row.created_at)} ·{" "}
                  {row.is_used ? (
                    <span className="text-amber-300/90">Utilisé</span>
                  ) : (
                    <span className="text-emerald-300/90">Disponible</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyCode(row.code)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-400/25 bg-sky-500/10 text-sky-200 transition hover:bg-sky-500/20"
                aria-label={`Copier ${row.code}`}
              >
                <Copy className="h-4 w-4" />
              </button>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
