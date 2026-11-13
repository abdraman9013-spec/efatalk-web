"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { finishGoogleRedirect } from "@/lib/auth-user";
import { readChallengeNext } from "@/lib/challenge-api";
import { sessionFromGoogle } from "@/lib/efaa-db";
import { beginnerNextPath } from "@/lib/gamification";
import { clearVipCode, readAuthReturnPath, clearAuthReturnPath } from "@/lib/google-auth";
import { readFormationEnroll } from "@/lib/formation-auth";
import { isPracticeProfileComplete } from "@/lib/session";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const user = await finishGoogleRedirect();
        if (!live) return;
        if (!user) {
          router.replace("/auth?err=google");
          return;
        }
        const returnPath = readAuthReturnPath();
        if (returnPath) {
          clearAuthReturnPath();
          router.replace(returnPath);
          return;
        }
        const formation = readFormationEnroll();
        if (formation?.applicationId) {
          router.replace("/formation-privee?enroll=1");
          return;
        }
        clearVipCode();
        const student = await sessionFromGoogle(user);
        if (!live) return;
        if (student && isPracticeProfileComplete(student)) {
          const challengeNext = readChallengeNext(true);
          router.replace(challengeNext || (await beginnerNextPath(student)));
          return;
        }
        router.replace("/auth");
      } catch {
        if (live) router.replace("/auth?err=google");
      }
    })();
    return () => {
      live = false;
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#06060f] px-6 text-center text-[#eef2ff]">
      <p className="font-display text-2xl">…</p>
    </div>
  );
}
