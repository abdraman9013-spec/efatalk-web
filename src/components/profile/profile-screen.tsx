"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/landing/language-switcher";
import { SiteFooter } from "@/components/landing/site-footer";
import { VipBadge } from "@/components/landing/vip-badge";
import { useI18n } from "@/i18n/provider";
import { findStudentByEmail } from "@/lib/efaa-db";
import { beginnerNextPath } from "@/lib/gamification";
import {
  readCurrentStudent,
  readRememberedEmail,
  roomPath,
  saveCurrentStudent,
  studentBoardName,
  type EfaaStudent,
} from "@/lib/session";

export function ProfileScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [student, setStudent] = useState<EfaaStudent | null>(null);

  useEffect(() => {
    const local = readCurrentStudent();
    if (local && (local.kind === "official" || local.accessCode)) {
      setStudent(local);
      if (local.kind === "official" || local.accessCode) {
        router.replace("/vip-dashboard");
        return;
      }
      const email = local.email || readRememberedEmail();
      if (!email) return;
      findStudentByEmail(email)
        .then((fresh) => {
          if (!fresh) return;
          saveCurrentStudent(fresh);
          setStudent(fresh);
        })
        .catch(() => undefined);
      return;
    }
    router.replace("/");
  }, [router]);

  if (!student) return <div className="kingdom-shell min-h-dvh" />;

  const paid = student.amountPaid || 0;
  const due = student.amountDue || 0;
  const remaining = Math.max(due - paid, 0);

  return (
    <div className="kingdom-shell min-h-dvh">
      <header className="flex items-center justify-between px-4 pt-3">
        <p className="font-display text-[13px] text-[#e8d5b0]">English For All Academy</p>
        <LanguageSwitcher />
      </header>
      <main className="mx-auto max-w-md px-4 pb-36 pt-8">
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#c4a574]">{t.profile.title}</p>
        <h1 className="mt-2 font-display text-[34px] text-[#f3e6c8]">
          {studentBoardName(student)}
        </h1>
        <div className="kingdom-glass mt-5 space-y-3 p-4">
          <p className="text-[13px] text-[#d8c7a4]/80">{student.email}</p>
          <p className="font-display text-[22px] text-[#f3e6c8]">{t.levels[student.level]}</p>
          <p className="text-[14px] text-[#c4a574]">
            {t.profile.paid}: {paid.toLocaleString()} FCFA
          </p>
          <p className="text-[14px] text-[#c4a574]">
            {t.profile.remaining}: {remaining.toLocaleString()} FCFA
          </p>
          <p className="text-[12px] text-[#d8c7a4]/70">{t.profile.coursesSoon}</p>
        </div>
        <button
          type="button"
          className="kingdom-cta mt-5 w-full"
          onClick={() => {
            void (async () => {
              if (student.level === "intermediate") {
                router.push(await beginnerNextPath(student));
                return;
              }
              router.push(roomPath(student.level));
            })();
          }}
        >
          {t.profile.join}
        </button>
      </main>
      <SiteFooter />
      <VipBadge />
    </div>
  );
}
