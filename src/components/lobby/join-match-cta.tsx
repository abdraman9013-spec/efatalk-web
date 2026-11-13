"use client";

import { useI18n } from "@/i18n/provider";

export function JoinMatchCta({
  locked = false,
  disabled = false,
  onJoin,
  onLockedClick,
}: {
  locked?: boolean;
  disabled?: boolean;
  onJoin: () => void;
  onLockedClick?: () => void;
}) {
  const { t } = useI18n();
  const blocked = locked ? false : disabled;
  return (
    <div className={`join-match-wrap ${blocked ? "join-match-wrap-off" : ""}`}>
      <div className="join-match-pointer" aria-hidden>
        <span className="join-match-finger">👇</span>
        <span className="join-match-arrow" />
      </div>
      <button
        type="button"
        className={`join-match-cta ${locked ? "join-match-cta-locked" : ""}`}
        disabled={blocked}
        onClick={() => {
          if (locked) {
            onLockedClick?.();
            return;
          }
          onJoin();
        }}
      >
        {locked ? t.lobby.joinLocked : t.lobby.joinMatch}
      </button>
    </div>
  );
}
