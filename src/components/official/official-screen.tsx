"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { VipOnboardingModal } from "@/components/onboarding/vip-onboarding-modal";
import { OfficialGate } from "@/components/landing/official-gate";

function OfficialFromLink() {
  const params = useSearchParams();
  const code = (params.get("code") || "").toLowerCase();
  const [open, setOpen] = useState(Boolean(code));

  useEffect(() => {
    setOpen(Boolean(code));
  }, [code]);

  if (!code) return <OfficialGate />;
  return <VipOnboardingModal code={code} open={open} onClose={() => setOpen(false)} />;
}

export function OfficialScreen() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-100 via-white to-amber-50">
      <Suspense fallback={<div className="min-h-dvh" />}>
        <OfficialFromLink />
      </Suspense>
    </div>
  );
}
