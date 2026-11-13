"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { countryByCode } from "@/lib/countries";
import { bindRemoteAudio } from "@/lib/room-mic";
import type { LiveTile } from "@/lib/use-daily-salon";
import { useI18n } from "@/i18n/provider";
import { StudentPortrait } from "@/components/avatar/student-portrait";

function useSpeaking(track: MediaStreamTrack | undefined, enabled: boolean) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!track || track.kind !== "audio" || !enabled) {
      setSpeaking(false);
      return;
    }
    let ctx: AudioContext;
    try {
      ctx = new AudioContext();
    } catch {
      return;
    }
    const source = ctx.createMediaStreamSource(new MediaStream([track]));
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const loop = () => {
      analyser.getByteFrequencyData(data);
      let sum = 0;
      for (const value of data) sum += value;
      setSpeaking(sum / data.length > 14);
      raf = requestAnimationFrame(loop);
    };
    void ctx.resume();
    loop();
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [track, enabled]);

  return speaking;
}

export function DailyTile({
  tile,
  sessionsLabel,
}: {
  tile: LiveTile;
  sessionsLabel: string;
}) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const detected = useSpeaking(tile.audioTrack, tile.audioOn);
  const speaking = tile.speaking || detected;
  const country = tile.nationality ? countryByCode(tile.nationality) : undefined;
  const hasVideo = Boolean(tile.videoTrack);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (tile.videoTrack) {
      el.srcObject = new MediaStream([tile.videoTrack]);
      void el.play();
    } else {
      el.srcObject = null;
    }
  }, [tile.videoTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || tile.local) return;
    if (tile.audioTrack) bindRemoteAudio(el, tile.audioTrack);
    else bindRemoteAudio(el, null);
  }, [tile.audioTrack, tile.local]);

  return (
    <figure
      className={`live-tile ${speaking && tile.audioOn ? "speaking-ring" : ""}`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={tile.local}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {!hasVideo && (
        <div className={`live-avatar-wrap ${speaking && tile.audioOn ? "live-avatar-speak" : ""}`}>
          <StudentPortrait name={tile.name} photo={tile.photo} size={88} living={speaking && tile.audioOn} userId={tile.userId || tile.sessionId} />
        </div>
      )}
      <div className="live-mic">
        {tile.audioOn ? (
          <Mic className={`h-3.5 w-3.5 ${speaking ? "text-[#f3e6c8]" : "text-[#e8d5b0]/80"}`} />
        ) : (
          <MicOff className="h-3.5 w-3.5 text-[#e8d5b0]/70" />
        )}
      </div>
      <figcaption className="live-caption">
        <p className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-display text-[13px] text-white">{tile.name}</span>
          {country && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://flagcdn.com/w40/${country.code.toLowerCase()}.png`}
              alt={country.name}
              className="h-3 w-[18px] rounded-[2px] object-cover"
            />
          )}
        </p>
        <p className="text-[10px] text-white/80">
          {tile.streak ?? 1} {sessionsLabel}
          {tile.streak && tile.streak >= 3 ? ` · ${t.room.streakBadge}` : ""}
        </p>
      </figcaption>
      {!tile.local && <audio ref={audioRef} autoPlay playsInline />}
    </figure>
  );
}
