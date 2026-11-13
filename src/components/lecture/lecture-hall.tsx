"use client";

import { MonitorUp, MonitorOff, Mic, MicOff, PhoneOff, Send, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useI18n } from "@/i18n/provider";
import { adminHost, isAdminAuthed } from "@/lib/admin";
import { isOfficialStudent, lectureBand, lecturePath, readCurrentStudent, type EfaaStudent } from "@/lib/session";
import { useLectureRoom } from "@/lib/use-lecture-room";
import { useLiveChat } from "@/lib/use-live-chat";
import { useLectureReactions } from "@/lib/use-lecture-reactions";

function RemoteAudio({ id, track }: { id: string; track: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = new MediaStream([track]);
        el.setAttribute("playsinline", "true");
        el.setAttribute("webkit-playsinline", "true");
        el.muted = false;
        el.volume = 1;
        void el.play().catch(() => undefined);
    return () => {
      el.srcObject = null;
    };
  }, [track]);
  return <audio ref={ref} autoPlay playsInline className="hidden" data-listen={id} />;
}

export function LectureHall({ band }: { band: "0" | "1" }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const wantMod = params.get("mode") === "mod";
  const [me, setMe] = useState<EfaaStudent | null>(null);
  const [teacher, setTeacher] = useState(false);
  const [rollOpen, setRollOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const roomKey = `lecture-${band}`;
  const call = useLectureRoom(roomKey, me, Boolean(me), teacher);
  const chat = useLiveChat(roomKey, me);
  const react = useLectureReactions(roomKey, me?.id);
  const leaveTo = teacher ? "/admin-dashboard" : "/vip-dashboard";

  useEffect(() => {
    if (isAdminAuthed() || wantMod) {
      if (!isAdminAuthed() && wantMod) {
        router.replace("/admin-dashboard");
        return;
      }
      setTeacher(true);
      setMe(adminHost(band === "1" ? "intermediate" : "beginner"));
      return;
    }
    const local = readCurrentStudent();
    if (!local || !isOfficialStudent(local)) {
      router.replace("/");
      return;
    }
    if (lectureBand(local.level) !== band) {
      router.replace(lecturePath(local.level));
      return;
    }
    setTeacher(false);
    setMe(local);
  }, [band, router, wantMod]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (call.screenTrack) {
      el.srcObject = new MediaStream([call.screenTrack]);
      void el.play().catch(() => undefined);
    } else {
      el.srcObject = null;
    }
  }, [call.screenTrack]);

  useEffect(() => {
    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      void ctx.resume();
    } catch {
      /* autoplay unlock later */
    }
    const unlock = () => {
      void ctx?.resume();
      document.querySelectorAll("audio").forEach((node) => {
        void (node as HTMLAudioElement).play().catch(() => undefined);
      });
    };
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      void ctx?.close();
    };
  }, []);

  if (!me) {
    return <div className="min-h-dvh bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900" />;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-950 via-sky-950 to-slate-900 text-white">
      {call.listenTracks.map((item) => (
        <RemoteAudio key={item.id} id={item.id} track={item.track} />
      ))}
      <div className="live-float-layer" aria-hidden>
        {react.floats.map((item) => (
          <span key={item.id} className="live-float" style={{ left: `${item.left}%` }}>
            {item.emoji}
          </span>
        ))}
      </div>

      <header className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-sky-300">English For All Academy</p>
          <p className="font-display text-lg text-white">Level {band}</p>
        </div>
        <button
          type="button"
          onClick={() => setRollOpen(true)}
          className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-sky-100"
          aria-label={t.official.presence}
        >
          {call.micLive ? "Mic ●" : teacher ? t.official.shareScreen : t.official.listenOnly}
          {` · ${call.presentPeers.length}`}
        </button>
      </header>

      {rollOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/45 px-4 pb-8 md:place-items-center">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="OK"
            onClick={() => setRollOpen(false)}
          />
          <div className="relative max-h-[70dvh] w-full max-w-md overflow-y-auto rounded-[1.6rem] border border-white/15 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-200">
                {t.official.presence} · {call.presentPeers.length}
              </p>
              <button
                type="button"
                onClick={() => setRollOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10"
                aria-label="OK"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {call.presentPeers.length ? (
              <ul className="space-y-2">
                {call.presentPeers.map((peer) => {
                  const muted = call.mutedIds.includes(peer.id);
                  return (
                    <li
                      key={peer.id}
                      className="flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold">{peer.name}</span>
                      {teacher ? (
                        <button
                          type="button"
                          onClick={() => (muted ? call.unmuteOne(peer.id) : call.muteOne(peer.id))}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                            muted ? "bg-rose-500/80 text-white" : "bg-emerald-400/20 text-emerald-100"
                          }`}
                        >
                          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                          {muted ? t.room.mute : t.room.micActive}
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-6 text-center text-[13px] text-sky-200/70">{t.official.presenceEmpty}</p>
            )}
          </div>
        </div>
      ) : null}

      <div className="relative mx-4 min-h-0 flex-1 overflow-hidden rounded-[1.6rem] bg-black/40 md:mx-6">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`absolute inset-0 h-full w-full object-contain ${call.screenTrack ? "" : "hidden"}`}
        />
        {!call.screenTrack ? (
          <div className="grid h-full min-h-[42vh] place-items-center px-6 text-center">
            <p className="max-w-sm text-[15px] font-medium text-sky-100/90">{t.official.waitingTeacher}</p>
          </div>
        ) : null}
      </div>

      {teacher ? (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-4">
          <button
            type="button"
            onClick={() => void (call.sharing ? call.stopShare() : call.startShare())}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-400 to-amber-400 px-4 py-2.5 text-[12px] font-black uppercase tracking-wide text-slate-950"
          >
            {call.sharing ? <MonitorOff className="h-4 w-4" /> : <MonitorUp className="h-4 w-4" />}
            {call.sharing ? t.official.stopShare : t.official.shareScreen}
          </button>
          <button
            type="button"
            onClick={call.muteAll}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[12px] font-bold text-white"
          >
            <MicOff className="h-4 w-4" />
            {t.official.muteAll}
          </button>
          <button
            type="button"
            onClick={call.unmuteAll}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[12px] font-bold text-white"
          >
            <Mic className="h-4 w-4" />
            {t.official.unmuteAll}
          </button>
          <button
            type="button"
            onClick={() => router.push(leaveTo)}
            className="inline-flex items-center gap-2 rounded-full bg-rose-500/80 px-4 py-2.5 text-[12px] font-bold text-white"
          >
            <PhoneOff className="h-4 w-4" />
            {t.admin.home}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex justify-center px-4">
          <button
            type="button"
            onClick={() => router.push(leaveTo)}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-[12px] font-bold text-white"
          >
            <PhoneOff className="h-4 w-4" />
            {t.duo.leave}
          </button>
        </div>
      )}

      <div className="mt-3 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
        <div ref={chat.boxRef} className="mb-2 max-h-28 overflow-y-auto rounded-2xl bg-white/10 px-3 py-2 text-[13px]">
          {chat.messages.map((msg) => (
            <p key={msg.id} className="text-sky-50">
              <strong className="text-amber-200">{msg.name}</strong> {msg.text}
            </p>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            chat.send();
          }}
        >
          <input
            value={chat.draft}
            onChange={(event) => chat.setDraft(event.target.value)}
            placeholder={t.room.chatPlaceholder}
            className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[14px] text-white outline-none placeholder:text-sky-200/50"
          />
          <button
            type="submit"
            className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-r from-sky-400 to-amber-400 text-slate-950"
            aria-label={t.room.send}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-2 flex justify-center gap-2">
          {react.emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg"
              onClick={() => react.send(emoji)}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
