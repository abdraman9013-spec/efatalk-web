import { AdvancedLobby } from "@/components/advanced/advanced-lobby";
import { IntermediateLobby } from "@/components/intermediate/intermediate-lobby";
import { LobbyScreen } from "@/components/lobby/lobby-screen";

export default async function LobbyPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  if (level === "intermediate") return <IntermediateLobby />;
  if (level === "advanced") return <AdvancedLobby />;
  return <LobbyScreen level={level} />;
}
