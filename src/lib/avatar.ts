"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { saveCurrentStudent, studentBoardName, type EfaaStudent } from "@/lib/session";

export const AVATAR_EVENT = "efaa-avatar-changed";
export const AVATAR_SIZE = 384;

export function portraitInitials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] || ""}${parts[1]![0] || ""}`.toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return "EFA";
}

export function portraitGradient(name?: string | null) {
  const seed = name || "EFA Talk";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return {
    background: `linear-gradient(160deg, hsl(${hue} 46% 32%) 0%, hsl(${(hue + 28) % 360} 52% 14%) 52%, hsl(222 48% 10%) 100%)`,
  };
}

export function broadcastAvatar(student: EfaaStudent) {
  saveCurrentStudent(student);
  window.dispatchEvent(new CustomEvent<EfaaStudent>(AVATAR_EVENT, { detail: student }));
}

export function useAvatarBroadcast<T extends { id: string; photo?: string }>(
  setMe: Dispatch<SetStateAction<T | null>>,
) {
  useEffect(() => {
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<EfaaStudent>).detail;
      if (!next?.id) return;
      setMe((prev) => (prev && prev.id === next.id ? { ...prev, photo: next.photo } : prev));
    };
    window.addEventListener(AVATAR_EVENT, onChange);
    return () => window.removeEventListener(AVATAR_EVENT, onChange);
  }, [setMe]);
}

export async function uploadStudentPortrait(student: EfaaStudent, blob: Blob) {
  const form = new FormData();
  form.append("file", blob, blob.type.includes("jpeg") ? "avatar.jpg" : "avatar.webp");
  form.append("studentId", student.id);
  form.append("email", student.email);
  form.append("kind", student.kind === "official" ? "official" : "practice");
  const response = await fetch("/api/avatar", { method: "POST", body: form });
  const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!response.ok || !payload.url) throw new Error(payload.error || "avatar-failed");
  const next: EfaaStudent = { ...student, photo: payload.url };
  broadcastAvatar(next);
  return next;
}

type Source = HTMLImageElement | HTMLVideoElement | ImageBitmap;

export async function cropToPortrait(
  source: Source,
  frame: { x: number; y: number; size: number },
  output = AVATAR_SIZE,
) {
  const canvas = document.createElement("canvas");
  canvas.width = output;
  canvas.height = output;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, frame.x, frame.y, frame.size, frame.size, 0, 0, output, output);
  const webp = await canvasToBlob(canvas, "image/webp", 0.82);
  if (webp && webp.size > 400) return webp;
  const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.8);
  if (!jpeg) throw new Error("encode-failed");
  return jpeg;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function bitmapFromFile(file: File) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-failed"));
    image.src = src;
  });
}

export function coverCrop(
  width: number,
  height: number,
  view: number,
  scale: number,
  panX: number,
  panY: number,
) {
  const cover = Math.max(view / Math.max(width, 1), view / Math.max(height, 1)) * Math.max(scale, 1);
  const drawnW = width * cover;
  const drawnH = height * cover;
  const maxX = Math.max(0, (drawnW - view) / 2);
  const maxY = Math.max(0, (drawnH - view) / 2);
  const x = Math.max(-maxX, Math.min(maxX, panX));
  const y = Math.max(-maxY, Math.min(maxY, panY));
  const dx = (view - drawnW) / 2 + x;
  const dy = (view - drawnH) / 2 + y;
  return {
    x: -dx / cover,
    y: -dy / cover,
    size: view / cover,
    panX: x,
    panY: y,
    cover,
  };
}

export function studentFaceName(student: { firstName?: string | null; lastName?: string | null }) {
  return studentBoardName(student);
}

/** Data URLs (and other huge strings) must never go on presence or match payloads. */
export function slimAvatarUrl(photo?: string | null) {
  if (!photo || photo.startsWith("data:")) return undefined;
  return photo;
}
