"use client";

import { useEffect } from "react";

const SRC = "https://local-ai-agent-production.up.railway.app/efa-widget.js";
const ASSISTANT_SRC = "/brand/efa-assistant.png";
const ASSISTANT_NAME = "RIMAS";

/** Keep RIMAS opposite the WhatsApp group FAB and clear of essential CTAs. */
function pickSide(): "left" | "right" {
  const wa = document.querySelector(".wa-group-fab");
  if (wa) {
    // WA FAB on left (RTL) → RIMAS on right; otherwise RIMAS on left.
    if (wa.classList.contains("wa-group-fab-rtl")) return "right";
    return "left";
  }
  // No group button: still prefer left so right stays free for lobby/match CTAs.
  return "left";
}

function styleLauncher(btn: HTMLButtonElement) {
  const side = pickSide();
  btn.classList.add("efa-help-launcher");
  btn.dataset.side = side;
  btn.setAttribute("aria-label", `${ASSISTANT_NAME} · Academy guide`);
  btn.replaceChildren();

  const img = document.createElement("img");
  img.src = ASSISTANT_SRC;
  img.alt = ASSISTANT_NAME;
  img.width = 48;
  img.height = 48;
  img.decoding = "async";
  img.draggable = false;

  const name = document.createElement("span");
  name.className = "efa-help-name";
  name.textContent = ASSISTANT_NAME;

  btn.appendChild(img);
  btn.appendChild(name);

  const edge =
    side === "left"
      ? "left:max(12px,env(safe-area-inset-left));right:auto"
      : "right:max(12px,env(safe-area-inset-right));left:auto";

  btn.style.cssText = [
    "position:fixed",
    edge,
    // Mid-height on the side — clear of footer socials, WA FAB, match CTAs, Android nav.
    "top:auto",
    "bottom:max(42%, calc(env(safe-area-inset-bottom) + 180px))",
    "transform:none",
    "z-index:55",
    "width:48px",
    "height:48px",
    "min-width:48px",
    "padding:0",
    "border:2px solid rgba(246,231,161,.9)",
    "border-radius:999px",
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "overflow:visible",
    "background:#0c1b4d",
    "box-shadow:0 8px 22px rgba(12,27,77,.35)",
    "cursor:pointer",
    "font-size:0",
    "line-height:0",
  ].join(";");
}

export function EfaHelpWidget() {
  useEffect(() => {
    const restyle = () => {
      const fresh = document.querySelector<HTMLButtonElement>(
        "[data-efa-assistant] > button:not(.efa-help-launcher)",
      );
      if (fresh) {
        styleLauncher(fresh);
        return;
      }
      const existing = document.querySelector<HTMLButtonElement>(
        "[data-efa-assistant] > button.efa-help-launcher",
      );
      if (existing) {
        const side = pickSide();
        if (existing.dataset.side !== side) styleLauncher(existing);
      }
    };

    if (!document.querySelector(`script[src="${SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SRC;
      script.async = true;
      script.dataset.slug = "efa-talk";
      script.dataset.label = ASSISTANT_NAME;
      script.addEventListener("load", restyle);
      document.body.appendChild(script);
    } else {
      restyle();
    }

    const observer = new MutationObserver(restyle);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    const t1 = window.setTimeout(restyle, 200);
    const t2 = window.setTimeout(restyle, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  return null;
}
