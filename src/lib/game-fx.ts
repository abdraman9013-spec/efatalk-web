"use client";

function audioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain = 0.16,
) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

export function playSuccessSound() {
  const ctx = audioContext();
  if (!ctx) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone(ctx, freq, ctx.currentTime + i * 0.06, 0.22, i === 3 ? "square" : "triangle", 0.14);
  });
  window.setTimeout(() => void ctx.close(), 800);
}

export function playErrorSound() {
  const ctx = audioContext();
  if (!ctx) return;
  tone(ctx, 196, ctx.currentTime, 0.18, "sawtooth", 0.12);
  tone(ctx, 146.83, ctx.currentTime + 0.12, 0.28, "sawtooth", 0.1);
  window.setTimeout(() => void ctx.close(), 700);
}

export function playApplause() {
  const ctx = audioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 18; i++) {
    const start = now + Math.random() * 0.55;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.08, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let n = 0; n < data.length; n++) data[n] = (Math.random() * 2 - 1) * (1 - n / data.length);
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    src.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 1800 + Math.random() * 1400;
    amp.gain.value = 0.08 + Math.random() * 0.08;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start(start);
  }
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
    tone(ctx, freq, now + 0.08 + i * 0.05, 0.28, "triangle", 0.1);
  });
  window.setTimeout(() => void ctx.close(), 1400);
}

export function haptic(kind: "tap" | "win" | "lose" | "hold") {
  const nav = navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean };
  if (!nav.vibrate) return;
  if (kind === "tap") nav.vibrate(10);
  if (kind === "hold") nav.vibrate(16);
  if (kind === "win") nav.vibrate([12, 30, 18, 30, 28]);
  if (kind === "lose") nav.vibrate([50, 24, 90]);
}
