function audioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export function playJackpot() {
  const ctx = audioContext();
  if (!ctx) return;
  const notes = [392, 523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, index) => {
    const start = ctx.currentTime + index * 0.055;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = index > 3 ? "square" : "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.3);
  });
  window.setTimeout(() => void ctx.close(), 1100);
}

export function playCoin() {
  const ctx = audioContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.22);
  window.setTimeout(() => void ctx.close(), 400);
}
