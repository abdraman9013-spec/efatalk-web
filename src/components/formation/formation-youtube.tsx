"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";

const SITE_ORIGIN = "https://www.efatalk.fyi";

function videoIdFromEmbed(src: string) {
  const m = src.match(/(?:embed\/|shorts\/|v=)([a-zA-Z0-9_-]{6,})/);
  return m?.[1] || "";
}

function embedUrl(id: string, autoplay: boolean) {
  const url = new URL(`https://www.youtube.com/embed/${id}`);
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("origin", SITE_ORIGIN);
  if (autoplay) url.searchParams.set("autoplay", "1");
  return url.toString();
}

function watchUrl(id: string) {
  return `https://www.youtube.com/shorts/${id}`;
}

export function FormationYoutube({
  src,
  title,
  soon,
  playLabel,
  openLabel,
}: {
  src: string;
  title: string;
  soon: string;
  playLabel: string;
  openLabel: string;
}) {
  const [playing, setPlaying] = useState(false);
  const id = videoIdFromEmbed(src);
  const iframeSrc = useMemo(() => (id ? embedUrl(id, playing) : ""), [id, playing]);
  const external = id ? watchUrl(id) : "";

  if (!src || !id) {
    return (
      <div className="formation-glass flex aspect-[9/16] max-h-[420px] w-full items-center justify-center rounded-2xl text-sm text-[#0c4a6e]/70">
        {soon}
      </div>
    );
  }

  const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className="overflow-hidden rounded-2xl border border-white/50 shadow-[0_18px_50px_rgba(12,80,120,0.18)] ring-1 ring-[#d4af37]/25"
    >
      <div className="relative aspect-[9/16] max-h-[min(72dvh,520px)] w-full bg-black/10">
        {!playing ? (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0c4a6e]/15 p-4 text-center"
            aria-label={title}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90"
              loading="eager"
            />
            <span className="relative z-10 rounded-full bg-[#0c4a6e]/90 px-5 py-2 text-sm font-bold text-[#f0d78c] shadow-lg">
              ▶ {playLabel}
            </span>
          </button>
        ) : (
          <iframe
            src={iframeSrc}
            title={title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      {external ? (
        <a
          href={external}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-t border-white/40 bg-white/70 py-2 text-center text-[11px] font-semibold text-[#0c4a6e]"
        >
          {openLabel}
        </a>
      ) : null}
    </motion.div>
  );
}
