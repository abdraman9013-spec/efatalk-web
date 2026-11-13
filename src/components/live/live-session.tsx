"use client";

import { Mic, MicOff, PhoneOff, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpeechWave } from "@/components/intermediate/speech-wave";
import { TopicRoulette } from "@/components/intermediate/topic-roulette";
import { useI18n } from "@/i18n/provider";
import type { Level } from "@/i18n/translations";
import { adminHost, isAdminAuthed, isFakeAdminStudent } from "@/lib/admin";
import { countryByCode } from "@/lib/countries";
import { restoreStudent } from "@/lib/efaa-db";
import { MATCH_PRACTICE_MIN_SEC, awardMatchPoints, awardReactionPoints, beginnerNextPath } from "@/lib/gamification";
import { ADVANCED_TOPICS } from "@/lib/advanced-topics";
import { fallbackCatalog } from "@/lib/debate-topics";
import { DEBATE_TOPICS, type DebateTopic } from "@/lib/intermediate-topics";
import { captureRoomMic, bindRemoteAudio, unlockRoomAudio } from "@/lib/room-mic";
import { lobbyPath, studentBoardName, visibleBoardName, type EfaaStudent } from "@/lib/session";
import { useLiveChat } from "@/lib/use-live-chat";
import { useLiveIndex } from "@/lib/use-live-index";
import { useAloneExit } from "@/lib/use-alone-exit";
import { readMatchSeat, type MatchMember } from "@/lib/use-lobby";
import { slimAvatarUrl, useAvatarBroadcast } from "@/lib/avatar";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import {
  MESH_SECONDS,
  REACTION_EMOJIS,
  useMultiplayerRoom,
  type MeshLevel,
  type MeshPeer,
} from "@/lib/use-multiplayer-room";

function isMeshLevel(value: string): value is MeshLevel {
  return value === "intermediate" || value === "advanced";
}

