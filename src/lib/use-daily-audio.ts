"use client";

import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import { attachRoomVoice, type VoiceProfile } from "@/lib/room-voice";
import { slimAvatarUrl } from "@/lib/avatar";
import { publishMic } from "@/lib/daily-voice";
import { isDailyUrl } from "@/lib/keep-in-app";
import { captureRoomMic, releaseRoomMic } from "@/lib/room-mic";
import { MATCH_PRACTICE_MIN_SEC, matchPracticeSeconds } from "@/lib/gamification";
import { studentBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

const DAILY_JOIN_MS = 8000;

export type AudioPeer = {
  sessionId: string;
  userId?: string;
  name: string;
  nationality?: string;
  streak?: number;
  photo?: string;
  audioTrack?: MediaStreamTrack;
  local: boolean;
  audioOn: boolean;
  speaking: boolean;
};

export const MATCH_SECONDS = 180;
export const INTERMEDIATE_MATCH_SECONDS = 15 * 60;

function localPeer(me: EfaaStudent, stream: MediaStream | null, audioOn: boolean): AudioPeer {
  return {
    sessionId: "local",
    userId: me.id,
    name: studentBoardName(me),
    nationality: me.nationality,
    streak: me.streak,
    photo: me.photo,
    audioTrack: stream?.getAudioTracks()[0],
    local: true,
    audioOn,
    speaking: false,
  };
}

function keepPhotos(prev: AudioPeer[], next: AudioPeer[]): AudioPeer[] {
  return next.map((peer) => {
    const old = prev.find(
      (item) => (peer.userId && item.userId === peer.userId) || item.sessionId === peer.sessionId,
    );
    return { ...peer, photo: peer.photo || old?.photo };
  });
}

function peersFromDaily(call: DailyCall, me: EfaaStudent): AudioPeer[] {
  return Object.values(call.participants()).map((p: DailyParticipant) => {
    const meta = (p.userData || {}) as {
      nationality?: string;
      streak?: number;
      photo?: string;
      userId?: string;
    };
    const audioState = p.tracks.audio.state;
    const userId = meta.userId || (p.local ? me.id : undefined);
    return {
      sessionId: p.session_id,
      userId,
      name: p.user_name || "Guest",
      nationality: meta.nationality,
      streak: typeof meta.streak === "number" ? meta.streak : undefined,
      photo: meta.photo || (p.local ? me.photo : undefined),
      audioTrack: p.tracks.audio.persistentTrack,
      local: Boolean(p.local),
      audioOn: audioState !== "off" && audioState !== "blocked",
      speaking: false,
    };
  });
}

export function useDailyAudioMatch(
  roomKey: string,
  me: EfaaStudent | null,
  enabled: boolean,
  onFinished: (speechSeconds: number) => void,
  durationSec = MATCH_SECONDS,
) {
  const callRef = useRef<DailyCall | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioOnRef = useRef(true);
  const speechMsRef = useRef(0);
  const speakingRef = useRef(false);
  const finishedRef = useRef(false);
  const matchStartedAtRef = useRef(0);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const [peers, setPeers] = useState<AudioPeer[]>([]);
  const [audioOn, setAudioOn] = useState(true);
  const [remaining, setRemaining] = useState(durationSec);
  const [status, setStatus] = useState<"off" | "joining" | "live" | "fallback">("off");

  useEffect(() => {
    if (!enabled || !me) return;
    const student = me;
    let cancelled = false;
    let fallbackStarted = false;
    let stopMesh: (() => void) | undefined;
    const remotes = new Map<string, AudioPeer>();
    matchStartedAtRef.current = 0;
    finishedRef.current = false;
    speechMsRef.current = 0;
    setRemaining(durationSec);
    const profile: VoiceProfile = {
      name: studentBoardName(student),
      nationality: student.nationality,
      streak: student.streak,
      photo: slimAvatarUrl(student.photo),
      userId: student.id,
    };

    function publishPeers(next: AudioPeer[]) {
      if (!matchStartedAtRef.current && next.some((peer) => !peer.local)) {
        matchStartedAtRef.current = Date.now();
        setRemaining(durationSec);
      }
      setPeers((prev) => keepPhotos(prev, next));
    }

    function publishMesh() {
      if (cancelled) return;
      publishPeers([localPeer(student, localStreamRef.current, audioOnRef.current), ...remotes.values()]);
    }

    async function startMesh() {
      if (cancelled || fallbackStarted) return;
      fallbackStarted = true;
      setStatus("fallback");
      if (callRef.current) {
        try {
          await callRef.current.leave();
        } catch {
          /* left */
        }
        try {
          callRef.current.destroy();
        } catch {
          /* gone */
        }
        callRef.current = null;
      }
      const stream = localStreamRef.current || (await captureRoomMic());
      localStreamRef.current = stream;
      if (!stream) {
        publishMesh();
        return;
      }
      try {
        const supabase = getSupabase();
        const channel = supabase.channel(`efaa-audio-${roomKey}`, {
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
        /* local mic still works */
      }
      publishMesh();
    }

    (async () => {
      setStatus("joining");
      const micTask = captureRoomMic();
      const call = Daily.createCallObject({
        audioSource: false,
        videoSource: false,
        subscribeToTracksAutomatically: true,
      });
      callRef.current = call;
      const refresh = () => {
        if (fallbackStarted || cancelled) return;
        publishPeers(peersFromDaily(call, student));
      };
      call.on("joined-meeting", refresh);
      call.on("participant-joined", refresh);
      call.on("participant-updated", refresh);
      call.on("participant-left", refresh);
      call.on("track-started", refresh);
      call.on("track-stopped", refresh);
      call.on("active-speaker-change", (event) => {
        const who = (event as { activeSpeaker?: { peerId?: string } }).activeSpeaker?.peerId;
        setPeers((prev) => prev.map((peer) => ({ ...peer, speaking: peer.sessionId === who })));
      });
      call.on("error", () => {
        void startMesh();
      });

      try {
        const res = await fetch("/api/daily-room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: roomKey, audioOnly: true, ttlSec: durationSec + 45 }),
        });
        if (!res.ok) {
          await startMesh();
          return;
        }
        const { url } = (await res.json()) as { url: string };
        if (!url || cancelled || !isDailyUrl(url)) {
          if (!cancelled) await startMesh();
          return;
        }
        await Promise.race([
          call.join({
            url,
            userName: profile.name,
            startAudioOff: true,
            startVideoOff: true,
            userData: {
              nationality: student.nationality,
              streak: student.streak,
              photo: slimAvatarUrl(student.photo),
              userId: student.id,
            },
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
        setStatus("live");
        refresh();
        const stream = await micTask;
        if (cancelled || fallbackStarted) return;
        localStreamRef.current = stream;
        stream?.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        if (stream) {
          audioOnRef.current = true;
          setAudioOn(true);
          await publishMic(call, stream);
          setPeers([localPeer(student, stream, true)]);
          refresh();
        }
      } catch {
        await startMesh();
      }
    })();

    const settle = () => {
      if (finishedRef.current) return;
      const seconds = matchPracticeSeconds(speechMsRef.current, matchStartedAtRef.current);
      if (seconds < MATCH_PRACTICE_MIN_SEC) return;
      finishedRef.current = true;
      onFinishedRef.current(seconds);
    };

    const clock = window.setInterval(() => {
      const startedAt = matchStartedAtRef.current;
      if (!startedAt) {
        setRemaining(durationSec);
        return;
      }
      const left = Math.max(0, durationSec - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(left);
      if (left <= 0) settle();
    }, 250);

    const onPageHide = () => settle();
    window.addEventListener("pagehide", onPageHide);

    let analyser: AnalyserNode | null = null;
    let audioCtx: AudioContext | null = null;
    let raf = 0;
    const listenSpeech = async () => {
      if (cancelled) return;
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (!track) {
        window.setTimeout(() => void listenSpeech(), 600);
        return;
      }
      try {
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        let last = performance.now();
        const loop = () => {
          if (!analyser) return;
          const now = performance.now();
          const dt = now - last;
          last = now;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (const value of data) sum += value;
          const speaking = audioOnRef.current && sum / data.length > 16;
          if (speaking) speechMsRef.current += dt;
          if (speaking !== speakingRef.current) {
            speakingRef.current = speaking;
            setPeers((prev) => prev.map((peer) => (peer.local ? { ...peer, speaking } : peer)));
          }
          raf = requestAnimationFrame(loop);
        };
        void audioCtx.resume();
        loop();
      } catch {
        /* analyser optional */
      }
    };
    const speechTimer = window.setTimeout(() => void listenSpeech(), 400);

    return () => {
      settle();
      cancelled = true;
      window.clearInterval(clock);
      window.clearTimeout(speechTimer);
      window.removeEventListener("pagehide", onPageHide);
      cancelAnimationFrame(raf);
      void audioCtx?.close();
      stopMesh?.();
      releaseRoomMic();
      localStreamRef.current = null;
      const current = callRef.current;
      callRef.current = null;
      if (current) current.leave().finally(() => current.destroy());
    };
  }, [enabled, roomKey, me, durationSec]);

  function toggleAudio() {
    const next = !audioOn;
    audioOnRef.current = next;
    setAudioOn(next);
    void callRef.current?.setLocalAudio(next);
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setPeers((prev) => prev.map((peer) => (peer.local ? { ...peer, audioOn: next } : peer)));
  }

  return {
    peers,
    audioOn,
    remaining,
    status,
    toggleAudio,
    matchSeconds: durationSec,
    practiceSeconds: () => matchPracticeSeconds(speechMsRef.current, matchStartedAtRef.current),
  };
}
