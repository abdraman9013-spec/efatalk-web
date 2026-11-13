"use client";

import { useEffect, useState } from "react";

export function SpeechWave({ track, active }: { track?: MediaStreamTrack; active?: boolean }) {
  const [bars, setBars] = useState([6, 14, 9, 18, 8, 12, 7]);

  useEffect(() => {
    let raf = 0;
    let ctx: AudioContext | null = null;
    let live = true;

    const pulse = (strength: number) => {
      setBars((prev) => prev.map((value, i) => {
        const wobble = 4 + ((i * 17) % 11) * strength;
        return Math.max(4, Math.min(28, value * 0.55 + wobble));
      }));
    };

    if (track && track.readyState === "live") {
      try {
        ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(new MediaStream([track]));
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          if (!live) return;
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (const value of data) sum += value;
          pulse(sum / data.length / 40);
          raf = requestAnimationFrame(loop);
        };
        void ctx.resume();
        loop();
      } catch {
        /* visual fallback below */
      }
    }

    const fake = window.setInterval(() => {
      if (track && track.readyState === "live") return;
      pulse(active ? 0.85 : 0.18);
    }, 90);

    return () => {
      live = false;
      cancelAnimationFrame(raf);
      window.clearInterval(fake);
      void ctx?.close();
    };
  }, [track, active]);

  return (
    <span className={`mid-wave ${active ? "mid-wave-on" : ""}`} aria-hidden>
      {bars.map((height, i) => (
        <i key={i} style={{ height }} />
      ))}
    </span>
  );
}
