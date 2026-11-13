"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Level } from "@/i18n/translations";
import { isAdminAuthed, setAdminVisit } from "@/lib/admin";
import { restoreStudent } from "@/lib/efaa-db";
import { beginnerNextPath } from "@/lib/gamification";
import { lobbyPath } from "@/lib/session";

export function BeginnerRoomGate({ level = "beginner" }: { level?: Level }) {
  const router = useRouter();

  useEffect(() => {
    if (isAdminAuthed()) {
      setAdminVisit(level);
      router.replace(lobbyPath(level));
      return;
    }
    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        router.replace(student ? await beginnerNextPath(student) : "/auth");
      })
      .catch(() => {
        if (live) router.replace("/auth");
      });
    return () => {
      live = false;
    };
  }, [level, router]);

  return <div className="mid-shell min-h-dvh" />;
}
