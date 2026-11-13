import {
  AZOLO_AIRTEL,
  FORMATION_OFFERS,
  type FormationLevel,
} from "./formation-pricing";

export type ReceiptParseResult = {
  ok: boolean;
  amount: number | null;
  phone: string | null;
  /** Best-effort beneficiary name on small feature-phone SMS screens. */
  payeeName?: string | null;
  reasons: string[];
  normalized: string;
};

/** Collapse OCR noise while keeping digits findable. */
export function normalizeReceiptText(raw: string) {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[|]/g, "l")
    .replace(/[oо]/gi, (m) => (/\d/.test(m) ? "0" : m))
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[–—−]/g, "-")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmounts(text: string) {
  const hits: number[] = [];
  const patterns = [
    /(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})(?:[.,]\d{1,2})?\s*(?:fcfa|f\b|cfa)?/gi,
    /\b(\d{4,5})\s*f(?:cfa)?\b/gi,
    /\b(\d{4,5})(?:[.,]\d{2})?\b/g,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const digits = m[1].replace(/[.\s]/g, "");
      const n = Number(digits);
      if (Number.isFinite(n) && n >= 1000 && n <= 500000) hits.push(n);
    }
  }
  return [...new Set(hits)];
}

function extractPayeeName(raw: string, normalized: string) {
  const betweenAmountAndPhone =
    normalized.match(
      /(?:envoye|envoyee?)\s+[\d.\s]+\s*(?:fcfa|f)?\s+(?:a\s+)?([a-z][a-z\s]{2,40})(?:\s+\d|$)/,
    )?.[1] ||
    normalized.match(/fcfa\s+a\s+([a-z][a-z\s]{2,40})/)?.[1];
  if (betweenAmountAndPhone) {
    const clean = betweenAmountAndPhone.replace(/\s+/g, " ").trim();
    if (clean.length >= 3) return clean;
  }
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/[^a-zA-ZÀ-ÿ\s]/g, " ").trim())
    .filter(Boolean);
  const skip = /^(corps|envoye|envoy|fcfa|optio|retour|message|mes)$/i;
  const nameParts: string[] = [];
  for (const line of lines) {
    if (skip.test(line) || /\d{3,}/.test(line)) continue;
    if (/^[a-zA-ZÀ-ÿ]{2,20}(\s+[a-zA-ZÀ-ÿ]{2,20}){0,2}$/.test(line)) {
      nameParts.push(line);
    }
  }
  if (nameParts.length) return nameParts.slice(0, 3).join(" ").trim();
  return null;
}

function fuzzyEnvoye(normalized: string, raw = "") {
  const blob = `${normalized} ${raw.toLowerCase()}`;
  return (
    blob.includes("envoye") ||
    blob.includes("envoyee") ||
    blob.includes("envoie") ||
    /\benvo[yvj][eé]?\b/.test(blob) ||
    /\benvov/.test(blob) ||
    /\b[yvn]voy/.test(blob) ||
    blob.includes("yvoye") ||
    blob.includes("vvoye")
  );
}

/** Drop wizard UI text when the student photographs the whole screen by mistake. */
export function extractSmsCorpsFromOcr(raw: string) {
  const ui =
    /etape|televerser|téléverser|efatalk|formation|appelle mr|numero airtel|numéro airtel|galerie|verifier mon|vérifier mon|image refus|photo illisible|google|open.*galerie|montant d.inscription|money au num/i;
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const filtered: string[] = [];
  let skipUiAmount = false;
  for (const line of lines) {
    if (ui.test(line) || /^1[0-9]:[0-5]\d/.test(line)) continue;
    const compact = line.replace(/\s/g, "");
    if (compact === "69592822" || /^numeroairtelmoney/i.test(line.replace(/\s/g, ""))) {
      skipUiAmount = true;
      continue;
    }
    if (skipUiAmount && /^\d{4,5}\s*f?$/i.test(line)) {
      skipUiAmount = false;
      continue;
    }
    skipUiAmount = false;
    filtered.push(line);
  }
  const signal = filtered.filter((l) =>
    /envoy|yvoy|vvoy|fcfa|saleh|moussa|corps du|\d{4,5}[.,]?\d{0,2}/i.test(l),
  );
  if (signal.length >= 3) return signal.join("\n");
  return filtered.join("\n");
}

function itelMessageBody(
  raw: string,
  normalized: string,
  amounts: number[],
  payeeName: string | null,
) {
  const corps = /corps du m/i.test(raw) || normalized.includes("corps du m");
  const fcfa = normalized.includes("fcfa") || raw.toLowerCase().includes("fcfa");
  const send = fuzzyEnvoye(normalized, raw) || corps;
  if (amounts.length > 0 && (fcfa || corps) && send) return true;
  if (
    amounts.length > 0 &&
    fcfa &&
    /\bfcfa\s+a\b/.test(normalized) &&
    payeeName &&
    payeeName.replace(/\s+/g, " ").length >= 3
  ) {
    return true;
  }
  return false;
}

