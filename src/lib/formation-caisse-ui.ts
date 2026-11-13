import { formatFcfa } from "@/lib/formation-pricing";

export type CaisseEntry = {
  id: string;
  entry_at: string;
  actor: string;
  kind: string;
  purpose: string;
  purpose_note: string | null;
  amount_fcfa: number;
  balance_before: number;
  balance_after: number;
};

const PURPOSE_FR: Record<string, string> = {
  certificate: "certificat",
  logo: "logo",
  copy: "photocopies",
  autre: "autre",
  registration: "inscription",
};

export function caissePurposeLabel(purpose: string, note: string | null) {
  const base = PURPOSE_FR[purpose.toLowerCase()] || purpose;
  if (purpose === "autre" && note?.trim()) return `${base} (${note.trim()})`;
  if (note?.trim() && purpose === "registration") return `${base} — ${note.trim()}`;
  return base;
}

/** Ex: 09/11/2026 · azolo · certificat · caisse 20 000 F · −12 000 F · reste 8 000 F */
export function formatCaisseLedgerLine(row: CaisseEntry) {
  const day = new Date(row.entry_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const actor = row.actor || "efaa";
  const label = caissePurposeLabel(row.purpose, row.purpose_note);
  const delta =
    row.kind === "expense"
      ? `−${formatFcfa(Number(row.amount_fcfa))}`
      : `+${formatFcfa(Number(row.amount_fcfa))}`;
  const before = formatFcfa(Number(row.balance_before));
  const after = formatFcfa(Number(row.balance_after));
  return `${day} · ${actor} · ${label} · caisse ${before} · ${delta} · reste ${after}`;
}
