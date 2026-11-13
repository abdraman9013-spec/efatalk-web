export function canCaptureMic() {
  return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function downsample(input: Float32Array, fromRate: number, toRate: number) {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const length = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let n = 0;
    for (let j = start; j < end; j += 1) {
      sum += input[j];
      n += 1;
    }
    out[i] = n ? sum / n : input[Math.min(start, input.length - 1)] || 0;
  }
  return out;
}

export function encodeWav(samples: Float32Array, sampleRate: number) {
  const pcm = downsample(samples, sampleRate, 16000);
  const bytes = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + bytes);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + bytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 16000 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, bytes, true);
  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function merge(chunks: Float32Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    out.set(chunk, offset);
    offset += chunk.length;
  });
  return out;
}

export type PcmClip = { samples: Float32Array; sampleRate: number; peak: number; denied: boolean };

export async function capturePcm(
  ms = 10000,
  options?: {
    signal?: AbortSignal;
    onProgress?: (clip: { samples: Float32Array; sampleRate: number; peak: number }) => void;
  },
): Promise<PcmClip> {
  if (!canCaptureMic()) return { samples: new Float32Array(), sampleRate: 16000, peak: 0, denied: false };
  if (options?.signal?.aborted) return { samples: new Float32Array(), sampleRate: 16000, peak: 0, denied: false };

  let stream: MediaStream;
  try {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: false,
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
  } catch {
    return { samples: new Float32Array(), sampleRate: 16000, peak: 0, denied: true };
  }

  const AudioCtx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    stream.getTracks().forEach((track) => track.stop());
    return { samples: new Float32Array(), sampleRate: 16000, peak: 0, denied: false };
  }

  const ctx = new AudioCtx();
  await ctx.resume().catch(() => undefined);
  const sampleRate = ctx.sampleRate || 44100;
  const source = ctx.createMediaStreamSource(stream);
  const processor = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  const chunks: Float32Array[] = [];
  let peak = 0;
  let lastProgress = 0;
  processor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const copy = new Float32Array(input.length);
    copy.set(input);
    chunks.push(copy);
    for (let i = 0; i < input.length; i += 1) {
      const value = Math.abs(input[i]);
      if (value > peak) peak = value;
    }
    const now = Date.now();
    if (options?.onProgress && now - lastProgress >= 900) {
      lastProgress = now;
      options.onProgress({ samples: merge(chunks), sampleRate, peak });
    }
  };
  source.connect(processor);
  processor.connect(mute);
  mute.connect(ctx.destination);

  await new Promise<void>((resolve) => {
    let closed = false;
    const done = () => {
      if (closed) return;
      closed = true;
      window.clearTimeout(timer);
      window.removeEventListener("pagehide", done);
      options?.signal?.removeEventListener("abort", done);
      resolve();
    };
    const timer = window.setTimeout(done, ms);
    window.addEventListener("pagehide", done, { once: true });
    options?.signal?.addEventListener("abort", done);
    if (options?.signal?.aborted) done();
  });

  processor.disconnect();
  source.disconnect();
  mute.disconnect();
  stream.getTracks().forEach((track) => track.stop());
  await ctx.close().catch(() => undefined);

  return { samples: merge(chunks), sampleRate, peak, denied: false };
}
