"use client";

import { useEffect, useState } from "react";
import { FlagMark } from "@/components/ui/flag-mark";
import { useI18n } from "@/i18n/provider";
import { SectionDownArrow } from "./section-down-arrow";

function Portrait({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative mx-auto h-[148px] w-[148px]">
      <span
        className="absolute -inset-2 rounded-full opacity-80"
        style={{
          background:
            "conic-gradient(from 210deg, #6d5410, #f6e7a1, #d4af37, #0c1b4d, #f0d78c, #6d5410)",
        }}
        aria-hidden
      />
      <span className="absolute -inset-[3px] rounded-full bg-[#f4efe6]" aria-hidden />
      <span
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow:
            "0 0 0 2px #d4af37, 0 0 0 6px rgba(12,27,77,0.12), 0 18px 40px rgba(12,27,77,0.22)",
        }}
        aria-hidden
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="relative z-10 h-full w-full rounded-full object-cover object-[center_22%]"
      />
    </div>
  );
}

function VoiceCard({
  voice,
}: {
  voice: {
    name: string;
    origin: string;
    flag: string;
    photo: string;
    quote: string;
  };
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-[#d4af37]/35 bg-white/90 px-5 pb-6 pt-7 text-center shadow-[0_18px_48px_rgba(12,27,77,0.10)]">
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0c1b4d]/[0.06] to-transparent"
        aria-hidden
      />
      <Portrait src={voice.photo} alt={voice.name} />
      <p className="mt-5 font-display text-[24px] italic leading-tight text-[#0c1b4d] md:text-[26px]">
        {voice.name}
      </p>
      <p className="mt-2 inline-flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a7418]">
        <FlagMark
          code={voice.flag}
          className="h-4 w-6 rounded-[3px] object-cover shadow-[0_1px_2px_rgba(12,27,77,.25)]"
        />
        {voice.origin}
      </p>
      <p className="mx-auto mt-4 max-w-[36ch] text-[14px] leading-relaxed text-[#1a2a4a]/82">
        <span className="me-1 font-display text-[22px] leading-none text-[#d4af37]">“</span>
        {voice.quote}
        <span className="ms-0.5 font-display text-[22px] leading-none text-[#d4af37]">”</span>
      </p>
    </article>
  );
}

export function Testimonials() {
  const { t } = useI18n();
  const voices = t.landing.testimonials.voices;
  const start = Math.max(
    0,
    voices.findIndex((voice) => voice.flag === "CF"),
  );
  const [index, setIndex] = useState(start);
  const [all, setAll] = useState(false);

  useEffect(() => {
    setIndex(start);
    setAll(false);
  }, [start]);

  useEffect(() => {
    if (all || voices.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % voices.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [all, voices.length]);

  const current = voices[index] || voices[0];

  return (
    <section id="temoignages" className="px-4 pb-2 pt-2" aria-label={t.landing.testimonials.title}>
      <div className="mx-auto w-full max-w-xl md:max-w-5xl">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[#9a7418]">
          {t.landing.testimonials.eyebrow}
        </p>
        <h2 className="mt-2 font-display text-[24px] leading-snug text-[#0c1b4d] md:text-[30px]">
          {t.landing.testimonials.title}
        </h2>

        {all ? (
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {voices.map((voice) => (
              <li key={voice.name}>
                <VoiceCard voice={voice} />
              </li>
            ))}
          </ul>
        ) : current ? (
          <div className="mt-6">
            <VoiceCard voice={current} />
          </div>
        ) : null}

        <button
          type="button"
          className="mt-4 w-full rounded-full border border-[#d4af37]/45 bg-white/80 px-4 py-3 text-[13px] font-bold text-[#0c1b4d]"
          onClick={() => setAll((open) => !open)}
        >
          {all ? t.landing.testimonials.seeLess : t.landing.testimonials.seeMore}
        </button>

        <SectionDownArrow to="official" />
      </div>
    </section>
  );
}
