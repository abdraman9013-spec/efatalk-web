"use client";

import { Users, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { JoinMatchCta } from "@/components/lobby/join-match-cta";
import { PlayEntry } from "@/components/play/play-entry";
import { ClassBoard } from "@/components/lobby/class-board";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import { useI18n } from "@/i18n/provider";
import { adminHost, isAdminAuthed } from "@/lib/admin";
import { restoreStudent } from "@/lib/efaa-db";
import {
  beginnerNextPath,
  ensureGamification,
  fetchLeaderboard,
  syncBrokenStreak,
  type LeaderboardPayload,
} from "@/lib/gamification";
import { pulseLobbyWait, pulsePartner } from "@/lib/pulse";
import { nextOpenLabel } from "@/lib/open-hours";
import { pingSomeoneWaiting } from "@/lib/push-client";
import { livePath, studentBoardName, visibleBoardName, type EfaaStudent } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";
import { useAvatarBroadcast } from "@/lib/avatar";
import { useLiveIndex, type LiveRoomCard } from "@/lib/use-live-index";
import { useLobby, writeMatchSeat } from "@/lib/use-lobby";
import { MESH_MAX } from "@/lib/use-multiplayer-room";
import { useOpenHours } from "@/lib/use-open-hours";

const LEVEL = "advanced" as const;

export function AdvancedLobby() {
  const { t } = useI18n();
  const router = useRouter();
  const hours = useOpenHours();
  const liveRooms = useLiveIndex();
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [god, setGod] = useState(false);
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);
  const doorsOpen = hours.open || hours.forceOpen || god;
  const maxParty = MESH_MAX[LEVEL];
  const lobby = useLobby(LEVEL, me, { autoQueue: false, maxParty });
  const goingRef = useRef(false);
  useAvatarBroadcast(setMe);

  useEffect(() => {
    let live = true;
    restoreStudent()
      .then(async (student) => {
        if (!live) return;
        if (isAdminAuthed()) {
          setGod(true);
          setMe(adminHost(LEVEL));
          return;
        }
        if (!student?.level) {
          router.replace("/auth");
          return;
        }
        if (student.level !== LEVEL) {
          router.replace(await beginnerNextPath(student));
          return;
        }
        setMe(student);
        await ensureGamification(student);
        if (!live) return;
        const synced = await syncBrokenStreak(student.id);
        if (!live || !synced) return;
        setMe((current) =>
          current?.id === student.id ? { ...current, streak: synced.current_streak } : current,
        );
      })
      .catch(() => {
        if (isAdminAuthed()) {
          setGod(true);
          setMe(adminHost(LEVEL));
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
      fetchLeaderboard(me.id, LEVEL)
        .then((payload) => {
          if (live) setBoard(payload);
        })
        .catch(() => undefined);
    };
    load();
    const supabase = getSupabase();
    const channel = supabase
      .channel(`efaa-${LEVEL}-board`)
      .on("postgres_changes", { event: "*", schema: "public", table: "efaa_user_gamification" }, load)
      .subscribe();
    return () => {
      live = false;
      void supabase.removeChannel(channel);
    };
  }, [me]);

  useEffect(() => {
    if (!doorsOpen && lobby.searching) {
      goingRef.current = false;
      lobby.cancelMatching();
    }
  }, [doorsOpen, lobby.cancelMatching, lobby.searching]);

  useEffect(() => {
    if (!me || !doorsOpen || !lobby.searching || !lobby.room) return;
    if (lobby.room.members.length < 2) return;
    if (goingRef.current) return;
    goingRef.current = true;
    writeMatchSeat(
      lobby.room.id,
      lobby.room.members.map((peer) => ({
        id: peer.id,
        name: peer.name,
        avatarUrl: peer.photo || (peer.id === me.id ? me.photo : undefined),
      })),
    );
    const other = lobby.room.members.find((peer) => peer.id !== me.id);
    if (other?.name) pulsePartner(other.name, t.pulse.partner);
    router.push(livePath(LEVEL, lobby.room.id));
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
    void pingSomeoneWaiting({
      level: LEVEL,
      waiterId: alone ? me.id : otherWaiter!.id,
      waiterName: alone ? studentBoardName(me) : otherWaiter!.name,
      count: Math.max(queued.length, 1),
    });
  }, [doorsOpen, lobby.peers, lobby.searching, me]);

  const openRooms = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; count: number; names: string[]; photos: (string | undefined)[] }[] = [];
    const push = (id: string, count: number, names: string[], photos: (string | undefined)[]) => {
      if (seen.has(id) || count >= maxParty) return;
      if (me && lobby.room?.id === id) return;
      seen.add(id);
      list.push({ id, count, names, photos });
    };
    liveRooms
      .filter((room: LiveRoomCard) => room.level === LEVEL)
      .forEach((room) => push(room.roomId, room.count, room.names, room.photos));
    lobby.rooms.forEach((room) =>
      push(
        room.id,
        room.members.length,
        room.members.map((peer) => peer.name),
        room.members.map((peer) => peer.photo),
      ),
    );
    return list;
  }, [liveRooms, lobby.room?.id, lobby.rooms, maxParty, me]);

  const nextOpen = nextOpenLabel(hours.rows);

  function joinRoom(roomId: string) {
    if (!doorsOpen) return;
    router.push(livePath(LEVEL, roomId));
  }

  function matchNow() {
    if (!doorsOpen) return;
    lobby.startMatching();
  }

  return (
    <div className="lobby-shell">
      <div className="lobby-aurora" aria-hidden />
      <header className="lobby-header">
        <div>
          <p className="lobby-kicker">{t.live.advLobbyKicker}</p>
          <h1 className="lobby-title">{t.live.advLobbyTitle}</h1>
        </div>
        <div className="lobby-stats">
          <span className="lobby-chip">
            <Users className="h-3.5 w-3.5" />
            {lobby.peers.length}
          </span>
          <span className="lobby-chip lobby-chip-gold">
            <span className="lobby-diamond" aria-hidden>💎</span> {board?.me?.diamonds_count || 0}
          </span>
        </div>
      </header>

      <PlayEntry level="advanced" />
      <p className="lobby-pool">
        {t.lobby.pool
          .replace("{n}", String(lobby.peers.length))
          .replace("{q}", String(lobby.inMatchCount))}
      </p>

      {!doorsOpen ? (
        <div className="live-closed">
          <p className="live-closed-title">{t.live.closedTitle}</p>
          <p className="live-closed-body">{t.live.closed.replace("{time}", nextOpen)}</p>
        </div>
      ) : null}

      <div className="lobby-footer">
        {lobby.searching ? (
          <>
            <div className="lobby-radar" aria-hidden>
              <span />
              <span />
              <span />
              <Zap className="h-7 w-7" />
            </div>
            <p className="lobby-searching">{t.live.searching}</p>
            <button type="button" className="lobby-cancel" onClick={() => { goingRef.current = false; lobby.cancelMatching(); }}>
              <X className="h-4 w-4" />
              {t.lobby.cancel}
            </button>
          </>
        ) : (
          <JoinMatchCta
            disabled={!lobby.ready || !doorsOpen}
            onJoin={() => void matchNow()}
          />
        )}
      </div>

      <ClassBoard
        board={board}
        meId={me?.id}
        onlineIds={lobby.peers.map((peer) => peer.id)}
      />

      {lobby.peers.length > 0 ? (
        <section className="lobby-people mesh-people">
          {lobby.peers.map((peer) => (
            <article key={peer.id} className={`lobby-peer ${peer.queuedAt ? "lobby-peer-queued" : ""}`}>
              <StudentPortrait name={peer.name} photo={peer.photo} size={52} userId={peer.id} />
              <p className="lobby-peer-name">{visibleBoardName(peer.name) || "—"}</p>
            </article>
          ))}
        </section>
      ) : null}

      {doorsOpen && openRooms.length > 0 ? (
        <section className="live-rooms">
          <p className="lobby-board-title">{t.live.openRooms}</p>
          {openRooms.map((room) => (
            <div key={room.id} className="live-room-row">
              <div>
                <div className="live-room-faces">
                  {room.names.map((name, i) => (
                    <StudentPortrait key={`${room.id}-${name}-${i}`} name={name} photo={room.photos[i]} size={28} userId={`${room.id}-${i}`} />
                  ))}
                </div>
                <p className="live-room-names">{room.names.map((name) => visibleBoardName(name) || "—").join(" · ")}</p>
                <p className="live-room-meta">
                  {room.count}/{maxParty}
                </p>
              </div>
              <button type="button" className="live-join" onClick={() => void joinRoom(room.id)}>
                {t.live.join}
              </button>
            </div>
          ))}
        </section>
      ) : null}

      {lobby.room && lobby.searching && doorsOpen ? (
        <div className="lobby-matched">
          <div className="lobby-matched-card">
            <p className="lobby-matched-label">{t.lobby.matched}</p>
            <div className="lobby-matched-faces">
              {lobby.room.members.map((peer) => (
                <StudentPortrait key={peer.id} name={peer.name} photo={peer.photo} size={56} living userId={peer.id} />
              ))}
            </div>
            <p className="lobby-matched-name">{lobby.room.members.map((peer) => visibleBoardName(peer.name) || "—").join(" · ")}</p>
            <p className="lobby-matched-go">{t.lobby.connecting}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
