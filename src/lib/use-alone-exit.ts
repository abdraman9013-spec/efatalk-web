"use client";

import { useEffect, useRef, useState } from "react";

const AFTER_SEEN_GONE_MS = 8000;
const TOAST_MS = 1100;

/**
 * Leave a live room only after a real partner was connected and then gone.
 * Never kick during Daily/mesh join (partner not seen yet). Admin is exempt.
 */
export function useAloneExit(options: {
  enabled: boolean;
  exempt: boolean;
  remoteHumanCount: number;
  onExit: () => void;
}) {
  const { enabled, exempt, remoteHumanCount, onExit } = options;
  const hadPartner = useRef(false);
  const remoteRef = useRef(remoteHumanCount);
  const exemptRef = useRef(exempt);
  const onExitRef = useRef(onExit);
  const [notice, setNotice] = useState(false);
  remoteRef.current = remoteHumanCount;
  exemptRef.current = exempt;
  onExitRef.current = onExit;

  useEffect(() => {
    if (!enabled) {
      hadPartner.current = false;
      setNotice(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || exempt) return;
    if (remoteHumanCount > 0) {
      hadPartner.current = true;
      setNotice(false);
      return;
    }
    if (!hadPartner.current) return;
    const wait = window.setTimeout(() => {
      if (exemptRef.current || remoteRef.current > 0 || !hadPartner.current) return;
      setNotice(true);
      window.setTimeout(() => onExitRef.current(), TOAST_MS);
    }, AFTER_SEEN_GONE_MS);
    return () => window.clearTimeout(wait);
  }, [enabled, exempt, remoteHumanCount]);

  return notice;
}
