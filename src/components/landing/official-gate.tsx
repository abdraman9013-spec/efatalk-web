"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { unlockOfficialCode } from "@/lib/efaa-db";
import { rememberVipCode, readVipCode } from "@/lib/google-auth";
import { saveCurrentStudent } from "@/lib/session";
import { VipOnboardingModal } from "@/components/onboarding/vip-onboarding-modal";

function looksComplete(code: string) {
  return /^efaa_[a-z0-9]{4,}$/i.test(code.trim());
}

export function OfficialGate() {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pendingCode, setPendingCode] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const stored = readVipCode();
    if (!stored) return;
    setPendingCode(stored);
    setShowOnboarding(true);
  }, []);

  async function unlock(raw: string) {
    const next = raw.trim().toLowerCase();
    if (!next || busy.current) return;
    busy.current = true;
    setError("");
    try {
      const result = await unlockOfficialCode(next);
      if (result.status === "invalid") {
        setError(t.official.invalid);
        return;
      }
      if (result.status === "profile") {
        saveCurrentStudent(result.student);
        router.push("/vip-dashboard");
        return;
      }
      rememberVipCode(result.code);
      setPendingCode(result.code);
      setShowOnboarding(true);
    } finally {
      busy.current = false;
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await unlock(code);
  }

  return (
    <>
      <section id="official" className="px-4 pb-4 pt-6">
        <div className="mx-auto w-full max-w-md border-t border-[#0c1b4d]/10 pt-5 md:max-w-lg">
          <form onSubmit={onSubmit} className="rounded-xl border border-[#0c1b4d]/10 bg-[#0c1b4d]/[0.03] p-3">
            <p className="px-0.5 text-[12px] leading-snug text-[#1a2a4a]/65">{t.official.landingPrompt}</p>
            <div className="mt-2 flex gap-1.5">
              <input
                ref={inputRef}
                name="code"
                type="text"
                inputMode="text"
                enterKeyHint="go"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                required
                value={code}
                placeholder={t.official.hint}
                className="min-w-0 flex-1 rounded-full border border-[#0c1b4d]/15 bg-white/80 px-3 py-1.5 text-[12px] text-[#0c1b4d] outline-none focus:border-[#9a7418]/50"
                onChange={(event) => {
                  const next = event.target.value;
                  setCode(next);
                  if (looksComplete(next)) void unlock(next);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  void unlock(code || event.currentTarget.value);
                }}
              />
              <button
                type="submit"
                className="rounded-full border border-[#0c1b4d]/15 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-[#0c1b4d]/80"
              >
                {t.official.enter}
              </button>
            </div>
            {error && <p className="mt-1.5 px-0.5 text-[12px] text-rose-600">{error}</p>}
          </form>
        </div>
      </section>

      <VipOnboardingModal
        code={pendingCode}
        open={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
        }}
      />
    </>
  );
}
