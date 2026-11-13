"use client";

import { EnergyModal } from "@/components/play/energy-modal";

export function ExhaustedModal({
  busy,
  refillAt,
  userId,
  onInvite,
  onWaitComplete,
}: {
  busy: boolean;
  refillAt?: string | null;
  userId?: string;
  onInvite: () => void;
  onWaitComplete?: () => void;
}) {
  return (
    <EnergyModal
      busy={busy}
      userId={userId}
      refillAt={refillAt}
      onInvite={onInvite}
      onWaitComplete={onWaitComplete || (() => undefined)}
    />
  );
}
