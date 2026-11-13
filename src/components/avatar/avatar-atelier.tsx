"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Images, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { StudentPortrait } from "@/components/avatar/student-portrait";
import { useI18n } from "@/i18n/provider";
import {
  bitmapFromFile,
  coverCrop,
  cropToPortrait,
  loadImage,
  studentFaceName,
  uploadStudentPortrait,
} from "@/lib/avatar";
import { haptic, playSuccessSound } from "@/lib/game-fx";
import { studentBoardName, type EfaaStudent } from "@/lib/session";

type Stage = "idle" | "camera" | "crop" | "seal";

const VIEW = 280;

export function AvatarAtelier({
  open,
  student,
  onClose,
  onSaved,
}: {
  open: boolean;
  student: EfaaStudent;
  onClose: () => void;
  onSaved: (student: EfaaStudent) => void;
}) {
  const { t } = useI18n();
  const copy = t.atelier;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(student.photo || "");
  const [cropSrc, setCropSrc] = useState("");
  const [natural, setNatural] = useState({ w: 1, h: 1 });
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [flash, setFlash] = useState(false);

  const boardName = studentBoardName(student);
  const face = preview || student.photo;
  const cropFrame = coverCrop(natural.w, natural.h, VIEW, scale, pan.x, pan.y);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const reset = useCallback(() => {
    stopCamera();
    setStage("idle");
    setBusy(false);
    setError("");
    setCropSrc("");
    setScale(1);
    setPan({ x: 0, y: 0 });
    setFlash(false);
    setPreview(student.photo || "");
  }, [stopCamera, student.photo]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    setPreview(student.photo || "");
  }, [open, reset, student.photo]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  useEffect(() => {
    if (stage !== "camera") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [stage]);

  async function openCamera() {
    setError("");
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setStage("camera");
    } catch {
      setError(copy.cameraDenied);
    }
  }

  async function captureFrame() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const side = Math.min(video.videoWidth || 720, video.videoHeight || 720);
    const blob = await cropToPortrait(video, {
      x: ((video.videoWidth || side) - side) / 2,
      y: ((video.videoHeight || side) - side) / 2,
      size: side,
    });
    const url = URL.createObjectURL(blob);
    await prepareCrop(url);
    stopCamera();
  }

  async function onGallery(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setError("");
    try {
      const bitmap = await bitmapFromFile(file);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(bitmap, 0, 0);
      const url = canvas.toDataURL("image/jpeg", 0.92);
      await prepareCrop(url);
    } catch {
      setError(copy.failed);
    }
  }

  async function prepareCrop(src: string) {
    const image = await loadImage(src);
    setCropSrc(src);
    setNatural({ w: image.naturalWidth || image.width, h: image.naturalHeight || image.height });
    setScale(1);
    setPan({ x: 0, y: 0 });
    setStage("crop");
  }

  async function sealPortrait() {
    if (!cropSrc || busy) return;
    setBusy(true);
    setError("");
    try {
      const image = await loadImage(cropSrc);
      const blob = await cropToPortrait(image, {
        x: cropFrame.x,
        y: cropFrame.y,
        size: cropFrame.size,
      });
      haptic("win");
      setFlash(true);
      setStage("seal");
      playSuccessSound();
      const next = await uploadStudentPortrait(student, blob);
      setPreview(next.photo || "");
      onSaved(next);
      window.setTimeout(() => {
        setFlash(false);
        onClose();
      }, 1100);
    } catch {
      setStage("crop");
      setFlash(false);
      setError(copy.failed);
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="atelier-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div className="atelier-aurora" aria-hidden />
          <div className="atelier-dust" aria-hidden />
          {flash ? <div className="atelier-flash" /> : null}

          <header className="atelier-bar">
            <div>
              <p className="atelier-kicker">{copy.kicker}</p>
              <h1 className="atelier-title">{copy.title}</h1>
            </div>
            <button type="button" className="atelier-close" onClick={onClose} aria-label={copy.close}>
              <X className="h-5 w-5" />
            </button>
          </header>

          <p className="atelier-sub">{copy.subtitle}</p>

          <div className="atelier-stage">
            {stage === "camera" ? (
              <div className="atelier-orb atelier-orb-giant">
                <span className="efa-portrait-ring" aria-hidden />
                <span className="efa-portrait-sweep" aria-hidden />
                <video ref={videoRef} className="atelier-video" autoPlay playsInline muted />
              </div>
            ) : stage === "crop" && cropSrc ? (
              <div
                className="atelier-orb atelier-orb-giant atelier-crop"
                onPointerDown={(event) => {
                  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
                  drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
                }}
                onPointerMove={(event) => {
                  if (!drag.current) return;
                  const next = coverCrop(
                    natural.w,
                    natural.h,
                    VIEW,
                    scale,
                    drag.current.panX + (event.clientX - drag.current.x),
                    drag.current.panY + (event.clientY - drag.current.y),
                  );
                  setPan({ x: next.panX, y: next.panY });
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
              >
                <span className="efa-portrait-ring" aria-hidden />
                <span className="efa-portrait-sweep" aria-hidden />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cropSrc}
                  alt=""
                  className="atelier-crop-img"
                  draggable={false}
                  style={{
                    width: natural.w * cropFrame.cover,
                    height: natural.h * cropFrame.cover,
                    transform: `translate(${(VIEW - natural.w * cropFrame.cover) / 2 + cropFrame.panX}px, ${(VIEW - natural.h * cropFrame.cover) / 2 + cropFrame.panY}px)`,
                  }}
                />
              </div>
            ) : (
              <motion.div layoutId="efa-living-orb" className="atelier-orb-wrap">
                <StudentPortrait name={boardName} photo={face} size={VIEW} living className="atelier-face" />
                {stage === "seal" ? <p className="atelier-sealed">{copy.sealed}</p> : null}
              </motion.div>
            )}
          </div>

          {stage === "crop" ? (
            <label className="atelier-zoom">
              <span>{copy.zoom}</span>
              <input
                type="range"
                min={1}
                max={2.6}
                step={0.02}
                value={scale}
                onChange={(event) => {
                  const nextScale = Number(event.target.value);
                  const next = coverCrop(natural.w, natural.h, VIEW, nextScale, pan.x, pan.y);
                  setScale(nextScale);
                  setPan({ x: next.panX, y: next.panY });
                }}
              />
            </label>
          ) : (
            <p className="atelier-hint">{copy.hint}</p>
          )}

          {error ? <p className="atelier-error">{error}</p> : null}

          <div className="atelier-actions">
            {stage === "camera" ? (
              <>
                <button type="button" className="atelier-gold" onClick={() => void captureFrame()}>
                  {copy.capture}
                </button>
                <button type="button" className="atelier-ghost" onClick={() => { stopCamera(); setStage("idle"); }}>
                  {copy.recapture}
                </button>
              </>
            ) : stage === "crop" ? (
              <>
                <button type="button" className="atelier-gold" disabled={busy} onClick={() => void sealPortrait()}>
                  {busy ? copy.sealing : copy.confirm}
                </button>
                <button type="button" className="atelier-ghost" disabled={busy} onClick={() => { setStage("idle"); setCropSrc(""); }}>
                  {copy.recapture}
                </button>
              </>
            ) : stage === "seal" ? null : (
              <>
                <button type="button" className="atelier-gold" onClick={() => void openCamera()}>
                  <Camera className="h-5 w-5" />
                  {copy.camera}
                </button>
                <button
                  type="button"
                  className="atelier-ghost"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    try {
                      fileRef.current?.click();
                    } catch {
                      setError(copy.failed);
                    }
                  }}
                >
                  <Images className="h-5 w-5" />
                  {copy.gallery}
                </button>
              </>
            )}
          </div>

          <p className="atelier-name">{studentFaceName(student)}</p>

          <form
            action="#"
            method="dialog"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const file = event.target.files?.[0];
                event.target.value = "";
                void onGallery(file).catch(() => setError(copy.failed));
              }}
            />
          </form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
