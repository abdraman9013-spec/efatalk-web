import { MatchGate } from "@/components/room/match-gate";

export default async function DuoPage({
  params,
}: {
  params: Promise<{ pairId: string }>;
}) {
  const { pairId } = await params;
  return <MatchGate pairId={pairId} />;
}
