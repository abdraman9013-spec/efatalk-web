"use client";

const MIC_ATTEMPTS: MediaStreamConstraints[] = [
  { audio: true, video: false },
  { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false },
];

let heldMic: MediaStream | null = null;
let micRequest: Promise<MediaStream | null> | null = null;
const blockedPlayback = new Set<HTMLAudioElement>();

function liveHeldMic() {
  const track = heldMic?.getAudioTracks().find((item) => item.readyState === "live");
  if (!track || !heldMic) return null;
  return heldMic;
}

/** Keep the mic open from the Match tap until the room leaves. A second getUserMedia fails on Android. */
export function captureRoomMic() {
  const existing = liveHeldMic();
  if (existing) return Promise.resolve(existing);
  if (micRequest) return micRequest;
  micRequest = acquireRoomMic().finally(() => {
    micRequest = null;
  });
  return micRequest;
}

async function acquireRoomMic() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return null;
  for (const constraints of MIC_ATTEMPTS) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const track = stream.getAudioTracks().find((item) => item.readyState === "live");
      if (!track) {
        stream.getTracks().forEach((item) => item.stop());
        continue;
      }
      track.enabled = true;
      heldMic = stream;
      return stream;
    } catch {
      /* try the plain prompt next */
    }
  }
  return null;
}

export function releaseRoomMic() {
  heldMic?.getTracks().forEach((track) => track.stop());
  heldMic = null;
}

/** Ask Android Chrome for mic access, then release so Web Speech can take it. */
export async function requestRoomMic() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  if (await isMicGranted()) return true;
  const stream = await captureRoomMic();
  if (!stream) return false;
  await wait(isAndroid() ? 280 : 120);
  releaseRoomMic();
  await wait(isAndroid() ? 180 : 60);
  return true;
}

/**
 * For Speak buttons: never steal the mic if already allowed.
 * Stealing + releasing before SpeechRecognition breaks Android Chrome for days.
 */
export async function unlockMicForSpeech() {
  if (await isMicGranted()) return true;
  return requestRoomMic();
}

export async function isMicGranted() {
  if (typeof navigator === "undefined") return false;
  try {
    const perms = navigator.permissions;
    if (!perms?.query) return false;
    const status = await perms.query({ name: "microphone" as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}

function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function bindRemoteAudio(el: HTMLAudioElement | null, track?: MediaStreamTrack | null) {
  if (!el) return;
  if (!track || track.readyState === "ended") {
    blockedPlayback.delete(el);
    el.srcObject = null;
    return;
  }
  el.muted = false;
  el.volume = 1;
  el.autoplay = true;
  el.setAttribute("playsinline", "true");
  el.setAttribute("webkit-playsinline", "true");
  const current = el.srcObject instanceof MediaStream ? el.srcObject.getAudioTracks()[0] : null;
  if (current !== track) el.srcObject = new MediaStream([track]);
  void el.play().then(
    () => blockedPlayback.delete(el),
    () => blockedPlayback.add(el),
  );
}

export function unlockRoomAudio() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("audio").forEach((node) => {
    const el = node as HTMLAudioElement;
    el.muted = false;
    el.volume = 1;
    el.setAttribute("playsinline", "true");
    el.setAttribute("webkit-playsinline", "true");
    void el.play().then(
      () => blockedPlayback.delete(el),
      () => blockedPlayback.add(el),
    );
  });
  blockedPlayback.forEach((el) => {
    void el.play().then(
      () => blockedPlayback.delete(el),
      () => undefined,
    );
  });
}
