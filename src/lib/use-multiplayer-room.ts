"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DailyCall } from "@daily-co/daily-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { joinDailyVoice, leaveDailyVoice, publishMic } from "@/lib/daily-voice";
import { ROOM_ICE } from "@/lib/ice-servers";
import { slimAvatarUrl } from "@/lib/avatar";
import { captureRoomMic, releaseRoomMic } from "@/lib/room-mic";
import { MATCH_PRACTICE_MIN_SEC, matchPracticeSeconds } from "@/lib/gamification";
import { studentBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

export type MeshLevel = "intermediate" | "advanced";

export type MeshPeer = {
  id: string;
  name: string;
  nationality?: string;
  photo?: string;
  local: boolean;
  ghost: boolean;
  audioOn: boolean;
  speaking: boolean;
  audioTrack?: MediaStreamTrack;
  level: number;
};

export type FloatEmoji = {
  id: string;
  emoji: string;
  left: number;
};

type Signal = {
  from: string;
  to?: string;
  type: "join" | "leave" | "offer" | "answer" | "ice";
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  name?: string;
  nationality?: string;
  photo?: string;
  ghost?: boolean;
};

type ReactionPayload = {
  emoji: string;
  from: string;
  to: string;
};

type PresenceMeta = {
  id: string;
  name?: string;
  nationality?: string;
  photo?: string;
  ghost?: boolean;
  startedAt?: number;
};

export const REACTION_EMOJIS = ["👏", "🔥", "❤️", "💯"] as const;
export const MESH_MAX: Record<MeshLevel, number> = { intermediate: 4, advanced: 6 };
export const MESH_SECONDS: Record<MeshLevel, number> = { intermediate: 15 * 60, advanced: 30 * 60 };

function localPeer(me: EfaaStudent, stream: MediaStream | null, audioOn: boolean, ghost: boolean): MeshPeer {
  return {
    id: me.id,
    name: studentBoardName(me),
    nationality: me.nationality,
    photo: me.photo,
    local: true,
    ghost,
    audioOn,
    speaking: false,
    audioTrack: stream?.getAudioTracks()[0],
    level: 0,
  };
}

function pushFloat(setFloats: (fn: (prev: FloatEmoji[]) => FloatEmoji[]) => void, emoji: string, left: number) {
  const floater: FloatEmoji = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    emoji,
    left,
  };
  setFloats((prev) => [...prev.slice(-18), floater]);
  window.setTimeout(() => {
    setFloats((prev) => prev.filter((item) => item.id !== floater.id));
  }, 1600);
}

