"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { SiteFooter } from "@/components/landing/site-footer";
import { VipBadge } from "@/components/landing/vip-badge";
import { useI18n } from "@/i18n/provider";
import { usePwaInstall } from "@/lib/use-pwa-install";
import type { Level } from "@/i18n/translations";
import { composeWhatsapp, countries } from "@/lib/countries";
import { currentAuthUser } from "@/lib/auth-user";
import {
  readChallengeNext,
  rememberChallengeIntent,
} from "@/lib/challenge-api";
import { completePracticeProfile, restoreStudent } from "@/lib/efaa-db";
import { beginnerNextPath } from "@/lib/gamification";
import { startGoogleAuth } from "@/lib/google-auth";
import { isOfficialStudent, isPracticeProfileComplete, type EfaaStudent, type StudentStatus } from "@/lib/session";
import { WhatsAppSignupInvite } from "@/components/whatsapp-signup-invite";

const statuses: StudentStatus[] = ["student", "worker", "entrepreneur", "other"];
const levels: Level[] = ["beginner", "intermediate", "advanced"];

async function fileToDataUrl(file: File) {
  try {
    const bitmap = await createImageBitmap(file);
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    const scale = Math.max(size / bitmap.width, size / bitmap.height);
    ctx.drawImage(
      bitmap,
      (size - bitmap.width * scale) / 2,
      (size - bitmap.height * scale) / 2,
      bitmap.width * scale,
      bitmap.height * scale,
    );
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return "";
  }
}

