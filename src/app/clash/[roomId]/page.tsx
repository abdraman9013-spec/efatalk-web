import { ClashArena } from "@/components/clash/clash-arena";

export default async function ClashRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <ClashArena roomId={decodeURIComponent(roomId)} />;
}
