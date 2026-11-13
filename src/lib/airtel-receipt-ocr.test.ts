import test from "node:test";
import assert from "node:assert/strict";
import {
  parseAirtelReceiptText,
  normalizeReceiptText,
  receiptLooksLikeAirtelSms,
} from "./airtel-receipt-ocr.ts";

test("parses level0 7500 to Azolo number", () => {
  const raw = `
TID:CO261016.0952.B22524.Vous avez
envoye 7500.00 FCFA au 69592822
avec la REFNA. Le solde de votre
compte Airtel Money est 454.76 FCFA
`;
  const r = parseAirtelReceiptText(raw, "level0");
  assert.equal(r.ok, true);
  assert.equal(r.amount, 7500);
  assert.equal(r.phone, "69592822");
});

test("parses level1 10000 with spaced number", () => {
  const raw = `Vous avez envoye 10.000 FCFA au 69 592 822`;
  const r = parseAirtelReceiptText(raw, "level1");
  assert.equal(r.ok, true);
  assert.equal(r.amount, 10000);
});

test("rejects wrong phone", () => {
  const raw = `Vous avez envoye 7500 FCFA au 66464258`;
  const r = parseAirtelReceiptText(raw, "level0");
  assert.equal(r.ok, false);
});

test("receiptLooksLikeAirtelSms rejects noise", () => {
  assert.equal(receiptLooksLikeAirtelSms(normalizeReceiptText("hello random photo")), false);
});

test("parses ocr typo yvoye on itel lcd", () => {
  const raw = `yvoye
10000.00
FCFA a
Saleh,
Moussa`;
  const r = parseAirtelReceiptText(raw, "level1");
  assert.equal(r.ok, true);
  assert.equal(r.amount, 10000);
  assert.equal(r.phone, "69592822");
});

test("parses fragmented itel screen with 10000f", () => {
  const raw = `Corps du mes
envoye
10000.00
FCFA a
Saleh,
Moussa
Saleh 69*****`;
  const r = parseAirtelReceiptText(raw, "level1");
  assert.equal(r.ok, true);
  assert.equal(r.amount, 10000);
  assert.equal(r.phone, "69592822");
  assert.match(String(r.payeeName || "").toLowerCase(), /saleh/);
});
