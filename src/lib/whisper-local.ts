import { downsample } from "@/lib/speech-pcm";

type Transcriber = (audio: Float32Array, options?: Record<string, string>) => Promise<{ text?: string } | { text?: string }[]>;

let transcriber: Transcriber | null = null;

export async function transcribeLocal(samples: Float32Array, sampleRate: number) {
  if (!samples.length) return "";
  try {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    if (!transcriber) {
      transcriber = (await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en", {
        dtype: "q8",
      })) as unknown as Transcriber;
    }
    const audio = downsample(samples, sampleRate, 16000);
    const result = await transcriber(audio, { language: "english", task: "transcribe" });
    const row = Array.isArray(result) ? result[0] : result;
    return String(row?.text || "").trim();
  } catch {
    return "";
  }
}
