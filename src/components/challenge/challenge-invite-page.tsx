"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ChallengeInvitePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/challenge");
  }, [router]);
  return <div className="challenge-sea" />;
}
