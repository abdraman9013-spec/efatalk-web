"use client";

import { Bell, Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { restoreStudent } from "@/lib/efaa-db";
import { flameBody, firstNameOf, pushKindFromMinutes } from "@/lib/flame-copy";
import { ensureGamification, syncBrokenStreak, type GamificationRow } from "@/lib/gamification";
import { minutesUntilOpen } from "@/lib/open-hours";
import { pingPushTick, pushSupported, subscribePush } from "@/lib/push-client";
import { pulseFlame } from "@/lib/pulse";
import { useOpenHours } from "@/lib/use-open-hours";

function todayStamp() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Ndjamena" }).format(new Date());
}

export function FlameWatch() {
  const { t, locale } = useI18n();
  const hours = useOpenHours();
  const [text, setText] = useState("");
  const [needEnable, setNeedEnable] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastPulse = useRef("");
  const studentRef = useRef<{ id: string; firstName?: string; level?: string } | null>(null);

  useEffect(() => {
    let live = true;
    let timer = 0;

    async function tick() {
      try {
        const student = await restoreStudent();
        studentRef.current = student;
        if (!live || !student?.id) {
          if (live) {
            setText("");
            setNeedEnable(false);
          }
          return;
        }

        if (pushSupported()) {
          if (Notification.permission === "granted") {
            setNeedEnable(false);
            void subscribePush({
              userId: student.id,
              locale,
              level: student.level || "beginner",
            });
          } else if (Notification.permission === "default") {
            setNeedEnable(true);
          } else {
            setNeedEnable(false);
          }
        }

        const game = await ensureGamification(student);
        const row = ((await syncBrokenStreak(student.id)) || game) as GamificationRow;
        const minutes = minutesUntilOpen(hours.rows, hours.forceOpen);
        const playedToday = (row.last_activity_date || "").slice(0, 10) === todayStamp();
        const kind = pushKindFromMinutes(minutes);
        const body = flameBody(t, {
          name: firstNameOf(student.firstName || row.display_name),
          streak: row.current_streak || 0,
          minutes,
          missed: row.missed_days || 0,
          graceLeft: row.grace_left ?? 1,
          playedToday,
          kind,
        });
        if (!live) return;
        setText(body);
        if (body && body !== lastPulse.current) {
          lastPulse.current = body;
          pulseFlame(body);
        }
        if (kind) void pingPushTick();
      } catch {
        if (live) setText("");
      }
    }

    void tick();
    timer = window.setInterval(() => void tick(), 45000);
    return () => {
      live = false;
      window.clearInterval(timer);
    };
  }, [hours.forceOpen, hours.rows, locale, t]);

  async function enableAlerts() {
    const student = studentRef.current;
    if (!student?.id || busy) return;
    setBusy(true);
    try {
      const res = await subscribePush({
        userId: student.id,
        locale,
        level: student.level || "beginner",
        requestPermission: true,
      });
      if (res.ok) {
        setNeedEnable(false);
        void pingPushTick();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!needEnable && !text) return null;

  return (
    <div className="flame-stack">
      {needEnable ? (
        <button type="button" className="flame-enable" onClick={() => void enableAlerts()} disabled={busy}>
          <Bell className="h-5 w-5" />
          <span>{t.flame.enable}</span>
        </button>
      ) : null}
      {text ? (
        <div className="flame-alert" role="status">
          <Flame className="h-5 w-5" />
          <p>{text}</p>
        </div>
      ) : null}
    </div>
  );
}
