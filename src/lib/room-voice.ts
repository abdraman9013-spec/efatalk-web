import type { RealtimeChannel } from "@supabase/supabase-js";
import { ROOM_ICE } from "@/lib/ice-servers";

export type VoiceProfile = {
  name: string;
  nationality?: string;
  streak?: number;
  photo?: string;
  userId?: string;
};

type Signal = {
  from: string;
  to?: string;
  type: "join" | "leave" | "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  profile?: VoiceProfile;
};

export function attachRoomVoice(options: {
  channel: RealtimeChannel;
  myId: string;
  stream: MediaStream;
  profile: VoiceProfile;
  onRemote: (peerId: string, stream: MediaStream, profile?: VoiceProfile) => void;
  onPeerLeft: (peerId: string) => void;
}) {
  const peers = new Map<string, RTCPeerConnection>();
  const profiles = new Map<string, VoiceProfile>();
  let screenSender: RTCRtpSender | null = null;
  let screenTrack: MediaStreamTrack | null = null;

  function peer(id: string) {
    const existing = peers.get(id);
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: ROOM_ICE });
    options.stream.getTracks().forEach((track) => pc.addTrack(track, options.stream));
    if (screenTrack && screenTrack.readyState === "live") {
      pc.addTrack(screenTrack, options.stream);
    }
    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      void options.channel.send({
        type: "broadcast",
        event: "voice",
        payload: {
          from: options.myId,
          to: id,
          type: "ice",
          candidate: event.candidate.toJSON(),
        } satisfies Signal,
      });
    };
    pc.ontrack = (event) => {
      const remote = event.streams[0];
      if (remote) options.onRemote(id, remote, profiles.get(id));
    };
    peers.set(id, pc);
    return pc;
  }

  async function renegotiate(id: string, pc: RTCPeerConnection) {
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      void options.channel.send({
        type: "broadcast",
        event: "voice",
        payload: { from: options.myId, to: id, type: "offer", sdp: offer } satisfies Signal,
      });
    } catch {
      /* peer may have left */
    }
  }

  async function call(id: string) {
    const pc = peer(id);
    await renegotiate(id, pc);
  }

  async function publishScreen(track: MediaStreamTrack) {
    screenTrack = track;
    if (!options.stream.getVideoTracks().includes(track)) {
      options.stream.addTrack(track);
    }
    for (const [id, pc] of peers) {
      const existing = pc.getSenders().find((s) => s.track?.kind === "video");
      try {
        if (existing) {
          await existing.replaceTrack(track);
          screenSender = existing;
        } else {
          screenSender = pc.addTrack(track, options.stream);
        }
        await renegotiate(id, pc);
      } catch {
        /* keep trying other peers */
      }
    }
  }

  async function stopScreen() {
    if (screenTrack) {
      try {
        options.stream.removeTrack(screenTrack);
      } catch {
        /* already removed */
      }
      screenTrack.stop();
      screenTrack = null;
    }
    for (const [id, pc] of peers) {
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === "video") {
          try {
            await sender.replaceTrack(null);
            pc.removeTrack(sender);
          } catch {
            /* ignore */
          }
        }
      }
      await renegotiate(id, pc);
    }
    screenSender = null;
  }

  const handler = async ({ payload }: { payload: Signal }) => {
    if (!payload || payload.from === options.myId) return;
    if (payload.to && payload.to !== options.myId) return;
    if (payload.profile) profiles.set(payload.from, payload.profile);

    if (payload.type === "join") {
      if (options.myId < payload.from) await call(payload.from);
      return;
    }
    if (payload.type === "leave") {
      peers.get(payload.from)?.close();
      peers.delete(payload.from);
      profiles.delete(payload.from);
      options.onPeerLeft(payload.from);
      return;
    }
    if (payload.type === "offer" && payload.sdp) {
      const pc = peer(payload.from);
      await pc.setRemoteDescription(payload.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      void options.channel.send({
        type: "broadcast",
        event: "voice",
        payload: { from: options.myId, to: payload.from, type: "answer", sdp: answer } satisfies Signal,
      });
      return;
    }
    if (payload.type === "answer" && payload.sdp) {
      const pc = peers.get(payload.from);
      if (pc && !pc.currentRemoteDescription) await pc.setRemoteDescription(payload.sdp);
      return;
    }
    if (payload.type === "ice" && payload.candidate) {
      const pc = peer(payload.from);
      try {
        await pc.addIceCandidate(payload.candidate);
      } catch {
        /* ignore late candidates */
      }
    }
  };

  options.channel.on("broadcast", { event: "voice" }, handler);
  void options.channel.send({
    type: "broadcast",
    event: "voice",
    payload: {
      from: options.myId,
      type: "join",
      profile: options.profile,
    } satisfies Signal,
  });

  return {
    stop: () => {
      void options.channel.send({
        type: "broadcast",
        event: "voice",
        payload: { from: options.myId, type: "leave" } satisfies Signal,
      });
      peers.forEach((pc) => pc.close());
      peers.clear();
      screenTrack?.stop();
      screenTrack = null;
      screenSender = null;
    },
    publishScreen,
    stopScreen,
  };
}
