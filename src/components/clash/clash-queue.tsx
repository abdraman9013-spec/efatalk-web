"use client";

import { useEffect, useMemo, useState } from "react";
import { EnergyModal } from "@/components/play/energy-modal";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import { useI18n } from "@/i18n/provider";
import { adminHost, isAdminAuthed, readAdminVisit } from "@/lib/admin";
import { CLASH_WAGER, type ClashPeer } from "@/lib/clash";
import {
  actClashSign,
  leaveClashLobby,
  pulseClashLobby,
  sendClashSign,
  type ClashSign,
} from "@/lib/clash-sign";
import { countryByCode } from "@/lib/countries";
import {
  claimEnergyRefill,
  ensureGameState,
  handleWhatsAppInvite,
  localGameState,
  type GameState,
} from "@/lib/game-mode";
import { readCurrentStudent, studentBoardName } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";
import { WORLD_CUP_ROOM } from "@/lib/use-clash";
import { ClashRecordsPanel } from "@/components/clash/clash-records-panel";

export function ClashQueue() {
  const { t } = useI18n();
  const [energy, setEnergy] = useState<GameState | null>(null);
  const [me, setMe] = useState<ClashPeer | null>(null);
  const [online, setOnline] = useState<ClashPeer[]>([]);
  const [inbox, setInbox] = useState<ClashSign[]>([]);
  const [busy, setBusy] = useState(false);
  const [sentId, setSentId] = useState("");
  const empty = energy ? energy.lightning_bolts < CLASH_WAGER : false;

  useEffect(() => {
    const student = isAdminAuthed()
      ? adminHost(readAdminVisit() || readCurrentStudent()?.level || "beginner")
      : readCurrentStudent();
    if (!student?.level) {
      window.location.replace("/auth");
      return;
    }
    const peer: ClashPeer = {
      id: student.id,
      name: studentBoardName(student),
      photo: student.photo,
      nationality: student.nationality,
    };
    setMe(peer);
    setEnergy(localGameState(student.id, student.nationality));
    void ensureGameState(student.id, student.nationality).then(setEnergy);
  }, []);

  useEffect(() => {
    if (!me?.id) return;
    let gone = false;
    async function tick() {
      try {
        const snap = await pulseClashLobby(me!);
        if (gone) return;
        setOnline(snap.online);
        setInbox(snap.inbox);
        const accepted = snap.inbox.find((row) => row.status === "accepted" && row.room_id);
        if (accepted?.room_id) {
          gone = true;
          window.location.assign(`/clash/${accepted.room_id}`);
        }
      } catch {
        /* next pulse */
      }
    }
    void tick();
    const pulse = window.setInterval(() => void tick(), 1400);
    const supabase = getSupabase();
    const watch = supabase
      .channel("efaa-clash-sign-lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "efaa_clash_signs" }, () => {
        void tick();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "efaa_clash_lobby" }, () => {
        void tick();
      })
      .subscribe();
    const onLeave = () => {
      void leaveClashLobby(me.id);
    };
    window.addEventListener("pagehide", onLeave);
    return () => {
      gone = true;
      window.clearInterval(pulse);
      window.removeEventListener("pagehide", onLeave);
      void supabase.removeChannel(watch);
      void leaveClashLobby(me.id);
    };
  }, [me?.id]);

  const incoming = inbox.filter((row) => row.status === "pending" && row.to_user === me?.id);
  const country = useMemo(
    () => (energy ? countryByCode(energy.country_code)?.name || energy.country_code : ""),
    [energy],
  );

  if (!energy || !me) return <div className="min-h-dvh bg-[#07060a]" />;

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#07060a] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.22),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(59,130,246,0.22),transparent_42%)]" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        <p className="text-center text-[11px] uppercase tracking-[0.32em] text-red-300">{t.clash.kicker}</p>
        <h1 className="mt-2 text-center font-display text-4xl text-[#f6e7a1]">{t.clash.title}</h1>
        <p className="mt-3 text-center text-sm text-white/60">{t.clash.signHint}</p>
        <p className="mt-4 text-center text-lg text-amber-300">⚡ {energy.lightning_bolts}</p>

        {incoming.map((row) => (
          <article key={row.id} className="mt-5 rounded-3xl border border-[#f0d78c]/40 bg-[#f0d78c]/10 p-4">
            <p className="text-sm font-bold text-[#f6e7a1]">{t.clash.signAsk.replace("{name}", row.from_name)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="min-h-12 rounded-2xl bg-emerald-500 px-3 text-sm font-black text-white"
                onClick={() => {
                  void actClashSign(row.id, me.id, true).then((next) => {
                    if (next.room_id) window.location.assign(`/clash/${next.room_id}`);
                  });
                }}
              >
                {t.clash.accept}
              </button>
              <button
                type="button"
                className="min-h-12 rounded-2xl border border-white/20 px-3 text-sm font-black"
                onClick={() => void actClashSign(row.id, me.id, false)}
              >
                {t.clash.decline}
              </button>
            </div>
          </article>
        ))}

        <section className="mt-6 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/45">{t.clash.onlineNow}</p>
          <div className="mt-3 space-y-2">
            {online.map((peer) => (
              <article
                key={peer.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <StudentPortrait name={peer.name} photo={peer.photo} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{peer.name}</p>
                  <p className="text-[11px] text-emerald-300">{t.clash.liveNow}</p>
                </div>
                <button
                  type="button"
                  disabled={sentId === peer.id}
                  className="min-h-11 rounded-full bg-gradient-to-r from-red-500 to-blue-500 px-4 text-xs font-black disabled:opacity-50"
                  onClick={() => {
                    setSentId(peer.id);
                    void sendClashSign(me, peer).catch(() => setSentId(""));
                  }}
                >
                  {sentId === peer.id ? t.clash.sent : t.clash.sign}
                </button>
              </article>
            ))}
            {!online.length ? (
              <p className="rounded-2xl bg-white/5 px-4 py-8 text-center text-sm text-white/50">{t.clash.noneOnline}</p>
            ) : null}
          </div>
        </section>

        <div className="mt-6">
          <ClashRecordsPanel userId={me.id} meName={me.name} />
        </div>

        <a
          href={`/clash/${WORLD_CUP_ROOM}`}
          className="mt-6 text-center text-[12px] uppercase tracking-[0.22em] text-white/35"
        >
          {t.clash.find}
        </a>
        <a href="/play" className="mt-3 text-center text-[12px] uppercase tracking-[0.22em] text-white/35">
          {t.play.back}
        </a>
      </div>
      {empty ? (
        <EnergyModal
          busy={busy}
          userId={energy.user_id}
          refillAt={energy.energy_refill_at}
          onInvite={() => {
            setBusy(true);
            void handleWhatsAppInvite(energy, country).then((row) => {
              setEnergy(row);
              setBusy(false);
            });
          }}
          onWaitComplete={() => {
            void claimEnergyRefill(energy.user_id).then(setEnergy);
          }}
        />
      ) : null}
    </div>
  );
}
