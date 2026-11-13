"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_CODE } from "@/lib/admin";

type AdminPayload = {
  challenge: Record<string, unknown>;
  metrics: {
    participants: number;
    eligible: number;
    activeToday: number;
    validReferrals: number;
    suspiciousReferrals: number;
    openFlags: number;
    awardedPoints: number;
  };
  leaderboard: Array<Record<string, unknown>>;
  todayBoard: Array<Record<string, unknown>>;
  referrals: Array<Record<string, unknown>>;
  flags: Array<Record<string, unknown>>;
  participants: Array<Record<string, unknown>>;
  winners: Array<Record<string, unknown>>;
};

type Subtab = "participants" | "overview" | "leaderboard" | "referrals" | "security" | "settings";

export function ChallengeAdminPanel() {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [tab, setTab] = useState<Subtab>("participants");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    let response = await fetch("/api/admin/challenge", { cache: "no-store", credentials: "include" });
    if (response.status === 401) {
      await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: ADMIN_CODE }),
      }).catch(() => null);
      response = await fetch("/api/admin/challenge", { cache: "no-store", credentials: "include" });
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setError(result.error || "Impossible de charger le Challenge.");
      return;
    }
    setData(await response.json());
  }, []);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  async function action(body: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/challenge", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(result.error || "Action refusée.");
    else {
      setMessage("Enregistré.");
      await load();
    }
    setBusy(false);
  }

  if (error) {
    return (
      <div className="kingdom-glass mt-4 space-y-3 p-6 text-center">
        <p className="text-sm text-[#e2b07a]">{error}</p>
        <button type="button" className="kingdom-cta px-4 py-2 text-[12px]" onClick={() => void load()}>
          Réessayer
        </button>
      </div>
    );
  }

  if (!data) return <div className="kingdom-glass mt-4 p-6 text-center text-[#c4a574]">…</div>;
  const challenge = data.challenge;
  const held = data.referrals.filter((row) => row.status === "held");
  const flags = data.flags.filter((row) => row.status === "open" || row.status === "reviewing");
  const liveTop = data.todayBoard?.length ? data.todayBoard : data.leaderboard;

  function downloadDayPoster() {
    const people = liveTop
      .slice(0, 3)
      .map((row) => ({
        rank: Number(row.rank) || 0,
        name: String(row.display_name || "Élève"),
        points: Number(row.points) || 0,
      }));
    if (!people.length) return;
    void import("@/lib/challenge-poster").then(async ({ renderDayPoster, downloadPng }) => {
      const blob = await renderDayPoster({
        dayLabel: new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          timeZone: "Africa/Ndjamena",
        }),
        people,
      });
      downloadPng(blob, "efatalk-challenge-du-jour.png");
    });
  }

  return (
    <section className="mt-4">
      <button
        type="button"
        className="kingdom-cta mb-3 w-full px-4 py-4 text-sm font-black"
        onClick={() => downloadDayPoster()}
      >
        Télécharger l’affiche Challenge du jour — Top 3
      </button>
      <p className="mb-3 text-center text-[11px] text-[#c4a574]">
        Toujours ici, en haut de l’onglet Challenge. Image : noms, points live, phrases.
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-6">
        {(["participants", "overview", "leaderboard", "referrals", "security", "settings"] as Subtab[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-[0.08em] ${
              tab === id ? "kingdom-cta" : "kingdom-cta-ghost"
            }`}
          >
            {id === "participants"
              ? "Élèves"
              : id === "overview"
                ? "Vue"
                : id === "leaderboard"
                  ? "Classement"
                  : id === "referrals"
                    ? "Parrainages"
                    : id === "security"
                      ? "Sécurité"
                      : "Réglages"}
          </button>
        ))}
      </div>

      {tab === "participants" ? (
        <div className="mt-3 max-h-[62dvh] space-y-2 overflow-y-auto pe-1">
          {data.participants.map((row) => (
            <article key={String(row.id)} className="kingdom-glass flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#f3e6c8]">{String(row.display_name || row.user_id)}</p>
                <p className="text-[10px] uppercase text-[#c4a574]">{String(row.status)}</p>
              </div>
              {row.status === "withdrawn" || row.status === "disqualified" ? (
                <button
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt("Motif de restauration");
                    if (reason) void action({ action: "restore", participantId: row.id, reason });
                  }}
                  className="kingdom-cta px-3 py-2 text-[11px]"
                >
                  Restaurer
                </button>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => {
                    const reason = window.prompt("Motif pour enlever cet élève du Challenge");
                    if (reason) void action({ action: "remove", participantId: row.id, reason });
                  }}
                  className="rounded-xl bg-rose-900/50 px-3 py-2 text-[11px] font-bold text-rose-100"
                >
                  Effacer
                </button>
              )}
            </article>
          ))}
          {!data.participants.length ? <Empty text="Aucun participant pour le moment." /> : null}
        </div>
      ) : null}

      {tab === "overview" ? (
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric label="Participants" value={data.metrics.participants} />
            <Metric label="Éligibles" value={data.metrics.eligible} />
            <Metric label="Actifs aujourd’hui" value={data.metrics.activeToday} />
            <Metric label="Parrainages valides" value={data.metrics.validReferrals} />
            <Metric label="À vérifier" value={data.metrics.suspiciousReferrals} />
            <Metric label="Alertes ouvertes" value={data.metrics.openFlags} />
          </div>
          <div className="kingdom-glass mt-3 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#c4a574]">État</p>
            <p className="mt-2 text-lg font-bold text-[#f3e6c8]">{String(challenge.status)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button disabled={busy} onClick={() => void action({ action: "status", status: "scheduled", reason: "Challenge programmé ou repris" })} className="kingdom-cta px-2 py-2 text-[11px]">Démarrer</button>
              <button disabled={busy} onClick={() => void action({ action: "status", status: "paused", reason: "Challenge mis en pause par admin" })} className="kingdom-cta-ghost px-2 py-2 text-[11px]">Pause</button>
              <button disabled={busy} onClick={() => void action({ action: "freeze", reason: "Fin officielle de la compétition" })} className="rounded-xl bg-rose-900/50 px-2 py-2 text-[11px] font-bold text-rose-100">Figer</button>
              <button disabled={busy || data.winners.length !== 3} onClick={() => void action({ action: "finalize", reason: "Rapports vérifiés, publication officielle des gagnants" })} className="rounded-xl bg-emerald-900/50 px-2 py-2 text-[11px] font-bold text-emerald-100 disabled:opacity-35">Publier gagnants</button>
            </div>
            {data.winners.length ? (
              <p className="mt-3 text-xs text-[#c4a574]">
                Rapports gagnants : {data.winners.filter((row) => row.eligibility_status === "eligible").length}/{data.winners.length} éligibles
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "leaderboard" ? (
        <div className="mt-3 max-h-[62dvh] space-y-2 overflow-y-auto pe-1">
          {data.leaderboard.map((row) => (
            <article key={String(row.participant_id)} className="kingdom-glass p-3">
              <div className="flex items-center gap-2">
                <span className="w-8 font-black text-[#f0d78c]">#{String(row.rank)}</span>
                <span className="min-w-0 flex-1 truncate font-bold text-[#f3e6c8]">{String(row.display_name)}</span>
                <span className="font-black text-[#f0d78c]">{String(row.points)} pts</span>
              </div>
              <p className="mt-1 ps-10 text-[10px] text-[#c4a574]">
                {String(row.active_days)} jours · {String(row.speaking_sessions)} paroles · {String(row.valid_referrals)} amis
              </p>
            </article>
          ))}
          {!data.leaderboard.length ? <Empty text="Le classement Challenge est encore vide." /> : null}
          {data.leaderboard.length ? (
            <button type="button" className="kingdom-cta w-full px-3 py-3 text-sm" onClick={() => downloadDayPoster()}>
              Télécharger l’affiche Challenge du jour — Top 3
            </button>
          ) : null}
        </div>
      ) : null}

      {tab === "referrals" ? (
        <div className="mt-3 max-h-[62dvh] space-y-2 overflow-y-auto pe-1">
          {held.map((row) => (
            <article key={String(row.id)} className="kingdom-glass p-3">
              <p className="text-sm font-bold text-[#f3e6c8]">Parrainage retenu</p>
              <p className="mt-1 text-[11px] text-[#c4a574]">Risque {String(row.risk_score)}/100 · {String(row.risk_reasons || "")}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => void action({ action: "review_referral", referralId: row.id, status: "valid", reason: "Vérifié manuellement" })} className="kingdom-cta px-2 py-2 text-[11px]">Valider</button>
                <button onClick={() => void action({ action: "review_referral", referralId: row.id, status: "invalid", reason: "Parrainage non valide" })} className="kingdom-cta-ghost px-2 py-2 text-[11px]">Invalider</button>
              </div>
            </article>
          ))}
          {!held.length ? <Empty text="Aucun parrainage retenu." /> : null}
        </div>
      ) : null}

      {tab === "security" ? (
        <div className="mt-3 max-h-[62dvh] space-y-2 overflow-y-auto pe-1">
          {flags.map((row) => (
            <article key={String(row.id)} className="kingdom-glass p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-rose-300">{String(row.severity)} · {String(row.signal_type)}</p>
              <p className="mt-2 text-sm text-[#f3e6c8]">{String(row.reason)}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => void action({ action: "review_flag", flagId: row.id, status: "cleared", reason: "Alerte examinée et levée" })} className="kingdom-cta px-2 py-2 text-[11px]">Lever</button>
                <button onClick={() => void action({ action: "review_flag", flagId: row.id, status: "confirmed", reason: "Alerte confirmée" })} className="kingdom-cta-ghost px-2 py-2 text-[11px]">Confirmer</button>
              </div>
            </article>
          ))}
          {!flags.length ? <Empty text="Aucune alerte ouverte." /> : null}
        </div>
      ) : null}

      {tab === "settings" ? (
        <form
          className="kingdom-glass mt-3 space-y-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void action({
              action: "settings",
              reason: "Configuration du Challenge mise à jour",
              settings: {
                starts_at: new Date(String(form.get("startsAt"))).toISOString(),
                ends_at: new Date(String(form.get("endsAt"))).toISOString(),
                daily_points_cap: Number(form.get("dailyCap")),
                required_referrals: 2,
                referral_points: Number(form.get("referralPoints")),
                referral_points_cap: Number(form.get("referralCap")),
              },
            });
          }}
        >
          <AdminField label="Début" name="startsAt" type="datetime-local" defaultValue={dateInput(String(challenge.starts_at))} />
          <AdminField label="Fin" name="endsAt" type="datetime-local" defaultValue={dateInput(String(challenge.ends_at))} />
          <AdminField label="Plafond quotidien" name="dailyCap" type="number" defaultValue={String(challenge.daily_points_cap)} />
          <AdminField label="Points par ami activé" name="referralPoints" type="number" defaultValue={String(challenge.referral_points)} />
          <AdminField label="Plafond parrainage" name="referralCap" type="number" defaultValue={String(challenge.referral_points_cap)} />
          <div className="rounded-xl border border-[#c4a574]/20 p-3 text-xs text-[#f3e6c8]">Amis requis : <strong>2</strong></div>
          <button disabled={busy} className="kingdom-cta w-full py-3">Enregistrer</button>
        </form>
      ) : null}

      {message ? <p className="mt-3 text-center text-xs font-bold text-[#f0d78c]">{message}</p> : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="kingdom-glass p-3">
      <p className="text-2xl font-black text-[#f0d78c]">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[#c4a574]">{label}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="kingdom-glass p-6 text-center text-sm text-[#c4a574]">{text}</div>;
}

function AdminField({
  label,
  name,
  type,
  defaultValue,
}: {
  label: string;
  name: string;
  type: string;
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-[#c4a574]">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className="kingdom-input" />
    </label>
  );
}

function dateInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
