"use client";

import { portraitGradient, portraitInitials } from "@/lib/avatar";
import { fetchStudentPortrait } from "@/lib/efaa-db";
import { visibleBoardName } from "@/lib/session";
import { useEffect, useRef, useState } from "react";

const photoCache = new Map<string, string>();

export function StudentPortrait({
  name,
  photo,
  size = 48,
  living = false,
  className = "",
  userId,
}: {
  name?: string | null;
  photo?: string | null;
  size?: number;
  living?: boolean;
  className?: string;
  userId?: string;
}) {
  const label = visibleBoardName(name);
  const initials = portraitInitials(label);
  const cacheKey = userId || label || "efa";
  const cached = photoCache.get(cacheKey);
  const [src, setSrc] = useState(photo || cached || "");
  const [shown, setShown] = useState(() => Boolean(cached && cached === photo));
  const [failed, setFailed] = useState(false);
  const srcRef = useRef(src);
  srcRef.current = src;

  useEffect(() => {
    if (!photo) return;
    photoCache.set(cacheKey, photo);
    if (srcRef.current === photo) return;
    setSrc(photo);
    setFailed(false);
    setShown(false);
  }, [cacheKey, photo]);

  useEffect(() => {
    if (photo || !userId) return;
    const cached = photoCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return;
    }
    let live = true;
    void fetchStudentPortrait(userId).then((url) => {
      if (!live || !url) return;
      photoCache.set(cacheKey, url);
      setSrc(url);
      setFailed(false);
    });
    return () => {
      live = false;
    };
  }, [cacheKey, photo, userId]);

  useEffect(() => {
    if (!src || failed) return;
    const image = new Image();
    image.onload = () => setShown(true);
    image.onerror = () => setFailed(true);
    image.src = src;
    if (image.complete && image.naturalWidth > 0) setShown(true);
  }, [failed, src]);

  return (
    <span
      className={`efa-portrait ${living ? "efa-portrait-live" : ""} ${className}`}
      style={{ width: size, height: size, fontSize: size }}
    >
      <span className="efa-portrait-ring" aria-hidden />
      <span className="efa-portrait-sweep" aria-hidden />
      <span className="efa-portrait-fallback" style={portraitGradient(label)}>
        {initials}
      </span>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          draggable={false}
          decoding="async"
          className={`efa-portrait-img ${shown ? "efa-portrait-img-on" : ""}`}
          onLoad={() => setShown(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
