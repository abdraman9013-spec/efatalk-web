"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { composeWhatsapp, countries, DEFAULT_COUNTRY } from "@/lib/countries";
import { findPracticeByWhatsapp, registerActiveStudent } from "@/lib/efaa-db";
import { clearVipCode } from "@/lib/google-auth";
import { saveCurrentStudent, splitFullName, type EfaaStudent, type StudentStatus } from "@/lib/session";
import type { Level } from "@/i18n/translations";
import { firstNameOf } from "@/lib/flame-copy";
import { fetchOwnWhatsAppGroup, whatsappJoinedStorageKey } from "@/lib/whatsapp-groups";

type Props = {
  code: string;
  open: boolean;
  onClose: () => void;
};

const statuses: StudentStatus[] = ["pupil", "student", "worker", "entrepreneur", "other"];
const launchLevels: { id: Level; label: string }[] = [
  { id: "beginner", label: "Level 0" },
  { id: "intermediate", label: "Level 1" },
];

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

export function VipOnboardingModal({ code, open, onClose }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState<EfaaStudent | null>(null);
  const [inviteHref, setInviteHref] = useState<string | null>(null);
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [level, setLevel] = useState<Level>("beginner");
  const [photoName, setPhotoName] = useState("");
  const [known, setKnown] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const { firstName, lastName } = splitFullName(String(data.get("fullName") || ""));
    const status = String(data.get("status") || "") as StudentStatus;
    const nationality = String(data.get("nationality") || DEFAULT_COUNTRY);
    const localNumber = String(data.get("localNumber") || "").replace(/\D/g, "");
    const whatsapp = composeWhatsapp(String(data.get("dial") || "+235"), localNumber);
    const photoFile = data.get("photo");

    if (!firstName || !status || localNumber.length < 6) {
      setError(t.auth.required);
      return;
    }

    setLoading(true);
    try {
      let photo: string | undefined;
      if (photoFile instanceof File && photoFile.size > 0 && photoFile.size < 400000) {
        photo = (await fileToDataUrl(photoFile)) || undefined;
      }
      const practice = await findPracticeByWhatsapp(whatsapp);
      const result = await registerActiveStudent({
        accessCode: code,
        firstName,
        lastName,
        status,
        nationality,
        city: nationality === "TD" ? "N'Djaména" : "—",
        whatsapp,
        level,
        photo: photo || practice?.photo,
      });
      saveCurrentStudent(result.student);
      clearVipCode();
      setInvite(result.student);
      const group = await fetchOwnWhatsAppGroup(result.student.level);
      setInviteHref(group?.href || null);
    } catch {
      setError(t.official.invalid);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label={t.admin.home}
            className="absolute inset-0 bg-sky-200/45 backdrop-blur-md"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vip-onboarding-title"
            className="relative z-10 my-auto w-full max-w-lg overflow-hidden rounded-[2rem] border border-sky-200/80 bg-white/85 shadow-[0_24px_80px_rgba(56,189,248,.28)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 36, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
          >
            <motion.div
              className="pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full bg-sky-300/70 blur-3xl"
              animate={{ x: [0, 18, -8, 0], y: [0, -14, 10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute -bottom-16 -right-8 h-52 w-52 rounded-full bg-amber-300/35 blur-3xl"
              animate={{ x: [0, -16, 12, 0], y: [0, 12, -10, 0] }}
              transition={{ duration: 9.5, repeat: Infinity, ease: "easeInOut" }}
            />

            {invite ? (
              <div className="relative p-6 md:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-sky-600">
                  {t.waGroup.personalKicker.replaceAll("{level}", t.levels[invite.level])}
                </p>
                <h2 className="mt-2 font-display text-3xl text-slate-900">{t.waGroup.join}</h2>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-600">
                  {t.waGroup.personalBody
                    .replaceAll("{name}", firstNameOf(invite.firstName) || t.lobby.you)
                    .replaceAll("{level}", t.levels[invite.level])}
                </p>
                {inviteHref ? (
                  <a
                    href={inviteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex w-full items-center justify-center rounded-full bg-emerald-600 py-3.5 text-[15px] font-bold text-white"
                    onClick={() => {
                      try {
                        localStorage.setItem(whatsappJoinedStorageKey(invite.id, invite.level, inviteHref), "1");
                      } catch {
                        /* ignore */
                      }
                      onClose();
                      router.replace("/vip-dashboard");
                    }}
                  >
                    {t.waGroup.join}
                  </a>
                ) : null}
                <button
                  type="button"
                  className="mt-2 w-full rounded-full border border-slate-300 py-3 text-[14px] font-semibold text-slate-700"
                  onClick={() => {
                    onClose();
                    router.replace("/vip-dashboard");
                  }}
                >
                  {t.waGroup.later}
                </button>
              </div>
            ) : (
            <form onSubmit={onSubmit} className="relative p-6 md:p-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-sky-600">
                English For All Academy
              </p>
              <h2 id="vip-onboarding-title" className="mt-2 font-display text-3xl text-slate-900">
                {t.official.formTitle}
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{t.official.formHint}</p>

              <label className="mt-5 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  {t.official.fullName}
                </span>
                <input name="fullName" required className="vip-sky-field" placeholder={t.official.fullNameHint} />
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  {t.auth.status}
                </span>
                <select name="status" defaultValue="pupil" required className="vip-sky-field">
                  {statuses.map((id) => (
                    <option key={id} value={id}>
                      {t.auth.statuses[id]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  {t.auth.nationality}
                </span>
                <select
                  name="nationality"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="vip-sky-field"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-3 grid grid-cols-[1fr_1.2fr] gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                    {t.auth.dial}
                  </span>
                  <select name="dial" defaultValue="+235" className="vip-sky-field">
                    {countries.map((c) => (
                      <option key={c.code} value={c.dial}>
                        {c.dial}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                    WhatsApp
                  </span>
                  <input
                    name="localNumber"
                    type="tel"
                    inputMode="tel"
                    required
                    className="vip-sky-field"
                    placeholder="6X XX XX XX"
                    onBlur={async (event) => {
                      const digits = event.target.value.replace(/\D/g, "");
                      if (digits.length < 8) return;
                      const practice = await findPracticeByWhatsapp(digits);
                      if (practice) setKnown(t.official.alreadyKnown);
                    }}
                  />
                </label>
              </div>
              {known ? <p className="mt-2 text-[12px] font-medium text-sky-700">{known}</p> : null}

              <div className="mt-3">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  {t.auth.level}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {launchLevels.map((lv) => (
                    <button
                      key={lv.id}
                      type="button"
                      onClick={() => setLevel(lv.id)}
                      className={`rounded-2xl border px-3 py-3 text-sm font-black transition ${
                        level === lv.id
                          ? "border-amber-300 bg-gradient-to-r from-sky-400 to-blue-600 text-white shadow-[0_10px_24px_rgba(56,189,248,.35)]"
                          : "border-sky-200 bg-white/70 text-sky-800"
                      }`}
                    >
                      {lv.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="mt-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  {t.auth.photo}
                </span>
                <input
                  type="file"
                  name="photo"
                  accept="image/*"
                  className="vip-sky-field file:mr-3 file:rounded-full file:border-0 file:bg-sky-400 file:px-3 file:py-1 file:text-[11px] file:text-white"
                  onChange={(e) => setPhotoName(e.target.files?.[0]?.name || "")}
                />
                {photoName ? <p className="mt-1 text-[11px] text-slate-500">{photoName}</p> : null}
              </label>

              {error ? <p className="mt-3 text-[12px] font-medium text-rose-500">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-sky-400 via-sky-500 to-amber-400 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_32px_rgba(56,189,248,.4)] transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "…" : t.official.openProfile}
              </button>
            </form>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
