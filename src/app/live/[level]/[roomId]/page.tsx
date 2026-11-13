import { Suspense } from "react";
import { LiveSession } from "@/components/live/live-session";

export default async function LivePage({
  params,
}: {
  params: Promise<{ level: string; roomId: string }>;
}) {
  const { level, roomId } = await params;
  return (
    <Suspense fallback={<div className="mid-shell min-h-dvh" />}>
      <LiveSession level={level} roomId={roomId} />
    </Suspense>
  );
}
