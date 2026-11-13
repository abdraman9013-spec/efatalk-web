"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ADMIN_CODE } from "@/lib/admin";
import { formatFcfa } from "@/lib/formation-pricing";
import { FormationCaissePanel } from "@/components/formation/formation-caisse-panel";
import type { CaisseEntry } from "@/lib/formation-caisse-ui";

type Settings = {
  discountEndsAt: string;
  discountActive: boolean;
  seats: { level: string; seatsTotal: number; remaining: number }[];
  caisseBalance: number;
};

export function FormationAdminPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [entries, setEntries] = useState<CaisseEntry[]>([]);
  const [discountAt, setDiscountAt] = useState("");
  const [level0, setLevel0] = useState(9);
  const [level1, setLevel1] = useState(9);
  const [saved, setSaved] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/formation/settings", { cache: "no-store" });
    const json = (await res.json()) as Settings;
    const caisse = await fetch(`/api/formation/caisse?code=${ADMIN_CODE}`, { cache: "no-store" });
    const cj = (await caisse.json()) as { entries?: CaisseEntry[]; balance?: number };
    setEntries(cj.entries || []);
    setSettings({
      ...json,
      caisseBalance: typeof cj.balance === "number" ? cj.balance : json.caisseBalance,
    });
    setDiscountAt(json.discountEndsAt?.slice(0, 16) || "");
    const s0 = json.seats?.find((s) => s.level === "level0");
    const s1 = json.seats?.find((s) => s.level === "level1");
    if (s0) setLevel0(s0.seatsTotal);
    if (s1) setLevel1(s1.seatsTotal);
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [refresh]);

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    setSaved("");
    const res = await fetch("/api/formation/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminCode: ADMIN_CODE,
        discountEndsAt: new Date(discountAt).toISOString(),
        discountActive: true,
        level0Seats: level0,
        level1Seats: level1,
      }),
    });
    if (res.ok) {
      setSaved("ok");
      await refresh();
    } else setSaved("err");
  }

  const balance = settings?.caisseBalance ?? 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
        <h3 className="text-sm font-bold text-[#f0d78c]">Formation privée · Caisse EFAA</h3>
        <p className="mt-2 font-display text-2xl font-bold text-emerald-300">{formatFcfa(balance)}</p>
        <p className="mt-1 text-[11px] text-white/55">
          Même journal que le bureau Azolo — mise à jour automatique toutes les quelques secondes.
        </p>
      </div>

      <form onSubmit={(e) => void saveSettings(e)} className="space-y-3 rounded-2xl border border-white/15 bg-white/5 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-white/70">Places & promo</p>
        <label className="block text-[11px] text-white/55">
          Fin promo (date/heure)
          <input
            type="datetime-local"
            value={discountAt}
            onChange={(e) => setDiscountAt(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm text-white"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px] text-white/55">
            Places Level 0
            <input
              type="number"
              min={0}
              max={99}
              value={level0}
              onChange={(e) => setLevel0(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm text-white"
            />
          </label>
          <label className="text-[11px] text-white/55">
            Places Level 1
            <input
              type="number"
              min={0}
              max={99}
              value={level1}
              onChange={(e) => setLevel1(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-2 py-2 text-sm text-white"
            />
          </label>
        </div>
        <button type="submit" className="rounded-full bg-[#f0d78c] px-4 py-2 text-xs font-bold text-[#1a1200]">
          Enregistrer
        </button>
        {saved === "ok" ? <p className="text-xs text-emerald-400">Sauvegardé</p> : null}
      </form>

      <FormationCaissePanel balance={balance} entries={entries} busy={false} variant="admin" />
    </div>
  );
}
