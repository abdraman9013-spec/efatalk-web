"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IntermediateMatch } from "@/components/intermediate/intermediate-match";
import { DuoRoom } from "@/components/room/duo-room";
import { isAdminAuthed } from "@/lib/admin";
import { restoreStudent } from "@/lib/efaa-db";
import { beginnerNextPath } from "@/lib/gamification";
import type { Level } from "@/i18n/translations";

export function MatchGate({ pairId }: { pairId: string }) {
  const router = useRouter();
  const [level, setLevel] = useState<Level | null>(null);

  useEffect(() => {
    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        if (isAdminAuthed()) {
          setLevel("beginner");
          return;
        }
        if (!student?.level) {
          router.replace("/auth");
          return;
        }
        if (student.level === "advanced") {
          router.replace(await beginnerNextPath(student));
          return;
        }
        setLevel(student.level);
      })
      .catch(() => {
        if (isAdminAuthed()) {
          setLevel("beginner");
          return;
        }
        router.replace("/auth");
      });
    return () => {
      live = false;
    };
  }, [router]);

  if (level === "intermediate") return <IntermediateMatch pairId={pairId} />;
  if (level === "beginner") return <DuoRoom pairId={pairId} />;
  return null;
}
