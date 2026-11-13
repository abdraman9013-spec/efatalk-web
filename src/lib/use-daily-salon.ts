"use client";

import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import { attachRoomVoice, type VoiceProfile } from "@/lib/room-voice";
import { isDailyUrl } from "@/lib/keep-in-app";
import { studentBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

const DAILY_JOIN_MS = 8000;

export type LiveTile = {
  sessionId: string;
  userId?: string;
  name: string;
  nationality?: string;
  streak?: number;
  photo?: string;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  local: boolean;
  audioOn: boolean;
  speaking: boolean;
};

type UserMeta = { nationality?: string; streak?: number; photo?: string; userId?: string };

const HD_VIDEO: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  aspectRatio: { ideal: 16 / 9 },
  frameRate: { ideal: 30 },
  facingMode: "user",
};

function localTile(
  me: EfaaStudent,
  stream: MediaStream | null,
  audioOn: boolean,
  videoOn: boolean,
): LiveTile {
  return {
    sessionId: "local",
    userId: me.id,
    name: studentBoardName(me),
    nationality: me.nationality,
    streak: me.streak,
    photo: me.photo,
    videoTrack: videoOn ? stream?.getVideoTracks()[0] : undefined,
    audioTrack: stream?.getAudioTracks()[0],
    local: true,
    audioOn,
    speaking: false,
  };
}

function keepTilePhotos(prev: LiveTile[], next: LiveTile[]): LiveTile[] {
  return next.map((tile) => {
    const old = prev.find(
      (item) => (tile.userId && item.userId === tile.userId) || item.sessionId === tile.sessionId,
    );
    return { ...tile, photo: tile.photo || old?.photo };
  });
}

function tilesFromDaily(call: DailyCall, speakerId: string | null, me: EfaaStudent): LiveTile[] {
  return Object.values(call.participants()).map((p: DailyParticipant) => {
    const meta = (p.userData || {}) as UserMeta;
    const audioState = p.tracks.audio.state;
    const userId = meta.userId || (p.local ? me.id : undefined);
    return {
      sessionId: p.session_id,
      userId,
      name: p.user_name || "Guest",
      nationality: meta.nationality,
      streak: typeof meta.streak === "number" ? meta.streak : undefined,
      photo: meta.photo || (p.local ? me.photo : undefined),
      videoTrack: p.tracks.video.persistentTrack,
      audioTrack: p.tracks.audio.persistentTrack,
      local: Boolean(p.local),
      audioOn: audioState !== "off" && audioState !== "blocked",
      speaking: Boolean(speakerId && p.session_id === speakerId),
    };
  });
}

