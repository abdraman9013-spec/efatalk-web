import { IntermediateRoomGate } from "@/components/intermediate/intermediate-room-gate";
import { BeginnerRoomGate } from "@/components/room/beginner-room-gate";
import { KingdomRoom } from "@/components/room/kingdom-room";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  if (level === "beginner") return <BeginnerRoomGate />;
  if (level === "intermediate") return <IntermediateRoomGate />;
  if (level === "advanced") return <BeginnerRoomGate level="advanced" />;
  return <KingdomRoom level={level} />;
}
