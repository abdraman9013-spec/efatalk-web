"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { firstNameOf } from "@/lib/flame-copy";
import type { EfaaStudent } from "@/lib/session";
import { fetchOwnWhatsAppGroup, isAcademyLevel, whatsappJoinedStorageKey } from "@/lib/whatsapp-groups";

function markJoined(userId: string, level: string, href: string) {
  try {
    localStorage.setItem(whatsappJoinedStorageKey(userId, level, href), "1");
  } catch {
    /* ignore */
  }
}

export function WhatsAppSignupInvite({
  student,
  onContinue,
}: {
  student: EfaaStudent;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const [href, setHref] = useState<string | null>(null);
  const name = firstNameOf(student.firstName) || t.lobby.you;
  const levelLabel = isAcademyLevel(student.level) ? t.levels[student.level] : "";

  useEffect(() => {
    let live = true;
    void fetchOwnWhatsAppGroup(student.level).then((group) => {
      if (live) setHref(group?.href || null);
    });
    return () => {
      live = false;
    };
  }, [student.level]);

  if (!href) {
    return (
      <button type="button" className="kingdom-cta mt-8 w-full py-3.5" onClick={onContinue}>
        {t.waGroup.later}
      </button>
    );
  }

  return (
    <div className="kingdom-glass mt-8 space-y-4 p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#c4a574]">
        {t.waGroup.personalKicker.replaceAll("{level}", levelLabel)}
      </p>
      <h2 className="font-display text-[26px] leading-tight text-[#f3e6c8]">{t.waGroup.join}</h2>
      <p className="text-[14px] text-[#d8c7a4]/85">
        {t.waGroup.personalBody.replaceAll("{name}", name).replaceAll("{level}", levelLabel)}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="kingdom-cta flex w-full items-center justify-center gap-2 py-3.5"
        onClick={() => {
          markJoined(student.id, student.level, href);
          onContinue();
        }}
      >
        <MessageCircle className="h-4 w-4" />
        {t.waGroup.join}
      </a>
      <button type="button" className="kingdom-cta-ghost w-full py-3 text-[13px]" onClick={onContinue}>
        {t.waGroup.later}
      </button>
    </div>
  );
}
