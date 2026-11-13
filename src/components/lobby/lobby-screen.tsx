"use client";

import { Flame, Users, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { countryByCode } from "@/lib/countries";
import { restoreStudent } from "@/lib/efaa-db";
import { PlayEntry } from "@/components/play/play-entry";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import { ClassBoard } from "@/components/lobby/class-board";
import { SurvivalGate } from "@/components/lobby/survival-gate";
import { useAvatarBroadcast } from "@/lib/avatar";
import { adminHost, isAdminAuthed, setAdminVisit } from "@/lib/admin";
import { ensureGamification, fetchLeaderboard, syncBrokenStreak, type LeaderboardPayload } from "@/lib/gamification";
import { pulseLobbyWait, pulsePartner } from "@/lib/pulse";
import { nextOpenLabel } from "@/lib/open-hours";
import { pingSomeoneWaiting } from "@/lib/push-client";
import { duoPath, lobbyPath, studentBoardName, visibleBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";
import { readSurvivalUnlock } from "@/lib/survival-gate";
import { useLobby, writeMatchSeat, type LobbyPeer } from "@/lib/use-lobby";
import { useOpenHours } from "@/lib/use-open-hours";

export function LobbyScreen({ level }: { level: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const hours = useOpenHours();
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);
  const [isArenaUnlocked, setIsArenaUnlocked] = useState(false);
  const lobby = useLobby("beginner", me);
  const doorsOpen = hours.open || hours.forceOpen || isAdminAuthed();
  const goingRef = useRef(false);
  useAvatarBroadcast(setMe);

  useEffect(() => {
    if (level !== "beginner") {
      router.replace(lobbyPath(level === "intermediate" || level === "advanced" ? level : "beginner"));
    }
  }, [level, router]);

  useEffect(() => {
    let live = true;
    restoreStudent()
      .then((student) => {
        if (!live) return;
        if (isAdminAuthed()) {
          setAdminVisit("beginner");
          setMe(adminHost("beginner"));
          setIsArenaUnlocked(true);
          return;
        }
        if (!student?.level) {
          router.replace("/auth");
          return;
        }
        if (student.level !== "beginner") {
          router.replace(lobbyPath(student.level === "intermediate" || student.level === "advanced" ? student.level : "beginner"));
          return;
        }
        setMe(student);
        setIsArenaUnlocked(readSurvivalUnlock(student.id));
        void ensureGamification(student)
          .then(() => syncBrokenStreak(student.id))
          .then((row) => {
            if (!live || !row) return;
            setMe((current) =>
              current?.id === student.id ? { ...current, streak: row.current_streak } : current,
            );
          });
      })
      .catch(() => {
        if (isAdminAuthed()) {
          setAdminVisit("beginner");
          setMe(adminHost("beginner"));
          setIsArenaUnlocked(true);
          return;
        }
        router.replace("/auth");
      });
    return () => {
      live = false;
    };
  }, [router]);

  useEffect(() => {
    if (!me) return;
    let live = true;
    const load = () => {
      fetchLeaderboard(me.id, "beginner")
        .then((payload) => {
          if (live) setBoard(payload);
        })
        .catch(() => undefined);
    };
    load();
    const supabase = getSupabase();
    const channel = supabase
      .channel("efaa-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "efaa_user_gamification" }, load)
      .subscribe();
    return () => {
      live = false;
      void supabase.removeChannel(channel);
    };
  }, [me]);

  useEffect(() => {
    if (!me || !doorsOpen || !lobby.searching) return;
    const room = lobby.room;
    if (!room || room.members.length < 2) return;
    if (goingRef.current) return;
    goingRef.current = true;
    const other = room.members.find((peer) => peer.id !== me.id);
    if (other?.name) pulsePartner(other.name, t.pulse.partner);
    writeMatchSeat(
      room.id,
      room.members.map((peer) => ({
        id: peer.id,
        name: peer.name,
        avatarUrl: peer.photo || (peer.id === me.id ? me.photo : undefined),
      })),
    );
    router.push(duoPath(room.id));
  }, [doorsOpen, lobby.room, lobby.searching, me, router, t.pulse.partner]);

  useEffect(() => {
    if (!me || lobby.peers.length < 2) return;
    const others = lobby.peers.filter((peer) => peer.id !== me.id);
    if (others.length === 1 && !lobby.searching && !lobby.room) pulseLobbyWait(t.pulse.lobby);
  }, [lobby.peers, lobby.room, lobby.searching, me, t.pulse.lobby]);

  useEffect(() => {
    if (!me || !doorsOpen) return;
    const queued = lobby.peers.filter((peer) => peer.queuedAt);
    const alone = lobby.searching && queued.length === 1 && queued[0]?.id === me.id;
    const otherWaiter = queued.find((peer) => peer.id !== me.id);
    if (!alone && !otherWaiter) return;
    const waiterId = alone ? me.id : otherWaiter!.id;
    const waiterName = alone ? studentBoardName(me) : otherWaiter!.name;
    void pingSomeoneWaiting({
      level: "beginner",
      waiterId,
      waiterName,
      count: Math.max(queued.length, 1),
    });
  }, [doorsOpen, lobby.peers, lobby.searching, me]);

  useEffect(() => {
    if (!doorsOpen && lobby.searching) {
      goingRef.current = false;
      lobby.cancelMatching();
    }
  }, [doorsOpen, lobby.cancelMatching, lobby.searching]);

  const waiting = lobby.peers.filter((peer) => peer.id !== me?.id);
  const meRow = board?.me;

  return (
    <div className="lobby-shell">
      <div className="lobby-aurora" aria-hidden />

      <header className="lobby-header">
        <div>
          <p className="lobby-kicker">{t.lobby.kicker}</p>
          <h1 className="lobby-title">{t.lobby.title}</h1>
        </div>
        <div className="lobby-stats">
          <span className="lobby-chip">
            <Users className="h-3.5 w-3.5" />
            {lobby.peers.length}
          </span>
          <span className="lobby-chip lobby-chip-gold">
            <span className="lobby-diamond" aria-hidden>💎</span> {meRow?.diamonds_count || 0}
          </span>
        </div>
      </header>

      <PlayEntry level="beginner" />

      {!doorsOpen ? (
        <div className="live-closed">
          <p className="live-closed-title">{t.live.closedTitle}</p>
          <p className="live-closed-body">{t.live.closed.replace("{time}", nextOpenLabel(hours.rows))}</p>
        </div>
      ) : null}

      <p className="lobby-pool">
        {t.lobby.pool
          .replace("{n}", String(lobby.peers.length))
          .replace("{q}", String(lobby.inMatchCount))}
      </p>

      <div className="lobby-footer">
        {lobby.searching ? (
          <>
            <div className="lobby-radar" aria-hidden>
              <span />
              <span />
              <span />
              <Zap className="h-7 w-7" />
            </div>
            <p className="lobby-searching">{t.lobby.searching}</p>
            <button type="button" className="lobby-cancel" onClick={() => { goingRef.current = false; lobby.cancelMatching(); }}>
              <X className="h-4 w-4" />
              {t.lobby.cancel}
            </button>
          </>
        ) : (
          <SurvivalGate
            userId={me?.id || ""}
            unlocked={isArenaUnlocked}
            matchReady={lobby.ready && doorsOpen}
            onUnlocked={() => setIsArenaUnlocked(true)}
            onEnter={() => {
              if (!doorsOpen) return;
              lobby.startMatching();
            }}
          />
        )}
      </div>

      <ClassBoard
        board={board}
        meId={me?.id}
        onlineIds={lobby.peers.map((peer) => peer.id)}
      />

      <section className="lobby-people">
        {me && <PeerCard peer={selfPeer(me)} you={t.lobby.you} />}
        {waiting.map((peer) => (
          <PeerCard key={peer.id} peer={peer} />
        ))}
      </section>

      {lobby.partner ? (
        <div className="lobby-matched">
          <div className="lobby-matched-card">
            <p className="lobby-matched-label">{t.lobby.matched}</p>
            <StudentPortrait name={lobby.partner.name} photo={lobby.partner.photo} size={72} living userId={lobby.partner.id} />
            <p className="lobby-matched-name">{lobby.partner.name}</p>
            <p className="lobby-matched-go">{t.lobby.connecting}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function selfPeer(me: EfaaStudent): LobbyPeer {
  return {
    id: me.id,
    name: studentBoardName(me),
    nationality: me.nationality,
    streak: me.streak,
    photo: me.photo,
    queuedAt: null,
  };
}

function PeerCard({ peer, you }: { peer: LobbyPeer; you?: string }) {
  const country = peer.nationality ? countryByCode(peer.nationality) : undefined;
  return (
    <article className={`lobby-peer ${peer.queuedAt ? "lobby-peer-queued" : ""}`}>
      <StudentPortrait name={peer.name} photo={peer.photo} size={52} userId={peer.id} />
      <p className="lobby-peer-name">
        {visibleBoardName(peer.name) || "—"}
        {country && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
            alt=""
            className="ms-1 inline h-2.5 w-4 rounded-[2px] object-cover align-middle"
          />
        )}
      </p>
      <p className="lobby-peer-meta">
        {you || (
          <>
            <Flame className="inline h-3 w-3" /> {peer.streak ?? 1}
          </>
        )}
      </p>
    </article>
  );
}
