"use client";

import { useState } from "react";
import { formatFcfa } from "@/lib/formation-pricing";
import { formatCaisseLedgerLine, type CaisseEntry } from "@/lib/formation-caisse-ui";

const EXPENSE_PURPOSES = [
  { id: "certificate", label: "Certificat" },
  { id: "logo", label: "Logo" },
  { id: "copy", label: "Photocopies" },
  { id: "autre", label: "Autre (saisir la raison)" },
] as const;

type Props = {
  balance: number;
  entries: CaisseEntry[];
  busy: boolean;
  onExpense?: (payload: { purpose: string; purposeNote: string; amount: number }) => void | Promise<void>;
  variant?: "azolo" | "admin";
};

export function FormationCaissePanel({
  balance,
  entries,
  busy,
  onExpense,
  variant = "azolo",
}: Props) {
  const [purpose, setPurpose] = useState<(typeof EXPENSE_PURPOSES)[number]["id"]>("certificate");
  const [purposeNote, setPurposeNote] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const amount = Math.round(Number(expenseAmount.replace(/\D/g, "")) || 0);
  const after = amount > 0 ? balance - amount : null;
  const insufficient = after !== null && after < 0;

  const shell =
    variant === "admin"
      ? "rounded-2xl border border-white/15 bg-white/5 p-4 text-white"
      : "rounded-2xl border border-[#d4af37]/35 bg-white/55 p-4 text-[#0c4a6e]";

  const inputClass =
    variant === "admin"
      ? "mt-1 w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white"
      : "mt-1 w-full rounded-xl border border-[#7dd3fc]/40 bg-white/90 px-3 py-2 text-sm";

  async function submitExpense() {
    if (!onExpense) return;
    await onExpense({
      purpose,
      purposeNote: purpose === "autre" ? purposeNote.trim() : "",
      amount,
    });
    setExpenseAmount("");
    setPurposeNote("");
  }

  return (
    <div className="space-y-4">
      <div className={shell}>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#b8860b]">Caisse EFAA</p>
        <p className="mt-2 font-display text-3xl font-bold text-emerald-600 md:text-4xl">
          {formatFcfa(balance)}
        </p>
        <p className="mt-1 text-[11px] opacity-70">
          Inscription approuvée = entrée d’argent. Sortie = objet + montant + solde qui reste, enregistrés
          ici.
        </p>
      </div>

      {variant === "azolo" ? (
        <div className={shell}>
          <p className="text-xs font-bold uppercase tracking-wide opacity-80">Sortir de l’argent</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed opacity-75">
            <li>Choisir l’objet : certificat, logo, photocopies, ou autre.</li>
            <li>Indiquer le montant en FCFA.</li>
            <li>Vérifier le solde restant, puis valider.</li>
          </ol>
          <p className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-[10px] leading-relaxed opacity-70">
            Exemple : 09/11/2026 · azolo · certificat · caisse 20&nbsp;000&nbsp;F · −12&nbsp;000&nbsp;F ·
            reste 8&nbsp;000&nbsp;F
          </p>
          <div className="mt-3 grid gap-2">
            <label className="text-[11px] font-semibold opacity-90">
              Objet
              <select
                value={purpose}
                onChange={(e) =>
                  setPurpose(e.target.value as (typeof EXPENSE_PURPOSES)[number]["id"])
                }
                className={inputClass}
              >
                {EXPENSE_PURPOSES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            {purpose === "autre" ? (
              <label className="text-[11px] font-semibold opacity-90">
                Précisez
                <input
                  value={purposeNote}
                  onChange={(e) => setPurposeNote(e.target.value)}
                  placeholder="Raison de la dépense"
                  className={inputClass}
                />
              </label>
            ) : null}
            <label className="text-[11px] font-semibold opacity-90">
              Montant (FCFA)
              <input
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                inputMode="numeric"
                placeholder="Ex. 12000"
                className={inputClass}
              />
            </label>
            {amount > 0 ? (
              <div className="rounded-xl border border-dashed border-current/20 px-3 py-2 text-[11px]">
                <p>
                  Avant : <strong>{formatFcfa(balance)}</strong>
                </p>
                <p>
                  Sortie : <strong>−{formatFcfa(amount)}</strong>
                </p>
                <p className={insufficient ? "font-bold text-rose-600" : ""}>
                  Reste :{" "}
                  <strong>{insufficient ? "insuffisant" : formatFcfa(after as number)}</strong>
                </p>
              </div>
            ) : null}
            <button
              type="button"
              disabled={!!busy || amount <= 0 || insufficient}
              onClick={() => void submitExpense()}
              className="formation-cta rounded-full py-2.5 text-sm font-bold disabled:opacity-40"
            >
              Enregistrer la sortie
            </button>
          </div>
        </div>
      ) : null}

      <div className={shell}>
        <p className="text-xs font-bold uppercase tracking-wide opacity-80">Journal</p>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-[11px] leading-relaxed">
          {entries.map((row) => (
            <li
              key={row.id}
              className={
                variant === "admin" ? "rounded-lg bg-black/30 px-2 py-2" : "rounded-xl bg-white/60 px-3 py-2"
              }
            >
              {formatCaisseLedgerLine(row)}
            </li>
          ))}
          {!entries.length ? <li className="opacity-50">Aucun mouvement pour l’instant.</li> : null}
        </ul>
      </div>
    </div>
  );
}
