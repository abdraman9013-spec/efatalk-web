"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { countries, composeWhatsapp, DEFAULT_COUNTRY } from "@/lib/countries";
import {
  AZOLO_AIRTEL,
  FORMATION_OFFERS,
  formatFcfa,
  type FormationLevel,
} from "@/lib/formation-pricing";
import {
  clearFormationEnroll,
  rememberFormationEnroll,
  readFormationEnroll,
} from "@/lib/formation-auth";
import { startGoogleAuth } from "@/lib/google-auth";
import { getSupabase } from "@/lib/supabase";
import { useI18n } from "@/i18n/provider";
import { compressReceiptImageForUpload } from "@/lib/formation-receipt-image";
import { clientOcrFormationReceipt } from "@/lib/formation-receipt-client-ocr";
import { parseAirtelReceiptText } from "@/lib/airtel-receipt-ocr";

type Step = "pay" | "auth" | "profile" | "pending" | "approved";

export function FormationEnrollWizard({
  level,
  onClose,
  onSwitchLevel,
}: {
  level: FormationLevel;
  onClose: () => void;
  onSwitchLevel?: (next: FormationLevel) => void;
}) {
  const { t } = useI18n();
  const w = t.formationPrivate.wizard;
  const offer = FORMATION_OFFERS[level];
  const duration =
    level === "level0" ? t.formationPrivate.duration0 : t.formationPrivate.duration1;

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("pay");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggestLevel, setSuggestLevel] = useState<FormationLevel | null>(null);
  const [applicationId, setApplicationId] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const dial = useMemo(
    () => countries.find((c) => c.code === country)?.dial || "+235",
    [country],
  );

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    void fetch("/api/formation/ocr-warm", { cache: "no-store" }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const saved = readFormationEnroll();
    if (!saved || saved.level !== level) return;
    setApplicationId(saved.applicationId);
    setToken(saved.token);
    void (async () => {
      const { data } = await getSupabase().auth.getSession();
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
        setStep("profile");
      } else {
        setStep("auth");
      }
    })();
  }, [level]);

  function pickFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : "");
    setError("");
    setSuggestLevel(null);
  }

  async function verifyShot() {
    if (!file) {
      setError(w.errOcr);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const uploadFile = await compressReceiptImageForUpload(file);
      const { text: ocrText, parsed: localParsed } = await clientOcrFormationReceipt(
        uploadFile,
        level,
      );
      const fd = new FormData();
      fd.set("level", level);
      fd.set("file", uploadFile);
      if (ocrText.length >= 16) fd.set("ocrText", ocrText);
      if (!localParsed.ok) {
        const alt = level === "level0" ? "level1" : "level0";
        const altParsed = parseAirtelReceiptText(ocrText, alt);
        if (altParsed.ok && altParsed.amount != null) {
          setSuggestLevel(alt);
          setError(
            w.errWrongLevel
              .replace("{amount}", formatFcfa(altParsed.amount))
              .replace("{level}", FORMATION_OFFERS[alt].label),
          );
          return;
        }
      }
      const res = await fetch("/api/formation/verify-receipt", { method: "POST", body: fd });
      const json = (await res.json()) as {
        ok?: boolean;
        applicationId?: string;
        token?: string;
        amount?: number;
        error?: string;
        reasons?: string[];
        paidAmount?: number;
        suggestLevel?: FormationLevel;
        payeeName?: string;
      };
      if (json.error === "level-mismatch" && json.suggestLevel && json.paidAmount) {
        setSuggestLevel(json.suggestLevel);
        setError(
          w.errWrongLevel
            .replace("{amount}", formatFcfa(json.paidAmount))
            .replace("{level}", FORMATION_OFFERS[json.suggestLevel].label),
        );
        return;
      }
      if (json.error === "ocr-reject" && json.reasons?.includes?.("ocr-timeout")) {
        setError(w.errOcrSlow);
        return;
      }
      if (!res.ok || !json.ok || !json.applicationId || !json.token) {
        setError(w.errOcr);
        return;
      }
      setApplicationId(json.applicationId);
      setToken(json.token);
      rememberFormationEnroll({
        applicationId: json.applicationId,
        token: json.token,
        level,
        amount: json.amount || offer.firstAmount,
      });
      const { data } = await getSupabase().auth.getSession();
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
        setStep("profile");
      } else {
        setStep("auth");
      }
    } catch {
      setError(w.errOcr);
    } finally {
      setBusy(false);
    }
  }

  async function goGoogle() {
    setBusy(true);
    setError("");
    try {
      await startGoogleAuth("/formation-privee?enroll=1");
    } catch {
      setError(w.errAuth);
      setBusy(false);
    }
  }

  async function submitProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    const fullName = String(data.get("fullName") || "").trim();
    const local = String(data.get("localNumber") || "").replace(/\D/g, "");
    const whatsapp = composeWhatsapp(dial, local);
    try {
      const { data: session } = await getSupabase().auth.getSession();
      const access = session.session?.access_token;
      if (!access) {
        setError(w.errAuth);
        setStep("auth");
        return;
      }
      const res = await fetch("/api/formation/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({
          applicationId,
          token,
          fullName,
          country,
          whatsapp,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        email?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error || w.errOcr);
        return;
      }
      setEmail(json.email || email);
      setStep("pending");
    } catch {
      setError(w.errOcr);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (step !== "pending" || !applicationId) return;
    const tick = async () => {
      try {
        const { data } = await getSupabase().auth.getSession();
        if (!data.session?.access_token) return;
        const res = await fetch(`/api/formation/status?id=${encodeURIComponent(applicationId)}`, {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        });
        const json = (await res.json()) as { status?: string; accessCode?: string | null };
        if (json.status === "approved" && json.accessCode) {
          setAccessCode(json.accessCode);
          setStep("approved");
          clearFormationEnroll();
        }
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 20000);
    return () => window.clearInterval(id);
  }, [step, applicationId]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0b3a5c]/35 p-3 backdrop-blur-md sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="formation-glass relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[28px] p-5 shadow-[0_30px_80px_rgba(12,80,120,0.25)]"
      >
        <button
          type="button"
          onClick={() => {
            if (step === "pending" || step === "approved") clearFormationEnroll();
            onClose();
          }}
          className="absolute right-3 top-3 rounded-full bg-white/70 px-3 py-1 text-[11px] font-bold text-[#0c4a6e]"
        >
          ✕
        </button>

        <p className="formation-text-dark text-[10px] font-black uppercase tracking-[0.24em] text-[#b8860b]">
          {offer.label} · {duration}
        </p>

        <AnimatePresence mode="wait">
          {step === "pay" ? (
            <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="mt-2 font-display text-2xl text-[#0c4a6e]">{w.payTitle}</h3>

              <div className="mt-4 space-y-3">
                <div className="rounded-2xl bg-white/65 px-4 py-3">
                  <p className="formation-text-dark text-[11px] font-black uppercase tracking-wide text-[#b8860b]">
                    {w.step1Title}
                  </p>
                  <p className="formation-text-dark mt-1 text-sm leading-relaxed">{w.step1Body}</p>
                  <div className="mt-3 rounded-xl border border-[#d4af37]/35 bg-white px-3 py-3 text-center">
                    <p className="formation-text-dark text-[10px] font-bold uppercase">{w.number}</p>
                    <p className="formation-text-dark mt-1 font-display text-3xl tracking-wide">{AZOLO_AIRTEL}</p>
                    <p className="formation-text-dark mt-1 text-sm font-bold">{formatFcfa(offer.firstAmount)}</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-white/65 px-4 py-3">
                  <p className="formation-text-dark text-[11px] font-black uppercase tracking-wide text-[#b8860b]">
                    {w.step2Title}
                  </p>
                  <p className="formation-text-dark mt-1 text-sm leading-relaxed">{w.step2Body}</p>
                </div>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(ev) => pickFile(ev.target.files?.[0] || null)}
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="formation-cta mt-5 w-full rounded-full py-3.5 text-sm font-bold"
              >
                {w.upload}
              </button>
              <p className="formation-text-dark mt-2 text-center text-[11px] font-medium">{w.uploadHint}</p>

              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt=""
                  className="mt-4 max-h-40 w-full rounded-xl object-contain ring-1 ring-[#d4af37]/30"
                />
              ) : null}

              {error ? (
                <p className="mt-3 text-center text-[12px] font-semibold text-rose-600">{error}</p>
              ) : null}

              {suggestLevel && onSwitchLevel ? (
                <button
                  type="button"
                  className="formation-cta mt-3 w-full rounded-full py-3 text-sm font-bold"
                  onClick={() => {
                    onSwitchLevel(suggestLevel);
                    setSuggestLevel(null);
                    setError("");
                  }}
                >
                  {w.switchLevel.replace("{level}", FORMATION_OFFERS[suggestLevel].label)}
                </button>
              ) : null}

              <button
                type="button"
                disabled={busy || !file}
                onClick={() => void verifyShot()}
                className="mt-4 w-full rounded-full border-2 border-[#0c4a6e]/25 bg-white/80 py-3.5 text-sm font-bold text-[#0c4a6e] disabled:opacity-45"
              >
                {busy ? w.verifying : w.verify}
              </button>
            </motion.div>
          ) : null}

          {step === "auth" ? (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h3 className="mt-2 font-display text-2xl text-[#0c4a6e]">{w.google}</h3>
              <p className="formation-text-dark mt-2 text-sm">{w.errAuth}</p>
              {error ? <p className="mt-3 text-[12px] font-semibold text-rose-600">{error}</p> : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => void goGoogle()}
                className="formation-cta mt-5 w-full rounded-full py-3.5 text-sm font-bold"
              >
                {busy ? "…" : w.google}
              </button>
            </motion.div>
          ) : null}

          {step === "profile" ? (
            <motion.form
              key="profile"
              onSubmit={(e) => void submitProfile(e)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <h3 className="mt-2 font-display text-2xl text-[#0c4a6e]">{w.profile}</h3>
              <p className="formation-text-dark rounded-xl bg-white/70 px-3 py-2 text-[12px] font-semibold">
                Email · {email || "Google"}
              </p>
              <input
                name="fullName"
                required
                placeholder={w.name}
                className="formation-text-dark w-full rounded-xl border border-[#7dd3fc]/50 bg-white/80 px-3 py-3 text-sm outline-none focus:border-[#d4af37]"
              />
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="formation-text-dark w-full rounded-xl border border-[#7dd3fc]/50 bg-white/80 px-3 py-3 text-sm"
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <span className="formation-text-dark rounded-xl bg-white/80 px-3 py-3 text-sm font-bold">
                  {dial}
                </span>
                <input
                  name="localNumber"
                  required
                  inputMode="tel"
                  placeholder={w.whatsapp}
                  className="formation-text-dark min-w-0 flex-1 rounded-xl border border-[#7dd3fc]/50 bg-white/80 px-3 py-3 text-sm"
                />
              </div>
              {error ? <p className="text-[12px] font-semibold text-rose-600">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="formation-cta w-full rounded-full py-3.5 text-sm font-bold"
              >
                {busy ? "…" : w.submit}
              </button>
            </motion.form>
          ) : null}

          {step === "pending" ? (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="mt-2 font-display text-2xl text-[#0c4a6e]">{w.pendingTitle}</h3>
              <p className="formation-text-dark mt-2 text-sm leading-relaxed">{w.pendingBody}</p>
              <div className="mt-5 flex justify-center">
                <span className="formation-pulse h-14 w-14 rounded-full border-2 border-[#d4af37]" />
              </div>
            </motion.div>
          ) : null}

          {step === "approved" ? (
            <motion.div key="approved" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3 className="mt-2 font-display text-2xl text-[#0c4a6e]">{w.approvedTitle}</h3>
              <p className="formation-text-dark mt-3 text-[10px] font-bold uppercase tracking-wide text-[#8a6a12]">
                {w.codeLabel}
              </p>
              <p className="font-display text-3xl text-[#0c4a6e]">{accessCode}</p>
              <a
                href="/"
                className="formation-cta mt-5 inline-flex w-full items-center justify-center rounded-full py-3.5 text-sm font-bold"
                onClick={() => clearFormationEnroll()}
              >
                {w.openProfile}
              </a>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