export function AuthScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { canInstall, install } = usePwaInstall();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [photoName, setPhotoName] = useState("");
  const [prefill, setPrefill] = useState({ firstName: "", lastName: "" });
  const [invite, setInvite] = useState<{ student: EfaaStudent; next: string } | null>(null);

  useEffect(() => {
    let live = true;
    const query = new URLSearchParams(window.location.search);
    const next = query.get("next");
    const referral = query.get("ref") || undefined;
    if (next === "/challenge" || referral) rememberChallengeIntent(referral);
    (async () => {
      try {
        const student = await restoreStudent();
        if (!live) return;
        if (student && !isOfficialStudent(student) && isPracticeProfileComplete(student)) {
          const challengeNext = readChallengeNext(true);
          router.replace(challengeNext || (await beginnerNextPath(student)));
          return;
        }
        const user = await currentAuthUser();
        if (live) {
          const googleMail = (user?.email || "").toLowerCase();
          setEmail(googleMail.endsWith("@code.efatalk.fyi") ? "" : googleMail);
          const full = String(user?.user_metadata?.full_name || user?.user_metadata?.name || "").trim();
          const parts = full.split(/\s+/).filter(Boolean);
          const practice = student && !isOfficialStudent(student) ? student : null;
          setPrefill({
            firstName: practice?.firstName || parts[0] || "",
            lastName: practice?.lastName || parts.slice(1).join(" ") || "",
          });
        }
        if (live && new URLSearchParams(window.location.search).get("err") === "google") {
          setError(t.auth.googleError);
        }
      } catch {
        /* stay on gate */
      } finally {
        if (live) setReady(true);
      }
    })();
    return () => {
      live = false;
    };
  }, [router]);

  async function enterAcademy() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await startGoogleAuth();
    } catch {
      setError(t.auth.googleError);
      setBusy(false);
    }
  }

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const user = await currentAuthUser();
    if (!user?.email) {
      setError(t.auth.googleError);
      return;
    }
    const data = new FormData(form);
    const firstName = String(data.get("firstName") || "").trim();
    const lastName = String(data.get("lastName") || "").trim();
    const status = String(data.get("status") || "") as StudentStatus;
    const nationality = String(data.get("nationality") || "");
    const city = String(data.get("city") || "").trim();
    const localNumber = String(data.get("localNumber") || "").replace(/\D/g, "");
    const whatsapp = composeWhatsapp(String(data.get("dial") || ""), localNumber);
    const level = String(data.get("level") || "") as Level;
    const photoFile = data.get("photo");
    if (!firstName || !lastName || !status || !nationality || !city || localNumber.length < 6 || !level) {
      setError(t.auth.required);
      return;
    }
    setBusy(true);
    setError("");
    try {
      let photo: string | undefined;
      if (photoFile instanceof File && photoFile.size > 0 && photoFile.size < 400000) {
        photo = (await fileToDataUrl(photoFile)) || undefined;
      }
      const student = await completePracticeProfile(user, {
        firstName,
        lastName,
        status,
        nationality,
        city,
        whatsapp,
        level,
        photo,
      });
      const challengeNext = readChallengeNext(true);
      const next = challengeNext || (await beginnerNextPath(student));
      setInvite({ student, next });
      setBusy(false);
    } catch {
      setError(t.auth.saveError);
      setBusy(false);
    }
  }

  return (
    <div className="kingdom-shell min-h-dvh">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-4 pt-3 md:px-8">
        <p className="font-display text-[13px] text-[#e8d5b0] md:text-[15px]">English For All Academy</p>
        <div className="flex shrink-0 items-center gap-2">
          {canInstall ? (
            <button
              type="button"
              onClick={() => void install()}
              className="rounded-full bg-[#f0d78c] px-2.5 py-1 text-[10px] font-bold text-[#0c1b4d]"
            >
              {t.install.actionShort}
            </button>
          ) : null}
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pb-8 pt-8 md:max-w-xl md:pt-14">
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#c4a574]">{t.auth.kicker}</p>
        <h1 className="mt-2 font-display text-[34px] leading-tight text-[#f3e6c8] md:text-[44px]">{t.auth.title}</h1>
        <p className="mt-2 text-[13px] text-[#d8c7a4]/80 md:text-[15px]">
          {email ? t.auth.profileHint : t.auth.googleHint}
        </p>

        {!ready ? (
          <p className="mt-8 text-center text-[#d8c7a4]/70">…</p>
        ) : invite ? (
          <WhatsAppSignupInvite student={invite.student} onContinue={() => router.replace(invite.next)} />
        ) : !email ? (
          <motion.div
            className="kingdom-glass mt-8 space-y-4 p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <button
              type="button"
              onClick={() => void enterAcademy()}
              disabled={busy}
              className="kingdom-cta flex w-full items-center justify-center gap-3 py-3.5 text-[15px]"
            >
              <GoogleMark />
              {busy ? "…" : t.auth.title}
            </button>
            {error && <p className="text-center text-[12px] text-[#e2b07a]">{error}</p>}
          </motion.div>
        ) : (
          <motion.form
            onSubmit={onRegister}
            className="kingdom-glass mt-8 space-y-3 p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.email}</span>
              <input value={email} readOnly className="kingdom-input opacity-80" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.lastName}</span>
              <input name="lastName" defaultValue={prefill.lastName} autoComplete="family-name" className="kingdom-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.firstName}</span>
              <input name="firstName" defaultValue={prefill.firstName} autoComplete="given-name" className="kingdom-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.status}</span>
              <select name="status" defaultValue="" className="kingdom-input">
                <option value="" disabled>
                  {t.auth.status}
                </option>
                {statuses.map((id) => (
                  <option key={id} value={id}>
                    {t.auth.statuses[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.nationality}</span>
              <select name="nationality" defaultValue="" className="kingdom-input">
                <option value="" disabled>
                  {t.auth.nationality}
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.city}</span>
              <input name="city" autoComplete="address-level2" className="kingdom-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.dial}</span>
              <select name="dial" defaultValue="" className="kingdom-input">
                <option value="" disabled>
                  {t.auth.dial}
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.dial}>
                    {c.name} ({c.dial})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.localNumber}</span>
              <input name="localNumber" type="tel" inputMode="tel" className="kingdom-input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.level}</span>
              <select name="level" defaultValue="" className="kingdom-input">
                <option value="" disabled>
                  {t.auth.level}
                </option>
                {levels.map((id) => (
                  <option key={id} value={id}>
                    {t.levels[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] tracking-[0.16em] text-[#c4a574]">{t.auth.photo}</span>
              <input
                type="file"
                name="photo"
                accept="image/*"
                className="kingdom-input file:mr-3 file:rounded-full file:border-0 file:bg-[#c4a574] file:px-3 file:py-1 file:text-[11px] file:text-[#1a1408]"
                onChange={(e) => setPhotoName(e.target.files?.[0]?.name || "")}
              />
              {photoName && <p className="mt-1 text-[11px] text-[#d8c7a4]/70">{photoName}</p>}
            </label>
            {error && <p className="text-[12px] text-[#e2b07a]">{error}</p>}
            <button type="submit" disabled={busy} className="kingdom-cta relative z-50 w-full py-3.5">
              {busy ? "…" : t.auth.submit}
            </button>
          </motion.form>
        )}

      </main>
      {!email && <SiteFooter />}
      <VipBadge />
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#fff" d="M22.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9c-.3 1.4-1.1 2.6-2.3 3.4v2.8h3.7c2.2-2 3.2-5 3.2-8.3Z" />
      <path fill="#fff" d="M12 23c3 0 5.6-1 7.4-2.7l-3.7-2.8c-1 .7-2.3 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.6H2v2.9C3.8 20.7 7.6 23 12 23Z" />
      <path fill="#fff" d="M5.8 13.9c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6.6H2C1.2 8.3.8 10.1.8 12s.4 3.7 1.2 5.4l3.8-3.5Z" />
      <path fill="#fff" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3C17.6 1.4 15 0.4 12 .4 7.6.4 3.8 2.7 2 6.6l3.8 2.9C6.7 6.7 9.1 4.8 12 4.8Z" />
    </svg>
  );
}