function extractPhones(text: string) {
  const digitsOnly = text.replace(/\D/g, "");
  const phones: string[] = [];
  if (digitsOnly.includes(AZOLO_AIRTEL)) phones.push(AZOLO_AIRTEL);
  if (/6959/.test(text)) phones.push(AZOLO_AIRTEL);
  if (/59\s*28\s*22/.test(text) || digitsOnly.includes("592822")) phones.push(AZOLO_AIRTEL);
  if (/6959/.test(text) && (/\*{2,}/.test(text) || /69\s*\*{3,}/.test(text))) {
    phones.push(AZOLO_AIRTEL);
  }
  const compact = text.replace(/\s+/g, "");
  const re = /(?:\+?235)?0?(\d{8})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(compact))) {
    if (m[1] === AZOLO_AIRTEL) phones.push(m[1]);
  }
  const loose = text.match(/\bau\s+(\d[\d\s.-]{6,14}\d)/gi) || [];
  for (const chunk of loose) {
    const d = chunk.replace(/\D/g, "").slice(-8);
    if (d.length === 8 && d === AZOLO_AIRTEL) phones.push(d);
  }
  return [...new Set(phones)];
}

export function parseAirtelReceiptText(
  raw: string,
  level: FormationLevel,
): ReceiptParseResult {
  const cleaned = extractSmsCorpsFromOcr(raw);
  const body = cleaned.length >= 12 ? cleaned : raw;
  const normalized = normalizeReceiptText(body);
  const reasons: string[] = [];
  const offer = FORMATION_OFFERS[level];

  const amounts = extractAmounts(normalized + " " + body.toLowerCase());

  const payeeName = extractPayeeName(body, normalized);

  const sentHint =
    /vous avez\s+envoye|vous avez\s+envoy/.test(normalized) ||
    /envoye\s+\d|envoyee?\s+\d|envoi\s+\d/.test(normalized) ||
    (normalized.includes("airtel") && fuzzyEnvoye(normalized, body)) ||
    (fuzzyEnvoye(normalized, body) && amounts.length > 0) ||
    itelMessageBody(body, normalized, amounts, payeeName);

  if (!sentHint) {
    reasons.push("missing-sent-phrase");
  }

  const phones = extractPhones(body + " " + normalized);
  let phoneHit =
    phones.find((p) => p === AZOLO_AIRTEL || p.endsWith(AZOLO_AIRTEL)) || null;
  const amount =
    amounts.find((a) => offer.acceptedFirst.includes(a)) ??
    amounts.find((a) =>
      [offer.firstAmount, offer.total, offer.listTotal].includes(a),
    ) ??
    null;

  if (amount == null) {
    reasons.push("amount-mismatch");
  }

  if (
    !phoneHit &&
    amount != null &&
    sentHint &&
    (itelMessageBody(body, normalized, [amount], payeeName) ||
      (payeeName && /\bfcfa\s+a\b/.test(normalized)))
  ) {
    phoneHit = AZOLO_AIRTEL;
  }

  if (!phoneHit) {
    reasons.push("missing-azolo-number");
  }

  const ok = Boolean(phoneHit && amount != null && sentHint);
  if (ok) reasons.length = 0;

  return {
    ok,
    amount: amount ?? null,
    phone: phoneHit,
    payeeName,
    reasons: ok ? [] : reasons,
    normalized,
  };
}

export function receiptLooksLikeAirtelSms(normalized: string, raw = "") {
  if (normalized.length < 8 && raw.length < 20) return false;
  const hasMoney =
    normalized.includes("airtel") ||
    normalized.includes("fcfa") ||
    normalized.includes("money") ||
    /\b\d{4,5}\s*f\b/.test(normalized) ||
    /\b(7500|10000|12500|15000|17500|20000)(?:[.,]\d{2})?\b/.test(normalized + " " + raw);
  const hasSend =
    fuzzyEnvoye(normalized, raw) ||
    normalized.includes("vous avez") ||
    /corps du m/i.test(raw) ||
    (/\bfcfa\s+a\b/.test(normalized) && /saleh|moussa|[a-z]{3,}\s+[a-z]{3,}/.test(normalized));
  return hasMoney && hasSend;
}

/** Quick self-check against the SMS example shape. */
export function smokeParseExample() {
  const sample = `
TID:CO261016.0952.B22524.Vous avez
envoye 7500.00 FCFA au 69592822
avec la REFNA. Le solde de votre
compte Airtel Money est 454.76 FCFA
`;
  return parseAirtelReceiptText(sample, "level0");
}
