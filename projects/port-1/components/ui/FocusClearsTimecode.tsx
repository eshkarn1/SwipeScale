"use client";

import { useEffect } from "react";

/**
 * Keeps keyboard focus out from under the fixed timecode bar.
 *
 * ## Why CSS is not enough here
 *
 * The bar is `position: fixed`, so the browser's scroll-into-view on focus does
 * not know it exists and will park a control beneath it. The obvious fix,
 * `scroll-padding-bottom: var(--timecode-lane)` on `<html>`, is real and is
 * applied in globals.css — it fixes every control that sits *fully* below the
 * fold, because there the browser performs a scroll and the padding shapes it.
 *
 * It cannot fix a control that is *partially* visible. Sequential focus
 * navigation only scrolls when the browser decides scrolling is needed, and a
 * partially-visible element does not qualify. `scroll-padding` shapes a scroll;
 * it cannot cause one.
 *
 * Measured at 375x812, tabbing a clean single pass of 21 stops:
 *
 *   contact textarea   top 739, bottom 884, viewport 812, bar top 772
 *   scrollY 8818 with 686px of room left to scroll — the browser scrolled zero
 *   an explicit scrollIntoView({block:'end'}) puts bottom at exactly 772
 *
 * So the padding was being honoured and simply never consulted. 112px of the
 * textarea and the entire lower edge of its focus ring sat under an opaque bar.
 * At 1440 there were no occlusions, which is why this looked fine on desktop.
 *
 * ## What this does
 *
 * On `focusin`, if the focused element overlaps the bar, scroll by exactly the
 * overlap. Nothing else. It never scrolls the element's top out of view, and it
 * does nothing when there is no overlap — which is every control on desktop and
 * all but one at 375, so in practice it fires rarely.
 *
 * Instant, not smooth: this is keyboard navigation, and a glide on every Tab is
 * the defect `SmoothAnchors` exists to prevent.
 *
 * Progressive enhancement: with JS off there is no focus scrolling to correct
 * and the CSS `scroll-padding-bottom` still covers the below-the-fold cases.
 */
export default function FocusClearsTimecode() {
  useEffect(() => {
    let frame = 0;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      // Correct on the next frame, not synchronously.
      //
      // The browser performs its own scroll-into-view as part of focusing, and
      // whether that lands before or after this listener is not guaranteed.
      // Measuring synchronously raced it: an otherwise identical keyboard pass
      // reported the contact textarea occluded once in four runs and clean in
      // the other three. Reading the rect after the browser has finished makes
      // the correction deterministic instead of usually-right.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bar = document.querySelector<HTMLElement>(".timecode-bar");
        if (!bar || !target.isConnected) return;

        const barTop = bar.getBoundingClientRect().top;
        const rect = target.getBoundingClientRect();

        const overlap = rect.bottom - barTop;
        if (overlap <= 0) return;

        // Never push the element's own top off the top of the viewport — a
        // control taller than the usable height is better clipped at the bottom
        // than scrolled past entirely.
        const shift = Math.min(overlap, Math.max(0, rect.top));
        if (shift <= 0) return;

        window.scrollBy({ top: shift, behavior: "instant" as ScrollBehavior });
      });
    };

    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
