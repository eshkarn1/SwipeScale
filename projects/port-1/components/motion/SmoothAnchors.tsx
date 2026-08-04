"use client";

import { useEffect } from "react";

/**
 * Smooth scrolling for in-page anchor clicks — and only for those.
 *
 * Spec §2 asks for native smooth scroll on anchors. The obvious implementation,
 * `scroll-behavior: smooth` on `<html>`, also animates the scroll that
 * sequential focus navigation performs, so every Tab press glides for about a
 * second. An earlier attempt gated it behind `html:has(:target)` and claimed
 * that left Tab instant; it did not, because `:target` stays matched after the
 * first in-page navigation, which is exactly what both pricing CTAs trigger.
 * Measured at 1440 with `#contact` targeted: two Tab presses gave scrollY 3 at
 * 30ms then 7659 at 930ms.
 *
 * There is no CSS selector for "this scroll was caused by a click", so the
 * class is applied for the duration of the click-driven scroll and removed
 * afterwards. Keyboard navigation never sets it, so Tab is always instant.
 *
 * Progressive enhancement: with JS disabled, anchors jump instantly, which is
 * correct behaviour rather than a degraded one.
 */
export default function SmoothAnchors() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    let timer: number | undefined;

    const onClick = (event: MouseEvent) => {
      // Let the browser handle modified clicks (new tab, download, etc).
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as Element | null)?.closest?.("a[href^='#']");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      // The skip link must jump, not glide — it exists to save time.
      if (!href || href === "#" || href === "#main") return;

      root.classList.add("smooth-anchor");
      window.clearTimeout(timer);
      // Long enough to cover the glide, short enough that a Tab immediately
      // afterwards is already instant again.
      timer = window.setTimeout(() => root.classList.remove("smooth-anchor"), 1200);
    };

    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      window.clearTimeout(timer);
      root.classList.remove("smooth-anchor");
    };
  }, []);

  return null;
}
