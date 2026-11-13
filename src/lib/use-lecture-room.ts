"use client";

import Daily, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { useEffect, useRef, useState } from "react";
import { markPresent } from "@/lib/attendance";
import { attachRoomVoice, type VoiceProfile } from "@/lib/room-voice";
import { isDailyUrl } from "@/lib/keep-in-app";
import { removeRealtimeChannel } from "@/lib/realtime-channel";
import { studentBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

const DAILY_JOIN_MS = 10000;

export type LectureListen = { id: string; track: MediaStreamTrack };
export type LecturePeer = { id: string; name: string; photo?: string };

function screenTrackOf(p: DailyParticipant) {
  const slot = p.tracks.screenVideo;
  return slot?.persistentTrack || slot?.track || undefined;
}

function remoteAudioOf(call: DailyCall) {
  const listens: LectureListen[] = [];
  Object.values(call.participants()).forEach((p) => {
    if (p.local) return;
    const mic = p.tracks.audio?.persistentTrack;
    const share = p.tracks.screenAudio?.persistentTrack;
    if (mic) listens.push({ id: `${p.session_id}-mic`, track: mic });
    if (share) listens.push({ id: `${p.session_id}-screen`, track: share });
  });
  return listens;
}

function peersFromPresence(state: Record<string, LecturePeer[]>) {
  const out: LecturePeer[] = [];
  const seen = new Set<string>();
  Object.values(state).forEach((entries) => {
    const row = entries[entries.length - 1];
    if (!row?.id || row.id === "efaa-admin" || seen.has(row.id)) return;
    seen.add(row.id);
    out.push({ id: row.id, name: row.name || "—", photo: row.photo });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function useLectureRoom(roomKey: string, me: EfaaStudent | null, enabled: boolean, teacher: boolean) {
  const callRef = useRef<DailyCall | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const classMicsRef = useRef(false);
  const pushMicsRef = useRef<(on: boolean) => void>(() => undefined);
  const pushMicOneRef = useRef<(id: string, on: boolean) => void>(() => undefined);
  const meshVoiceRef = useRef<ReturnType<typeof attachRoomVoice> | null>(null);
  const [screenTrack, setScreenTrack] = useState<MediaStreamTrack | undefined>();
  const [listenTracks, setListenTracks] = useState<LectureListen[]>([]);
  const [sharing, setSharing] = useState(false);
  const [micLive, setMicLive] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);
  const [presentPeers, setPresentPeers] = useState<LecturePeer[]>([]);
  const [mutedIds, setMutedIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"off" | "joining" | "live" | "fallback">("off");

  useEffect(() => {
    if (!enabled || !me) return;
    const student = me;
    let cancelled = false;
    let fallbackStarted = false;
    let stopMesh: (() => void) | undefined;
    const profile: VoiceProfile = {
      name: studentBoardName(student),
      nationality: student.nationality,
      photo: student.photo,
      userId: student.id,
    };

    // Live presence roll — only people actually in this lecture room appear here.
    const supabaseRoll = getSupabase();
    const rollTopic = `efaa-lecture-roll-${roomKey}`;
    const roll = supabaseRoll.channel(rollTopic, {
      config: { presence: { key: student.id } },
    });
    roll.on("presence", { event: "sync" }, () => {
      setPresentPeers(peersFromPresence(roll.presenceState<LecturePeer>()));
    });
    void roll.subscribe((state) => {
      if (state !== "SUBSCRIBED" || cancelled) return;
      void roll.track({
        id: student.id,
        name: profile.name,
        photo: profile.photo,
      });
      if (!teacher) void markPresent(student.id, "lecture");
    });

    async function grabMic() {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const track = stream.getAudioTracks()[0];
      track.enabled = teacher || classMicsRef.current;
      micTrackRef.current = track;
      localStreamRef.current = stream;
      return track;
    }

    async function applyStudentMic(call: DailyCall | null, on: boolean) {
      if (teacher) return;
      classMicsRef.current = on;
      if (on && (!micTrackRef.current || micTrackRef.current.readyState !== "live")) {
        try {
          await grabMic();
        } catch {
          /* phone blocked the mic */
        }
      }
      const track = micTrackRef.current;
      if (track && track.readyState === "live") track.enabled = on;
      if (call) {
        try {
          if (on && track && track.readyState === "live") {
            await call.setInputDevicesAsync({ audioSource: track });
          }
          call.setLocalAudio(on);
        } catch {
          try {
            call.setLocalAudio(on);
          } catch {
            /* local track still toggled */
          }
        }
      }
      setMicLive(on);
    }

    async function keepMicOn(call: DailyCall) {
      if (!teacher || cancelled) return;
      const track = micTrackRef.current;
      try {
        if (track && track.readyState === "live") {
          track.enabled = true;
          await call.setInputDevicesAsync({ audioSource: track });
        }
        call.setLocalAudio(true);
        setMicLive(true);
      } catch {
        try {
          call.setLocalAudio(true);
          setMicLive(true);
        } catch {
          /* still try to speak */
        }
      }
    }

    function publishFromDaily(call: DailyCall) {
      if (cancelled || fallbackStarted) return;
      const people = Object.values(call.participants());
      setListenerCount(people.length);
      let video: MediaStreamTrack | undefined;
      for (const p of people) video = video || screenTrackOf(p);
      setScreenTrack(video);
      setListenTracks(remoteAudioOf(call));
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
      }
      try {
        if (!localStreamRef.current) {
          try {
            await grabMic();
          } catch {
            localStreamRef.current = new MediaStream();
          }
        }
        const supabase = getSupabase();
        const channel = supabase.channel(`efaa-lecture-${roomKey}`, {
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
        const mesh = attachRoomVoice({
          channel,
          myId: student.id,
          stream: localStreamRef.current || new MediaStream(),
          profile,
          onRemote: (peerId, remote) => {
            const video = remote.getVideoTracks()[0];
            if (video) setScreenTrack(video);
            setListenTracks(remote.getAudioTracks().map((track, i) => ({ id: `${peerId}-${i}`, track })));
          },
          onPeerLeft: () => {
            setScreenTrack(undefined);
            setListenTracks([]);
          },
        });
        meshVoiceRef.current = mesh;
        stopMesh = () => {
          mesh.stop();
          meshVoiceRef.current = null;
        };
      } catch {
        /* chat still works */
      }
    }

    const supabaseCtl = getSupabase();
    const ctl = supabaseCtl.channel(`efaa-lecture-ctl-${roomKey}`, {
      config: { broadcast: { self: false } },
    });
    ctl.on("broadcast", { event: "mics" }, ({ payload }) => {
      void applyStudentMic(callRef.current, Boolean((payload as { on?: boolean })?.on));
    });
    ctl.on("broadcast", { event: "mic-one" }, ({ payload }) => {
      const row = payload as { id?: string; on?: boolean };
      if (row.id && row.id !== student.id) return;
      void applyStudentMic(callRef.current, Boolean(row.on));
    });
    ctl.on("broadcast", { event: "ask" }, () => {
      if (!teacher || !classMicsRef.current) return;
      void ctl.send({ type: "broadcast", event: "mics", payload: { on: true } });
      const live = callRef.current;
      if (!live) return;
      try {
        live.sendAppMessage({ type: "efaa-mics", on: true }, "*");
      } catch {
        /* Daily optional */
      }
    });
    void ctl.subscribe((state) => {
      if (state === "SUBSCRIBED" && !teacher) {
        void ctl.send({ type: "broadcast", event: "ask", payload: {} });
      }
    });
    pushMicsRef.current = (on: boolean) => {
      void ctl.send({ type: "broadcast", event: "mics", payload: { on } });
    };
    pushMicOneRef.current = (id: string, on: boolean) => {
      void ctl.send({ type: "broadcast", event: "mic-one", payload: { id, on } });
    };

    const call = Daily.createCallObject({
      audioSource: true,
      videoSource: false,
      subscribeToTracksAutomatically: true,
    });
    callRef.current = call;

    const refresh = () => publishFromDaily(call);

    call.on("joined-meeting", () => {
      void keepMicOn(call);
      refresh();
    });
    call.on("app-message", (ev) => {
      const data = (ev as { data?: { type?: string; on?: boolean; id?: string } }).data;
      if (data?.type === "efaa-mic-one") {
        if (data.id === student.id) void applyStudentMic(call, Boolean(data.on));
        return;
      }
      if (data?.type !== "efaa-mics") return;
      void applyStudentMic(call, Boolean(data.on));
    });
    call.on("participant-joined", () => {
      refresh();
      if (!teacher || !classMicsRef.current) return;
      window.setTimeout(() => {
        try {
          call.sendAppMessage({ type: "efaa-mics", on: true }, "*");
        } catch {
          /* Daily may reject until joined */
        }
        pushMicsRef.current(true);
      }, 400);
    });
    call.on("participant-updated", refresh);
    call.on("participant-left", refresh);
    call.on("track-started", refresh);
    call.on("track-stopped", refresh);
    call.on("local-screen-share-started", () => {
      setSharing(true);
      window.setTimeout(() => void keepMicOn(call), 250);
      refresh();
    });
    call.on("local-screen-share-stopped", () => {
      setSharing(false);
      void keepMicOn(call);
      refresh();
    });
    call.on("error", () => {
      void startMesh();
    });

    (async () => {
      setStatus("joining");
      try {
        await grabMic();
      } catch {
        /* join still tried */
      }
      try {
        await call.startCamera({
          startAudioOff: !teacher,
          startVideoOff: true,
          audioSource: micTrackRef.current || true,
          videoSource: false,
        });
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
            startAudioOff: !teacher,
            startVideoOff: true,
            audioSource: micTrackRef.current || true,
            userData: { userId: student.id, role: teacher ? "teacher" : "student" },
          }),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("daily-timeout")), DAILY_JOIN_MS);
          }),
        ]);
        if (cancelled || fallbackStarted) return;
        await keepMicOn(call);
        setStatus("live");
        refresh();
      } catch {
        await startMesh();
      }
    })();

    return () => {
      cancelled = true;
      pushMicsRef.current = () => undefined;
      pushMicOneRef.current = () => undefined;
      void removeRealtimeChannel(rollTopic, supabaseRoll, roll);
      void supabaseCtl.removeChannel(ctl);
      stopMesh?.();
      meshVoiceRef.current = null;
      micTrackRef.current?.stop();
      micTrackRef.current = null;
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      const current = callRef.current;
      callRef.current = null;
      if (current) current.leave().finally(() => current.destroy());
    };
  }, [enabled, roomKey, me, teacher]);

  async function startShare() {
    const call = callRef.current;
    let display: MediaStream;
    try {
      display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
    } catch {
      return; // user cancelled picker
    }
    const video = display.getVideoTracks()[0];
    if (!video) {
      display.getTracks().forEach((t) => t.stop());
      return;
    }
    video.addEventListener("ended", () => {
      void stopShare();
    });

    // Always show local preview immediately so the teacher sees it worked.
    setScreenTrack(video);
    setSharing(true);

    if (call) {
      try {
        call.startScreenShare({ mediaStream: display });
        window.setTimeout(() => {
          const live = callRef.current;
          if (!live) return;
          publishLocalScreen(live, video);
          const track = micTrackRef.current;
          if (track && track.readyState === "live") {
            track.enabled = true;
            void live.setInputDevicesAsync({ audioSource: track });
          }
          live.setLocalAudio(true);
          setMicLive(true);
        }, 350);
        return;
      } catch {
        try {
          call.startScreenShare({ displayMediaOptions: { video: true, audio: true } });
          return;
        } catch {
          /* mesh below */
        }
      }
    }

    try {
      await meshVoiceRef.current?.publishScreen(video);
    } catch {
      /* local preview still on */
    }
  }

  function publishLocalScreen(call: DailyCall, fallback: MediaStreamTrack) {
    const people = Object.values(call.participants());
    let video: MediaStreamTrack | undefined;
    for (const p of people) video = video || screenTrackOf(p);
    setScreenTrack(video || fallback);
  }

  async function stopShare() {
    const call = callRef.current;
    if (call) {
      try {
        call.stopScreenShare();
      } catch {
        /* already stopped */
      }
      const track = micTrackRef.current;
      if (track && track.readyState === "live") {
        track.enabled = true;
        void call.setInputDevicesAsync({ audioSource: track });
      }
      call.setLocalAudio(true);
    }
    try {
      await meshVoiceRef.current?.stopScreen();
    } catch {
      /* ignore */
    }
    setSharing(false);
    setScreenTrack(undefined);
  }

  function dailySessionForUser(userId: string) {
    const call = callRef.current;
    if (!call) return "";
    const hit = Object.values(call.participants()).find((p) => {
      const data = p.userData as { userId?: string } | undefined;
      return !p.local && data?.userId === userId;
    });
    return hit?.session_id || "";
  }

  function setAllMics(on: boolean) {
    classMicsRef.current = on;
    const call = callRef.current;
    if (call) {
      try {
        call.sendAppMessage({ type: "efaa-mics", on }, "*");
      } catch {
        /* students still receive supabase */
      }
      Object.values(call.participants()).forEach((p) => {
        if (p.local) return;
        void call.updateParticipant(p.session_id, { setAudio: on });
      });
    }
    pushMicsRef.current(on);
    setMutedIds(on ? [] : presentPeers.map((peer) => peer.id));
  }

  function setOneMic(userId: string, on: boolean) {
    const call = callRef.current;
    const sid = dailySessionForUser(userId);
    if (call) {
      try {
        call.sendAppMessage({ type: "efaa-mic-one", id: userId, on }, "*");
      } catch {
        /* supabase still delivers */
      }
      if (sid) void call.updateParticipant(sid, { setAudio: on });
    }
    pushMicOneRef.current(userId, on);
    setMutedIds((prev) => {
      const next = new Set(prev);
      if (on) next.delete(userId);
      else next.add(userId);
      return [...next];
    });
  }

  return {
    screenTrack,
    listenTracks,
    sharing,
    micLive,
    listenerCount,
    presentPeers,
    mutedIds,
    status,
    startShare,
    stopShare,
    muteAll: () => setAllMics(false),
    unmuteAll: () => setAllMics(true),
    muteOne: (id: string) => setOneMic(id, false),
    unmuteOne: (id: string) => setOneMic(id, true),
  };
}
