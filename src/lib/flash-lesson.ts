export function speakEnglish(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.pitch = 1;
  const voice = synth
    .getVoices()
    .find((item) => item.lang.startsWith("en") && /female|samantha|zira|google/i.test(item.name));
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
  return true;
}

function audioContext() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export function playLevelUp() {
  const ctx = audioContext();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((freq, index) => {
    const start = ctx.currentTime + index * 0.07;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = index === notes.length - 1 ? "square" : "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.34);
  });
  window.setTimeout(() => void ctx.close(), 900);
}

export function playFail() {
  const ctx = audioContext();
  if (!ctx) return;
  const notes = [392, 311.13];
  notes.forEach((freq, index) => {
    const start = ctx.currentTime + index * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.24);
  });
  window.setTimeout(() => void ctx.close(), 700);
}

export function buzz(pattern: number | number[]) {
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  nav.vibrate?.(pattern);
}

export const STARS_PER_CARD = 10;
export { playLevelUp as playTada };