export function useMultiplayerRoom(options: {
  roomId: string;
  level: MeshLevel;
  me: EfaaStudent | null;
  enabled: boolean;
  durationSec: number;
  listenOnly?: boolean;
  onFinished: (speechSeconds: number) => void;
  onReactionTo: (speakerId: string, fromId: string) => void;
}) {
  const { roomId, level, me, enabled, durationSec, listenOnly, onFinished, onReactionTo } = options;
  const ghost = Boolean(listenOnly);
  const maxPeers = MESH_MAX[level];
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const metaRef = useRef(new Map<string, PresenceMeta>());
  const makingOffer = useRef(new Map<string, boolean>());
  const ignoreOffer = useRef(new Map<string, boolean>());
  const streamRef = useRef<MediaStream | null>(null);
  const dailyCallRef = useRef<DailyCall | null>(null);
  const dailyOnRef = useRef(false);
  const audioOnRef = useRef(!ghost);
  const levelsRef = useRef(new Map<string, number>());
  const speechMsRef = useRef(0);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(0);
  const metersRef = useRef(new Map<string, { analyser: AnalyserNode; data: Uint8Array<ArrayBuffer> }>());
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const onFinishedRef = useRef(onFinished);
  const onReactionToRef = useRef(onReactionTo);
  onFinishedRef.current = onFinished;
  onReactionToRef.current = onReactionTo;

  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [audioOn, setAudioOn] = useState(!ghost);
  const [remaining, setRemaining] = useState(durationSec);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [floats, setFloats] = useState<FloatEmoji[]>([]);
  const [status, setStatus] = useState<"off" | "live">("off");

  const publish = useCallback(() => {
    if (!me) return;
    if (dailyOnRef.current) {
      setPeers((prev) => prev.map((peer) => (peer.local ? { ...peer, audioOn: audioOnRef.current } : peer)));
      return;
    }
    const remotes: MeshPeer[] = [];
    pcs.current.forEach((pc, id) => {
      const meta = metaRef.current.get(id);
      const track = pc.getReceivers().find((receiver) => receiver.track?.kind === "audio")?.track;
      remotes.push({
        id,
        name: meta?.name || "Guest",
        nationality: meta?.nationality,
        photo: slimAvatarUrl(meta?.photo),
        local: false,
        ghost: Boolean(meta?.ghost),
        audioOn: track ? track.enabled !== false : true,
        speaking: (levelsRef.current.get(id) || 0) > 18,
        audioTrack: track || undefined,
        level: levelsRef.current.get(id) || 0,
      });
    });
    setPeers((prev) => {
      const next = [localPeer(me, streamRef.current, audioOnRef.current, ghost), ...remotes.filter((peer) => !peer.ghost || ghost)];
      return next.map((peer) => {
        const old = prev.find((item) => item.id === peer.id);
        return { ...peer, photo: peer.photo || old?.photo };
      });
    });
  }, [ghost, me]);

  useEffect(() => {
    if (!enabled || !me || !roomId) return;
    const student = me;
    let cancelled = false;
    let meterCtx: AudioContext | null = null;
    const supabase = getSupabase();
    const channel = supabase.channel(`efaa-mesh-${roomId}`, {
      config: { broadcast: { self: false }, presence: { key: student.id } },
    });
    channelRef.current = channel;
    startedAtRef.current = 0;
    finishedRef.current = false;
    speechMsRef.current = 0;
    setRemaining(durationSec);

    function closePeer(id: string) {
      const pc = pcs.current.get(id);
      if (pc) {
        pc.onicecandidate = null;
        pc.ontrack = null;
        pc.close();
      }
      pcs.current.delete(id);
      metaRef.current.delete(id);
      makingOffer.current.delete(id);
      ignoreOffer.current.delete(id);
      levelsRef.current.delete(id);
      metersRef.current.delete(id);
      pendingIce.current.delete(id);
      if (!cancelled) publish();
    }

    function studentCount() {
      let count = ghost ? 0 : 1;
      metaRef.current.forEach((meta) => {
        if (!meta.ghost) count += 1;
      });
      return count;
    }

    function startActualMatch() {
      if (ghost || startedAtRef.current) return;
      startedAtRef.current = Date.now();
      setRemaining(durationSec);
      void channel.track({
        id: student.id,
        name: studentBoardName(student),
        nationality: student.nationality,
        ghost,
        startedAt: startedAtRef.current,
      } satisfies PresenceMeta);
      void channel.send({
        type: "broadcast",
        event: "session",
        payload: { startedAt: startedAtRef.current },
      });
    }

    function watchTrack(id: string, track: MediaStreamTrack) {
      try {
        const ctx = meterCtx || new AudioContext();
        meterCtx = ctx;
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        metersRef.current.set(id, {
          analyser,
          data: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>,
        });
      } catch {
        /* optional */
      }
    }

    async function flushIce(id: string, pc: RTCPeerConnection) {
      const queued = pendingIce.current.get(id) || [];
      pendingIce.current.delete(id);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* late ice */
        }
      }
    }

    function ensurePc(id: string, meta?: Partial<PresenceMeta> & { id?: string }) {
      if (id === student.id) return undefined;
      if (meta) {
        const prev = metaRef.current.get(id);
        metaRef.current.set(id, {
          id,
          ...prev,
          ...meta,
          photo: slimAvatarUrl(meta.photo) || prev?.photo,
        });
      }
      const existing = pcs.current.get(id);
      if (existing) return existing;
      const incoming = metaRef.current.get(id);
      const bypass = ghost || student.id === "efaa-admin" || Boolean(incoming?.ghost);
      if (!bypass && studentCount() > maxPeers) {
        metaRef.current.delete(id);
        return undefined;
      }

      const pc = new RTCPeerConnection({ iceServers: ROOM_ICE, iceCandidatePoolSize: 2 });
      const local = streamRef.current;
      if (local && !ghost) {
        local.getAudioTracks().forEach((track) => pc.addTrack(track, local));
      } else {
        pc.addTransceiver("audio", { direction: "recvonly" });
      }
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        void channel.send({
          type: "broadcast",
          event: "signal",
          payload: {
            from: student.id,
            to: id,
            type: "ice",
            candidate: event.candidate.toJSON(),
          } satisfies Signal,
        });
      };
      pc.ontrack = (event) => {
        if (event.track.kind === "audio") watchTrack(id, event.track);
        if (!cancelled) publish();
      };
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "failed") void pc.restartIce();
        if (pc.iceConnectionState === "disconnected") {
          window.setTimeout(() => {
            if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
              void pc.restartIce();
            }
          }, 1600);
        }
      };
      pcs.current.set(id, pc);
      return pc;
    }

    async function call(id: string) {
      const pc = ensurePc(id);
      if (!pc) return;
      try {
        makingOffer.current.set(id, true);
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
        await pc.setLocalDescription(offer);
        const meta = metaRef.current.get(id);
        void channel.send({
          type: "broadcast",
          event: "signal",
          payload: {
            from: student.id,
            to: id,
            type: "offer",
            sdp: pc.localDescription || offer,
            name: studentBoardName(student),
            nationality: student.nationality,
            photo: slimAvatarUrl(student.photo),
            ghost,
          } satisfies Signal,
        });
        void meta;
      } catch {
        /* glare / closed */
      } finally {
        makingOffer.current.set(id, false);
      }
    }

    async function onSignal(payload: Signal) {
      if (dailyOnRef.current) return;
      if (!payload || payload.from === student.id) return;
      if (payload.to && payload.to !== student.id) return;
      if (payload.type === "join") {
        const pc = ensurePc(payload.from, payload);
        if (pc && student.id < payload.from) await call(payload.from);
        publish();
        return;
      }
      if (payload.type === "leave") {
        closePeer(payload.from);
        return;
      }
      if (payload.type === "offer" && payload.sdp) {
        const pc = ensurePc(payload.from, payload);
        if (!pc) return;
        const polite = student.id > payload.from;
        const collision = Boolean(makingOffer.current.get(payload.from)) || pc.signalingState !== "stable";
        ignoreOffer.current.set(payload.from, !polite && collision);
        if (ignoreOffer.current.get(payload.from)) return;
        await pc.setRemoteDescription(payload.sdp);
        await flushIce(payload.from, pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        void channel.send({
          type: "broadcast",
          event: "signal",
          payload: { from: student.id, to: payload.from, type: "answer", sdp: answer } satisfies Signal,
        });
        publish();
        return;
      }
      if (payload.type === "answer" && payload.sdp) {
        const pc = pcs.current.get(payload.from);
        if (pc && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(payload.sdp);
          await flushIce(payload.from, pc);
        }
        return;
      }
      if (payload.type === "ice" && payload.candidate) {
        const pc = ensurePc(payload.from);
        if (!pc) return;
        if (!pc.remoteDescription) {
          const queued = pendingIce.current.get(payload.from) || [];
          queued.push(payload.candidate);
          pendingIce.current.set(payload.from, queued);
          return;
        }
        try {
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* late ice */
        }
      }
    }

    function syncPresence() {
      const state = channel.presenceState<PresenceMeta>();
      if (dailyOnRef.current) {
        Object.values(state).forEach((entries) => {
          const peer = entries[entries.length - 1];
          if (!peer?.id || peer.id === student.id || peer.ghost) return;
          if (peer.startedAt && (!startedAtRef.current || peer.startedAt < startedAtRef.current)) {
            startedAtRef.current = peer.startedAt;
          }
        });
        return;
      }
      const seen = new Set<string>();
      let humanPeerSeen = false;
      Object.values(state).forEach((entries) => {
        const peer = entries[entries.length - 1];
        if (!peer?.id || peer.id === student.id) return;
        seen.add(peer.id);
        if (!peer.ghost) humanPeerSeen = true;
        const fresh = !pcs.current.has(peer.id);
        const pc = ensurePc(peer.id, peer);
        if (peer.startedAt && (!startedAtRef.current || peer.startedAt < startedAtRef.current)) {
          startedAtRef.current = peer.startedAt;
        }
        if (fresh && pc && student.id < peer.id) void call(peer.id);
      });
      [...pcs.current.keys()].forEach((id) => {
        if (!seen.has(id)) closePeer(id);
      });
      if (humanPeerSeen) startActualMatch();
      publish();
    }

    (async () => {
      const micTask = ghost ? Promise.resolve(null) : captureRoomMic();
      if (cancelled) return;
      publish();

      const daily = await joinDailyVoice({
        roomId,
        me: student,
        stream: null,
        listenOnly: ghost,
        ttlSec: durationSec + 90,
        onCall: (call) => {
          dailyCallRef.current = call;
        },
        onSpeaker: (id) => {
          if (!cancelled) setActiveSpeakerId(id);
        },
        onPeers: (list) => {
          if (cancelled) return;
          if (list.some((peer) => !peer.local)) startActualMatch();
          setPeers(
            list.map((peer) => ({
              id: peer.id,
              name: peer.name,
              nationality: peer.nationality,
              photo: peer.photo,
              local: peer.local,
              ghost: false,
              audioOn: peer.audioOn,
              speaking: false,
              audioTrack: peer.audioTrack,
              level: levelsRef.current.get(peer.id) || 0,
            })),
          );
        },
      });
      if (cancelled) {
        await leaveDailyVoice(daily);
        return;
      }
      if (daily) {
        dailyCallRef.current = daily;
        dailyOnRef.current = true;
        void micTask.then(async (stream) => {
          if (cancelled) return;
          streamRef.current = stream;
          if (!stream || !audioOnRef.current) return;
          stream.getAudioTracks().forEach((track) => {
            track.enabled = true;
          });
          await publishMic(daily, stream);
          publish();
        });
      } else {
        streamRef.current = await micTask;
      }

      channel.on("broadcast", { event: "signal" }, ({ payload }) => {
        void onSignal(payload as Signal);
      });
      channel.on("broadcast", { event: "reaction" }, ({ payload }) => {
        const hit = payload as ReactionPayload;
        if (!hit?.emoji) return;
        pushFloat(setFloats, hit.emoji, 8 + Math.random() * 84);
      });
      channel.on("broadcast", { event: "session" }, ({ payload }) => {
        const start = Number((payload as { startedAt?: number })?.startedAt);
        if (start && (!startedAtRef.current || start < startedAtRef.current)) {
          startedAtRef.current = start;
        }
      });
      channel.on("presence", { event: "sync" }, syncPresence);

      await new Promise<void>((resolve) => {
        channel.subscribe((state) => {
          if (state === "SUBSCRIBED") resolve();
        });
        window.setTimeout(() => resolve(), 4000);
      });
      if (cancelled) return;

      await channel.track({
        id: student.id,
        name: studentBoardName(student),
        nationality: student.nationality,
        ghost,
        startedAt: startedAtRef.current || undefined,
      } satisfies PresenceMeta);
      if (startedAtRef.current) {
        void channel.send({ type: "broadcast", event: "session", payload: { startedAt: startedAtRef.current } });
      }
      if (!dailyOnRef.current) {
        void channel.send({
          type: "broadcast",
          event: "signal",
          payload: {
            from: student.id,
            type: "join",
            name: studentBoardName(student),
            nationality: student.nationality,
            photo: slimAvatarUrl(student.photo),
            ghost,
          } satisfies Signal,
        });
      }
      setStatus("live");
      publish();
    })();

    const settle = () => {
      if (ghost || finishedRef.current) return;
      const seconds = matchPracticeSeconds(speechMsRef.current, startedAtRef.current);
      if (seconds < MATCH_PRACTICE_MIN_SEC) return;
      finishedRef.current = true;
      onFinishedRef.current(seconds);
    };

    const clock = window.setInterval(() => {
      const start = startedAtRef.current;
      if (start) {
        const left = Math.max(0, durationSec - Math.floor((Date.now() - start) / 1000));
        setRemaining(left);
        if (left <= 0) settle();
      } else {
        setRemaining(durationSec);
      }
      metersRef.current.forEach((meter, id) => {
        meter.analyser.getByteFrequencyData(meter.data);
        let sum = 0;
        for (const value of meter.data) sum += value;
        levelsRef.current.set(id, sum / meter.data.length);
      });
      let bestId = student.id;
      let best = levelsRef.current.get(student.id) || 0;
      levelsRef.current.forEach((value, id) => {
        if (value > best) {
          best = value;
          bestId = id;
        }
      });
      setActiveSpeakerId(best > 14 ? bestId : null);
    }, 250);

    let raf = 0;
    const meterLocal = async () => {
      const track = streamRef.current?.getAudioTracks()[0];
      if (!track) return;
      try {
        meterCtx = meterCtx || new AudioContext();
        const source = meterCtx.createMediaStreamSource(new MediaStream([track]));
        const analyser = meterCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>;
        metersRef.current.set(student.id, { analyser, data });
        let last = performance.now();
        const loop = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (const value of data) sum += value;
          const avg = sum / data.length;
          levelsRef.current.set(student.id, avg);
          const now = performance.now();
          if (audioOnRef.current && avg > 16) speechMsRef.current += now - last;
          last = now;
          raf = requestAnimationFrame(loop);
        };
        void meterCtx.resume();
        loop();
      } catch {
        /* optional */
      }
    };
    const meterTimer = window.setTimeout(() => void meterLocal(), 300);
    const onPageHide = () => settle();
    window.addEventListener("pagehide", onPageHide);

    return () => {
      settle();
      cancelled = true;
      window.clearInterval(clock);
      window.clearTimeout(meterTimer);
      window.removeEventListener("pagehide", onPageHide);
      cancelAnimationFrame(raf);
      void meterCtx?.close();
      void channel.send({
        type: "broadcast",
        event: "signal",
        payload: { from: student.id, type: "leave" } satisfies Signal,
      });
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
      metaRef.current.clear();
      metersRef.current.clear();
      const daily = dailyCallRef.current;
      dailyCallRef.current = null;
      dailyOnRef.current = false;
      void leaveDailyVoice(daily);
      releaseRoomMic();
      streamRef.current = null;
      channelRef.current = null;
      void supabase.removeChannel(channel);
      setStatus("off");
    };
  }, [durationSec, enabled, ghost, maxPeers, me, publish, roomId]);

  function toggleAudio() {
    if (ghost) return;
    const next = !audioOn;
    audioOnRef.current = next;
    setAudioOn(next);
    streamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    const daily = dailyCallRef.current;
    if (daily) {
      if (next) void publishMic(daily, streamRef.current);
      else void daily.setLocalAudio(false);
    }
    publish();
  }

  function sendReaction(emoji: string) {
    const to = activeSpeakerId || "";
    void channelRef.current?.send({
      type: "broadcast",
      event: "reaction",
      payload: { emoji, from: me?.id || "", to } satisfies ReactionPayload,
    });
    pushFloat(setFloats, emoji, 12 + Math.random() * 76);
    if (to && me && to !== me.id) onReactionToRef.current(to, me.id);
  }

  return {
    peers: peers.filter((peer) => !peer.ghost || ghost),
    audioOn,
    remaining,
    activeSpeakerId,
    floats,
    status,
    toggleAudio,
    sendReaction,
    durationSec,
    practiceSeconds: () => matchPracticeSeconds(speechMsRef.current, startedAtRef.current),
  };
}
