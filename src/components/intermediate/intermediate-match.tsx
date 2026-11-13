"use client";

import { LiveSession } from "@/components/live/live-session";

export function IntermediateMatch({ pairId }: { pairId: string }) {
  return <LiveSession level="intermediate" roomId={pairId} />;
}
