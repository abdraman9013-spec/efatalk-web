"use client";

import { Mic, MicOff, PhoneOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { fetchStudentPortrait, restoreStudent } from "@/lib/efaa-db";
import { adminHost, isAdminAuthed, isFakeAdminStudent } from "@/lib/admin";
import { MATCH_PRACTICE_MIN_SEC, awardMatchPoints } from "@/lib/gamification";
import { captureRoomMic, bindRemoteAudio, unlockRoomAudio } from "@/lib/room-mic";
import { lobbyPath, roomPath, studentBoardName, type EfaaStudent } from "@/lib/session";
import { useAloneExit } from "@/lib/use-alone-exit";
import { readMatchSeat, type MatchMember } from "@/lib/use-lobby";
import { useDailyAudioMatch, type AudioPeer } from "@/lib/use-daily-audio";
import { countryByCode } from "@/lib/countries";
import { slimAvatarUrl, useAvatarBroadcast } from "@/lib/avatar";
import { useLiveIndex } from "@/lib/use-live-index";
import { StudentPortrait } from "@/components/avatar/student-portrait";

export function DuoRoom({ pairId }: { pairId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [result, setResult] = useState<{ points: number; diamonds: number } | null>(null);
  const [micReady, setMicReady] = useState(false);
  const [seatPhotos, setSeatPhotos] = useState<Record<string, string>>({});
  const [seat, setSeat] = useState<MatchMember[]>([]);
  const awarded = useRef(false);
  const roomKey = `duo-${pairId.toLowerCase().replace(/[^a-z0-9-]/g, "")}`.slice(0, 48);
  useAvatarBroadcast(setMe);
  const livePublish = useMemo(
    () =>
      me && micReady && !result
        ? {
            roomId: roomKey,
            level: "beginner" as const,
            id: me.id,
            name: studentBoardName(me),
            ghost: false,
          }
        : null,
    [me, micReady, result, roomKey],
  );
  useLiveIndex(livePublish);

  const finish = useCallback(
    async (speechSeconds: number) => {
      if (!me || awarded.current) return;
      awarded.current = true;
      try {
        const payload = await awardMatchPoints(me.id, speechSeconds);
        setResult({ points: payload.points_gained, diamonds: payload.diamonds_gained });
      } catch {
        setResult({ points: 0, diamonds: 0 });
      }
      window.setTimeout(() => router.push(lobbyPath("beginner")), 2200);
    },
    [me, router],
  );

  const call = useDailyAudioMatch(roomKey, me, Boolean(me) && !result, finish);
  const remoteHumans = call.peers.filter((peer) => !peer.local).length;
  const adminHere = isAdminAuthed() || isFakeAdminStudent(me);
  const leaveLobby = useCallback(() => {
    const practiced = call.practiceSeconds();
    if (practiced >= MATCH_PRACTICE_MIN_SEC) void finish(practiced);
    else router.push(lobbyPath("beginner"));
  }, [call, finish, router]);

  const partnerGone = useAloneExit({
    enabled: Boolean(me) && !result,
    exempt: adminHere,
    remoteHumanCount: remoteHumans,
    onExit: leaveLobby,
  });

  useEffect(() => {
    let live = true;
    restoreStudent()
      .then((student) => {
        if (!live) return;
        if (isAdminAuthed()) {
          setMe(adminHost("beginner"));
          return;
        }
        if (!student?.level) {
          router.replace("/auth");
          return;
        }
        if (student.level !== "beginner") {
          router.replace(roomPath(student.level));
          return;
        }
        setMe(student);
      })
      .catch(() => {
        if (isAdminAuthed()) {
          setMe(adminHost("beginner"));
          return;
        }
        router.replace("/auth");
      });
    return () => {
      live = false;
    };
  }, [router]);

  useEffect(() => {
    setSeat(readMatchSeat(pairId));
  }, [pairId]);

  useEffect(() => {
    let live = true;
    seat.forEach((member) => {
      const known = slimAvatarUrl(member.avatarUrl);
      if (known) {
        setSeatPhotos((prev) => (prev[member.id] ? prev : { ...prev, [member.id]: known }));
        return;
      }
      void fetchStudentPortrait(member.id).then((url) => {
        if (!live || !url) return;
        setSeatPhotos((prev) => ({ ...prev, [member.id]: url }));
      });
    });
    return () => {
      live = false;
    };
  }, [pairId, seat]);

  useEffect(() => {
    let live = true;
    void captureRoomMic().then((stream) => {
      if (live && stream) setMicReady(true);
    });
    const unlock = () => unlockRoomAudio();
    window.addEventListener("pointerdown", unlock);
    return () => {
      live = false;
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);

  const expectedPartner = seat.find((member) => member.id !== me?.id) || null;

  const livePeers = (call.peers.length
    ? call.peers.slice(0, 2)
    : me
      ? [
          {
            sessionId: "local-wait",
            userId: me.id,
            name: studentBoardName(me),
            nationality: me.nationality,
            streak: me.streak,
            photo: me.photo,
            local: true,
            audioOn: call.audioOn,
            speaking: false,
          } satisfies AudioPeer,
        ]
      : []
  ).map((peer) =>
    peer.local && me
      ? {
          ...peer,
          userId: peer.userId || me.id,
          name: studentBoardName(me),
          photo: slimAvatarUrl(peer.photo || me.photo) || peer.photo || me.photo,
        }
      : {
          ...peer,
          photo: peer.photo || (peer.userId ? seatPhotos[peer.userId] : undefined),
        },
  );
  const waitingPartner =
    remoteHumans === 0
      ? expectedPartner
        ? ({
            sessionId: `wait-${expectedPartner.id}`,
            userId: expectedPartner.id,
            name: expectedPartner.name,
            photo: expectedPartner.avatarUrl || seatPhotos[expectedPartner.id],
            local: false,
            audioOn: false,
            speaking: false,
          } satisfies AudioPeer)
        : me
          ? ({
              sessionId: "wait-partner",
              userId: "wait-partner",
              name: t.duo.waiting,
              local: false,
              audioOn: false,
              speaking: false,
            } satisfies AudioPeer)
          : null
      : null;
  const shown = waitingPartner ? [...livePeers.slice(0, 1), waitingPartner] : livePeers;

  const minutes = Math.floor(call.remaining / 60);
  const seconds = String(call.remaining % 60).padStart(2, "0");

  return (
    <div className="lobby-shell">
      <div className="lobby-aurora" aria-hidden />
      <header className="lobby-header">
        <div>
          <p className="lobby-kicker">{t.duo.kicker}</p>
          <h1 className="lobby-title">{t.duo.title}</h1>
        </div>
        <span className="duo-timer">
          {minutes}:{seconds}
        </span>
      </header>

      <section className="duo-audio-grid">
        {shown.map((peer) => (
          <AudioCard
            key={peer.userId || peer.sessionId}
            peer={peer}
            you={peer.local ? t.lobby.you : undefined}
            waiting={!peer.local && remoteHumans === 0 ? t.duo.waiting : undefined}
          />
        ))}
      </section>

      {!micReady ? (
        <button
          type="button"
          className="live-mic-tap"
          onClick={() => {
            unlockRoomAudio();
            void captureRoomMic().then((stream) => {
              if (stream) setMicReady(true);
            });
          }}
        >
          {t.live.micOn}
        </button>
      ) : null}

      <div className="live-controls relative z-10">
        <button
          type="button"
          onClick={call.toggleAudio}
          className={`live-ctrl ${call.audioOn ? "live-ctrl-on" : ""}`}
        >
          {call.audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          <span>{call.audioOn ? t.room.micActive : t.room.talk}</span>
        </button>
        <button type="button" onClick={leaveLobby} className="live-ctrl duo-leave">
          <PhoneOff className="h-5 w-5" />
          <span>{t.duo.leave}</span>
        </button>
      </div>

      {partnerGone ? (
        <p className="room-soft-toast" role="status">
          {t.lobby.partnerLeft}
        </p>
      ) : null}

      {result && (
        <div className="lobby-matched">
          <div className="lobby-matched-card">
            <p className="lobby-matched-label">{t.duo.complete}</p>
            <p className="lobby-matched-name">+{result.points}</p>
            {result.diamonds > 0 && <p className="lobby-matched-go">💎 +{result.diamonds}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function AudioCard({ peer, you, waiting }: { peer: AudioPeer; you?: string; waiting?: string }) {
  const country = peer.nationality ? countryByCode(peer.nationality) : undefined;
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || peer.local) return;
    if (peer.audioTrack) {
      bindRemoteAudio(el, peer.audioTrack);
    } else {
      bindRemoteAudio(el, null);
    }
  }, [peer.audioTrack, peer.local]);

  return (
    <article className={`duo-audio-card ${waiting ? "duo-audio-waiting" : ""} ${peer.audioOn ? "" : "duo-audio-muted"}`}>
      <StudentPortrait name={peer.name} photo={peer.photo} size={86} living={peer.audioOn} userId={peer.userId || peer.sessionId} />
      <p className="duo-audio-name">
        {peer.name}
        {country && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
            alt=""
            className="ms-1 inline h-3 w-[18px] rounded-[2px] object-cover align-middle"
          />
        )}
      </p>
      <p className="duo-audio-meta">{you || waiting || (peer.audioOn ? "●" : "muted")}</p>
      {!peer.local && <audio ref={audioRef} autoPlay playsInline />}
    </article>
  );
}