export function useDailySalon(roomKey: string, me: EfaaStudent | null, enabled: boolean) {
  const callRef = useRef<DailyCall | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioOnRef = useRef(true);
  const videoOnRef = useRef(true);
  const [tiles, setTiles] = useState<LiveTile[]>([]);
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [status, setStatus] = useState<"off" | "joining" | "live" | "missing" | "fallback">("off");

  useEffect(() => {
    if (!enabled || !me) return;
    const student = me;
    let cancelled = false;
    let fallbackStarted = false;
    let stopMesh: (() => void) | undefined;
    const remotes = new Map<string, LiveTile>();
    const profile: VoiceProfile = {
      name: studentBoardName(student),
      nationality: student.nationality,
      streak: student.streak,
      photo: student.photo,
      userId: student.id,
    };

    function publishMesh() {
      if (cancelled) return;
      setTiles((prev) =>
        keepTilePhotos(prev, [
          localTile(student, localStreamRef.current, audioOnRef.current, videoOnRef.current),
          ...remotes.values(),
        ]),
      );
    }

    async function startMesh() {
      if (cancelled || fallbackStarted) return;
      fallbackStarted = true;
      setStatus("fallback");
      if (callRef.current) {
        try {
          await callRef.current.leave();
        } catch {
          /* already left */
        }
        try {
          callRef.current.destroy();
        } catch {
          /* already destroyed */
        }
        callRef.current = null;
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      try {
        if (!localStreamRef.current) {
          localStreamRef.current = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: HD_VIDEO,
          });
        }
      } catch {
        /* avatar only */
      }
      const stream = localStreamRef.current;
      if (!stream) {
        publishMesh();
        return;
      }
      stream.getAudioTracks().forEach((track) => {
        track.enabled = audioOnRef.current;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = videoOnRef.current;
      });
      try {
        const supabase = getSupabase();
        const channel = supabase.channel(`efaa-media-${roomKey}`, {
          config: { broadcast: { self: false } },
        });
        await Promise.race([
          new Promise<void>((resolve) => {
            channel.subscribe((state) => {
              if (state === "SUBSCRIBED") resolve();
            });
          }),
          new Promise<void>((resolve) => window.setTimeout(resolve, 4000)),
        ]);
        if (cancelled) {
          void supabase.removeChannel(channel);
          return;
        }
        stopMesh = attachRoomVoice({
          channel,
          myId: student.id,
          stream,
          profile,
          onRemote: (peerId, remote, peerProfile) => {
            remotes.set(peerId, {
              sessionId: peerId,
              userId: peerProfile?.userId || peerId,
              name: peerProfile?.name || "Guest",
              nationality: peerProfile?.nationality,
              streak: peerProfile?.streak,
              photo: peerProfile?.photo,
              videoTrack: remote.getVideoTracks()[0],
              audioTrack: remote.getAudioTracks()[0],
              local: false,
              audioOn: remote.getAudioTracks()[0]?.enabled !== false,
              speaking: false,
            });
            publishMesh();
          },
          onPeerLeft: (peerId) => {
            remotes.delete(peerId);
            publishMesh();
          },
        }).stop;
      } catch {
        /* local camera still works */
      }
      publishMesh();
    }

    const call = Daily.createCallObject({
      audioSource: true,
      videoSource: true,
      subscribeToTracksAutomatically: true,
    });
    callRef.current = call;
    let speakerId: string | null = null;
    const refresh = () => {
      if (fallbackStarted || cancelled) return;
      setTiles((prev) => keepTilePhotos(prev, tilesFromDaily(call, speakerId, student)));
    };

    call.on("started-camera", refresh);
    call.on("joined-meeting", refresh);
    call.on("participant-joined", refresh);
    call.on("participant-updated", refresh);
    call.on("participant-left", refresh);
    call.on("track-started", refresh);
    call.on("track-stopped", refresh);
    call.on("active-speaker-change", (event) => {
      speakerId = event.activeSpeaker?.peerId || null;
      refresh();
    });
    call.on("error", () => {
      void startMesh();
    });

    (async () => {
      setStatus("joining");
      try {
        await call.startCamera({
          startAudioOff: false,
          startVideoOff: false,
          audioSource: true,
          videoSource: true,
          inputSettings: { video: { settings: HD_VIDEO } },
        });
        if (!cancelled) refresh();
      } catch {
        /* join still tried */
      }
      try {
        const res = await fetch("/api/daily-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomKey }),
        });
        if (!res.ok) {
          await startMesh();
          return;
        }
        const { url } = (await res.json()) as { url: string };
        if (cancelled) return;
        if (!url || !isDailyUrl(url)) {
          await startMesh();
          return;
        }
        await Promise.race([
          call.join({
            url,
            userName: profile.name,
            startAudioOff: false,
            startVideoOff: false,
            userData: {
              nationality: student.nationality,
              streak: student.streak,
              photo: student.photo,
              userId: student.id,
            },
            inputSettings: { video: { settings: HD_VIDEO } },
            sendSettings: { video: { maxQuality: "high" } },
          }),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("daily-timeout")), DAILY_JOIN_MS);
          }),
        ]);
        if (cancelled || fallbackStarted) return;
        if (typeof window !== "undefined" && window.location.hostname.toLowerCase().endsWith("daily.co")) {
          await startMesh();
          return;
        }
        await call.setLocalAudio(true);
        setStatus("live");
        refresh();
      } catch {
        await startMesh();
      }
    })();

    return () => {
      cancelled = true;
      stopMesh?.();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      const current = callRef.current;
      callRef.current = null;
      if (current) current.leave().finally(() => current.destroy());
    };
  }, [enabled, roomKey, me]);

  function toggleAudio() {
    const next = !audioOn;
    audioOnRef.current = next;
    setAudioOn(next);
    void callRef.current?.setLocalAudio(next);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setTiles((prev) => prev.map((tile) => (tile.local ? { ...tile, audioOn: next } : tile)));
  }

  function toggleVideo() {
    const next = !videoOn;
    videoOnRef.current = next;
    setVideoOn(next);
    void callRef.current?.setLocalVideo(next);
    const stream = localStreamRef.current;
    stream?.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setTiles((prev) =>
      prev.map((tile) =>
        tile.local ? { ...tile, videoTrack: next ? stream?.getVideoTracks()[0] : undefined } : tile,
      ),
    );
  }

  return { tiles, audioOn, videoOn, status, toggleAudio, toggleVideo };
}