export function LiveSession({ level, roomId }: { level: string; roomId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode");
  const ghost = mode === "ghost";
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [god, setGod] = useState(false);
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [catalog, setCatalog] = useState<DebateTopic[]>(
    isMeshLevel(level) ? fallbackCatalog(level) : DEBATE_TOPICS,
  );
  const [result, setResult] = useState<{ points: number; diamonds: number } | null>(null);
  const [prison, setPrison] = useState(false);
  const [burst, setBurst] = useState(0);
  const [micReady, setMicReady] = useState(ghost);
  const [seat, setSeat] = useState<MatchMember[]>([]);
  const awarded = useRef(false);
  const reactLock = useRef(0);
  useAvatarBroadcast(setMe);

  const meshLevel: MeshLevel = isMeshLevel(level) ? level : "intermediate";
  const durationSec = MESH_SECONDS[meshLevel];

  useEffect(() => {
    let live = true;
    fetch(`/api/topics?level=${meshLevel}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { topics?: DebateTopic[] } | null) => {
        if (!live || !body?.topics?.length) return;
        setCatalog(body.topics);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [meshLevel]);
  const safeRoom = decodeURIComponent(roomId).slice(0, 64);

  const finish = useCallback(
    async (speechSeconds: number) => {
      if (ghost || !me || awarded.current) return;
      awarded.current = true;
      setPrison(false);
      if (god) {
        setResult({ points: 0, diamonds: 0 });
        return;
      }
      try {
        const payload = await awardMatchPoints(me.id, speechSeconds);
        setResult({ points: payload.points_gained, diamonds: payload.diamonds_gained });
      } catch {
        setResult({ points: 0, diamonds: 0 });
      }
    },
    [ghost, god, me],
  );

  const onReactionTo = useCallback((speakerId: string, fromId: string) => {
    if (Date.now() - reactLock.current < 320) return;
    reactLock.current = Date.now();
    void awardReactionPoints(speakerId, fromId)
      .then((row) => {
        if (row.points_gained > 0) {
          setBurst((n) => n + row.points_gained);
          window.setTimeout(() => setBurst((n) => Math.max(0, n - row.points_gained)), 900);
        }
      })
      .catch(() => undefined);
  }, []);

  const call = useMultiplayerRoom({
    roomId: safeRoom,
    level: meshLevel,
    me,
    enabled: Boolean(me) && !result,
    durationSec,
    listenOnly: ghost,
    onFinished: finish,
    onReactionTo,
  });

  const publish = useMemo(
    () =>
      me
        ? {
            roomId: safeRoom,
            level: meshLevel,
            id: me.id,
            name: studentBoardName(me),
            ghost,
          }
        : null,
    [ghost, me, meshLevel, safeRoom],
  );
  useLiveIndex(publish);
  const chat = useLiveChat(safeRoom, me);

  useEffect(() => {
    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        if (isAdminAuthed()) {
          setGod(true);
          setMe(adminHost(meshLevel));
          return;
        }
        if (!student?.level) {
          router.replace("/auth");
          return;
        }
        if (student.level !== meshLevel) {
          router.replace(await beginnerNextPath(student));
          return;
        }
        setMe(student);
      })
      .catch(() => router.replace("/auth"));
    return () => {
      live = false;
    };
  }, [meshLevel, router]);

  useEffect(() => {
    if (ghost) {
      setMicReady(true);
      return;
    }
    let live = true;
    void captureRoomMic().then((stream) => {
      if (live && stream) setMicReady(true);
    });
    return () => {
      live = false;
    };
  }, [ghost]);

  useEffect(() => {
    const unlock = () => unlockRoomAudio();
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  useEffect(() => {
    setSeat(readMatchSeat(safeRoom));
  }, [safeRoom]);

  useEffect(() => {
    if (god || result) return;
    history.pushState({ prison: 1 }, "");
    const onPop = () => {
      history.pushState({ prison: 1 }, "");
      setPrison(true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [god, result]);

  const minutes = Math.floor(call.remaining / 60);
  const seconds = String(call.remaining % 60).padStart(2, "0");
  const speaker = call.peers.find((peer) => peer.id === call.activeSpeakerId);
  const leaveTo = god ? "/admin-dashboard" : lobbyPath(meshLevel as Level);
  const remoteHumans = call.peers.filter((peer) => !peer.local && !peer.ghost).length;
  const connectedIds = new Set(call.peers.map((peer) => peer.id));
  const waitingMembers = seat.filter((member) => member.id !== me?.id && !connectedIds.has(member.id));
  const gridCount = Math.min(6, Math.max(2, call.peers.length + waitingMembers.length));
  const creditAndLeave = useCallback(() => {
    if (god || ghost) {
      router.push(leaveTo);
      return;
    }
    const practiced = call.practiceSeconds();
    if (practiced >= MATCH_PRACTICE_MIN_SEC) void finish(practiced);
    else router.push(leaveTo);
  }, [call, finish, ghost, god, leaveTo, router]);
  const partnerGone = useAloneExit({
    enabled: Boolean(me) && !result,
    exempt: god || isFakeAdminStudent(me),
    remoteHumanCount: remoteHumans,
    onExit: creditAndLeave,
  });

  if (!me) return <div className="mid-shell min-h-dvh" />;

  function requestLeave() {
    if (god || result) {
      router.push(leaveTo);
      return;
    }
    setPrison(true);
  }

  return (
    <div className="mid-shell mid-match live-prison">
      <div className="mid-aurora" aria-hidden />
      <header className="mid-header">
        <div>
          <p className="mid-kicker">{meshLevel === "advanced" ? t.live.advKicker : t.live.midKicker}</p>
          <h1 className="mid-title">{meshLevel === "advanced" ? t.live.advTitle : t.live.midTitle}</h1>
        </div>
        <span className="duo-timer">
          {minutes}:{seconds}
        </span>
      </header>

      <TopicRoulette
        pairId={safeRoom}
        catalog={catalog.length ? catalog : meshLevel === "advanced" ? ADVANCED_TOPICS : DEBATE_TOPICS}
        onTopic={setTopic}
      />
      {topic ? (
        <ul className="mid-helps">
          {topic.questions.map((question) => (
            <li key={question.en} dir="ltr">
              {question.en}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="live-members">
        {t.live.members.replace("{n}", String(call.peers.filter((peer) => !peer.ghost).length))}
        {ghost ? ` · ${t.live.ghost}` : ""}
      </p>

      <section className={`duo-audio-grid mid-audio-grid live-grid live-grid-${gridCount}`}>
        {call.peers.map((peer) => (
          <LiveAudioCard
            key={peer.id}
            peer={peer}
            you={peer.local ? t.lobby.you : undefined}
            hot={peer.id === call.activeSpeakerId}
          />
        ))}
        {waitingMembers.map((member) => (
          <article key={`wait-${member.id}`} className="duo-audio-card mid-audio-card duo-audio-waiting">
            <StudentPortrait name={member.name} photo={slimAvatarUrl(member.avatarUrl)} size={86} userId={member.id} />
            <p className="duo-audio-name">{visibleBoardName(member.name) || "—"}</p>
            <p className="duo-audio-meta">{t.duo.waiting}</p>
          </article>
        ))}
      </section>

      <div className="live-float-layer" aria-hidden>
        {call.floats.map((item) => (
          <span key={item.id} className="live-float" style={{ left: `${item.left}%` }}>
            {item.emoji}
          </span>
        ))}
      </div>

      {burst > 0 && speaker ? (
        <p className="live-burst">
          {visibleBoardName(speaker.name)} +{burst}
        </p>
      ) : null}

      <div className="live-chat">
        <div ref={chat.boxRef} className="live-chat-box">
          {chat.messages.map((msg) => (
            <p key={msg.id}>
              <strong>{msg.name}</strong> {msg.text}
            </p>
          ))}
        </div>
        <form
          className="live-chat-form"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            chat.send();
          }}
        >
          <input
            value={chat.draft}
            onChange={(event) => chat.setDraft(event.target.value)}
            placeholder={t.room.chatPlaceholder}
            className="live-chat-input"
          />
          <button type="submit" className="live-chat-send" aria-label={t.room.send}>
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="live-react-bar">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="live-react"
            onClick={() => call.sendReaction(emoji)}
            aria-label={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>

      {!ghost && !micReady ? (
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
        {!ghost ? (
          <button type="button" onClick={call.toggleAudio} className={`live-ctrl ${call.audioOn ? "live-ctrl-on" : ""}`}>
            {call.audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            <span>{call.audioOn ? t.room.micActive : t.room.talk}</span>
          </button>
        ) : null}
        <button type="button" onClick={requestLeave} className="live-ctrl duo-leave">
          <PhoneOff className="h-5 w-5" />
          <span>{god ? t.admin.home : t.duo.leave}</span>
        </button>
      </div>

      {partnerGone ? (
        <p className="room-soft-toast" role="status">
          {t.lobby.partnerLeft}
        </p>
      ) : null}

      {prison && !partnerGone ? (
        <div className="live-prison-mask">
          <div className="live-prison-card">
            <p className="live-prison-title">{t.live.prisonTitle}</p>
            <p className="live-prison-body">{t.live.prisonBody}</p>
            <button type="button" className="mid-enter" onClick={() => setPrison(false)}>
              {t.live.stay}
            </button>
            <button type="button" className="live-prison-quit" onClick={creditAndLeave}>
              {t.live.leave}
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="lobby-matched">
          <div className="lobby-matched-card">
            <p className="lobby-matched-label">{t.live.summary}</p>
            <p className="lobby-matched-name">+{result.points}</p>
            {result.diamonds > 0 ? <p className="lobby-matched-go">💎 +{result.diamonds}</p> : null}
            <button type="button" className="mid-enter mt-3" onClick={() => router.push(leaveTo)}>
              {t.mid.cta}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LiveAudioCard({ peer, you, hot }: { peer: MeshPeer; you?: string; hot?: boolean }) {
  const country = peer.nationality ? countryByCode(peer.nationality) : undefined;
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || peer.local) return;
    if (peer.audioTrack) bindRemoteAudio(el, peer.audioTrack);
    else bindRemoteAudio(el, null);
  }, [peer.audioTrack, peer.local]);

  return (
    <article
      className={`duo-audio-card mid-audio-card ${hot || peer.speaking ? "mid-speaking" : ""} ${peer.audioOn ? "" : "duo-audio-muted"}`}
    >
      <StudentPortrait name={peer.name} photo={peer.photo} size={86} living={Boolean(hot) || peer.speaking} userId={peer.id} />
      <SpeechWave track={peer.audioTrack} active={peer.speaking || Boolean(hot) || (peer.local && peer.audioOn)} />
      <p className="duo-audio-name">
        {peer.name}
        {country ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
            alt=""
            className="ms-1 inline h-3 w-[18px] rounded-[2px] object-cover align-middle"
          />
        ) : null}
      </p>
      <p className="duo-audio-meta">{you || (peer.audioOn ? "●" : "—")}</p>
      {!peer.local ? (
        <audio ref={audioRef} className="live-hidden-audio" autoPlay playsInline muted={false} />
      ) : null}
    </article>
  );
}
