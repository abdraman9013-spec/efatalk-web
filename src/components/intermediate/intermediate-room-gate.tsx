"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { restoreStudent } from "@/lib/efaa-db";
import { beginnerNextPath } from "@/lib/gamification";
import { isAdminAuthed, setAdminVisit } from "@/lib/admin";
import { lobbyPath } from "@/lib/session";

export function IntermediateRoomGate() {
  const router = useRouter();

  useEffect(() => {
    if (isAdminAuthed()) {
      setAdminVisit("intermediate");
      router.replace(lobbyPath("intermediate"));
      return;
    }

    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        router.replace(student ? await beginnerNextPath(student) : "/auth");
      })
      .catch(() => {
        if (live) router.replace("/mid");
      });

    return () => {
      live = false;
    };
  }, [router]);

  return <div className="mid-shell min-h-dvh" />;
}
