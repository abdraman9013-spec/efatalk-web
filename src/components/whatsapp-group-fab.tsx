"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/i18n/provider";
import { firstNameOf } from "@/lib/flame-copy";
import { isFakeAdminStudent, readCurrentStudent, type EfaaStudent } from "@/lib/session";
import {
  academyDateStamp,
  fetchOwnWhatsAppGroup,
  isAcademyLevel,
  whatsappJoinedStorageKey,
  whatsappNoteDismissKey,
} from "@/lib/whatsapp-groups";

const HIDE_ON = new Set(["/", "/auth", "/official", "/privacy", "/terms", "/admin", "/admin-dashboard"]);

function hasJoined(userId: string, level: string, href: string) {
  try {
    return localStorage.getItem(whatsappJoinedStorageKey(userId, level, href)) === "1";
  } catch {
    return false;
  }
}

function markJoined(userId: string, level: string, href: string) {
  try {
    localStorage.setItem(whatsappJoinedStorageKey(userId, level, href), "1");
  } catch {
    /* ignore */
  }
}

export function WhatsAppGroupFab() {
  const { t, dir } = useI18n();
  const path = usePathname();
  const [student, setStudent] = useState<EfaaStudent | null>(null);
  const [href, setHref] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function hide() {
      if (cancelled) return;
      setStudent(null);
      setHref(null);
      setNoteOpen(false);
      setJoined(false);
    }

    async function refresh() {
      if (HIDE_ON.has(path) || path.startsWith("/admin") || path.startsWith("/auth") || path.startsWith("/vip")) {
        hide();
        return;
      }
      const local = readCurrentStudent();
      if (!local?.id || isFakeAdminStudent(local) || !isAcademyLevel(local.level)) {
        hide();
        return;
      }
      const group = await fetchOwnWhatsAppGroup(local.level);
      if (cancelled) return;
      if (!group) {
        hide();
        return;
      }

      const already = hasJoined(local.id, group.level, group.href);
      setJoined(already);
      setHref(already ? null : group.href);
      setStudent(already ? null : local);

      if (already) {
        setNoteOpen(false);
        return;
      }

      try {
        const seen = localStorage.getItem(whatsappNoteDismissKey(local.id));
        setNoteOpen(seen !== academyDateStamp());
      } catch {
        setNoteOpen(true);
      }
    }

    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [path]);

  if (!student || joined || !href) return null;
  if (!isAcademyLevel(student.level)) return null;
  const current = student;
  const inviteUrl = href;
  const name = firstNameOf(current.firstName) || t.lobby.you;
  const levelLabel = t.levels[current.level];

  function dismissNote() {
    setNoteOpen(false);
    try {
      localStorage.setItem(whatsappNoteDismissKey(current.id), academyDateStamp());
    } catch {
      /* ignore */
    }
  }

  function onJoinClick() {
    markJoined(current.id, current.level, inviteUrl);
    setJoined(true);
    setStudent(null);
    setNoteOpen(false);
  }

  return (
    <>
      <AnimatePresence>
        {noteOpen ? (
          <motion.aside
            className={`wa-group-note ${dir === "rtl" ? "wa-group-note-rtl" : ""}`}
            initial={{ y: 28, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            role="status"
          >
            <button type="button" className="wa-group-note-x" onClick={dismissNote} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <p className="wa-group-note-kicker">{t.waGroup.personalKicker.replaceAll("{level}", levelLabel)}</p>
            <p className="wa-group-note-body">
              {t.waGroup.personalBody.replaceAll("{name}", name).replaceAll("{level}", levelLabel)}
            </p>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="wa-group-note-cta"
              onClick={onJoinClick}
            >
              <MessageCircle className="h-4 w-4" />
              {t.waGroup.join}
            </a>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <motion.a
        href={inviteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`wa-group-fab ${dir === "rtl" ? "wa-group-fab-rtl" : ""}`}
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ delay: 0.35, duration: 0.45 }}
        aria-label={t.waGroup.join}
        onClick={onJoinClick}
      >
        <motion.span
          className="wa-group-fab-disk"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2} />
          <span className="wa-group-fab-label">{t.waGroup.short}</span>
          <span className="wa-group-fab-level">{levelLabel}</span>
        </motion.span>
      </motion.a>
    </>
  );
}
