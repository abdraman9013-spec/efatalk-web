"use client";

import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { slimAvatarUrl } from "@/lib/avatar";
import { isDailyUrl } from "@/lib/keep-in-app";
import { studentBoardName, type EfaaStudent } from "@/lib/session";

const JOIN_MS = 8000;

export type DailyVoicePeer = {
  id: string;
  name: string;
  nationality?: string;
  photo?: string;
  local: boolean;
  audioOn: boolean;
  audioTrack?: MediaStreamTrack;
};

type Meta = { userId?: string; nationality?: string; photo?: string };

function peerFromDaily(participant: DailyParticipant, me: EfaaStudent): DailyVoicePeer {
  const meta = (participant.userData || {}) as Meta;
  const audioState = participant.tracks.audio?.state;
  const id = meta.userId || (participant.local ? me.id : participant.session_id);
  return {
    id,
    name: participant.user_name || (participant.local ? studentBoardName(me) : "Guest"),
    nationality: meta.nationality || (participant.local ? me.nationality : undefined),
    photo: slimAvatarUrl(meta.photo) || (participant.local ? me.photo : undefined),
    local: Boolean(participant.local),
    audioOn: audioState !== "off" && audioState !== "blocked",
    audioTrack: participant.local ? undefined : participant.tracks.audio?.persistentTrack,
  };
}

export async function publishMic(call: DailyCall, stream: MediaStream | null) {
  const track = stream?.getAudioTracks().find((item) => item.readyState === "live");
  if (track) track.enabled = true;
  try {
    if (track) await call.setInputDevicesAsync({ audioSource: track });
    await call.setLocalAudio(true);
  } catch {
    try {
      await call.setLocalAudio(true);
    } catch {
      /* the local track still exists */
    }
  }
}

/** Daily's servers carry the voice. Phones on mobile data do not have to reach each other. */
export async function joinDailyVoice(options: {
  roomId: string;
  me: EfaaStudent;
  stream: MediaStream | null;
  listenOnly?: boolean;
  ttlSec: number;
  onPeers: (peers: DailyVoicePeer[]) => void;
  onSpeaker?: (userId: string | null) => void;
  onCall?: (call: DailyCall) => void;
}): Promise<DailyCall | null> {
  const { roomId, me, stream, listenOnly, ttlSec, onPeers, onSpeaker, onCall } = options;
  let call: DailyCall;
  try {
    call = Daily.createCallObject({
      audioSource: listenOnly || !stream ? false : stream.getAudioTracks()[0] || false,
      videoSource: false,
      subscribeToTracksAutomatically: true,
    });
  } catch {
    return null;
  }
  onCall?.(call);

  const publish = () => {
    const peers = Object.values(call.participants()).map((participant) => peerFromDaily(participant, me));
    if (!peers.some((peer) => peer.local)) {
      peers.unshift({
        id: me.id,
        name: studentBoardName(me),
        nationality: me.nationality,
        photo: me.photo,
        local: true,
        audioOn: !listenOnly,
      });
    }
    onPeers(peers);
  };

  call.on("joined-meeting", publish);
  call.on("participant-joined", publish);
  call.on("participant-updated", publish);
  call.on("participant-left", publish);
  call.on("track-started", publish);
  call.on("track-stopped", publish);
  call.on("active-speaker-change", (event) => {
    const sessionId = event?.activeSpeaker?.peerId;
    if (!sessionId) {
      onSpeaker?.(null);
      return;
    }
    const participant = call.participants()[sessionId];
    const meta = (participant?.userData || {}) as Meta;
    onSpeaker?.(meta.userId || (participant?.local ? me.id : null));
  });

  try {
    const res = await fetch("/api/daily-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, audioOnly: true, ttlSec }),
    });
    if (!res.ok) throw new Error("daily-room");
    const { url } = (await res.json()) as { url?: string };
    if (!url || !isDailyUrl(url)) throw new Error("daily-url");
    await Promise.race([
      call.join({
        url,
        userName: studentBoardName(me),
        startAudioOff: Boolean(listenOnly) || !stream,
        startVideoOff: true,
        userData: {
          userId: me.id,
          nationality: me.nationality,
          photo: slimAvatarUrl(me.photo),
        },
      }),
      new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("daily-timeout")), JOIN_MS);
      }),
    ]);
    if (!listenOnly && stream) await publishMic(call, stream);
    publish();
    return call;
  } catch {
    try {
      await call.leave();
    } catch {
      /* not joined */
    }
    try {
      call.destroy();
    } catch {
      /* already gone */
    }
    return null;
  }
}

export async function leaveDailyVoice(call: DailyCall | null) {
  if (!call) return;
  try {
    await call.leave();
  } catch {
    /* already left */
  }
  try {
    call.destroy();
  } catch {
    /* already destroyed */
  }
}
