"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Keeps tile text in proportion to its tile, on browsers that refuse to draw small text.
 *
 * Chrome for Android enforces a *minimum font size* (an accessibility setting, on by default),
 * which floors a computed `font-size` but not a transform. Board tiles are around 22px on a
 * phone, so the letter's intended 9px and the point value's intended 4px were both floored to the
 * same 12px: the point value came out as large as the letter, and the multiplier captions with it
 * (`known-bugs.md` item 8). iOS has no such floor, which is why the same build looks right there.
 *
 * The cure is to draw the text at a size no floor applies to and scale it down. That needs a
 * *unitless* factor from a length, which CSS alone can only produce with `tan(atan2(a, b))` or
 * length division — an earlier fix used the trig form and had to be reverted, because a Safari
 * that parses it but evaluates it to zero rendered `scale(0)` and every glyph on the board
 * vanished.
 *
 * So the number comes from JavaScript, which has no trouble with it: measure the rendered tile,
 * divide by the base the text is drawn at, and publish the result as `--tile-text-unit`. The
 * stylesheets multiply that by each element's own ratio, which is plain number arithmetic every
 * engine has always understood. The design ratios stay in CSS where they are read.
 */

/** What tile text is drawn at before scaling. Must match `--tile-text-base` in `globals.css`. */
export const TILE_TEXT_BASE_PX = 16;

/**
 * Publishes `--tile-text-unit` on `containerRef`, measured from its first child — a board cell or
 * a rack tile, both of which are exactly one tile wide.
 *
 * Measuring rather than computing is deliberate: the tile size is a `clamp()` of the viewport
 * times the board's zoom, and the resolved length is something only the browser knows.
 */
export function useTileTextScale<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
): void {
  /*
   * No dependency array: a re-render is how a zoom change arrives, and republishing is one
   * measurement. Layout rather than passive effect, so the first paint already has the number and
   * no frame is drawn at the fallback size.
   */
  useLayoutEffect(() => {
    const container = containerRef.current;
    const tile = container?.firstElementChild;
    if (!container || !(tile instanceof HTMLElement)) return;

    function publish() {
      // A detached or display:none container measures 0; keeping the last good value is better
      // than dividing by it.
      const width = (tile as HTMLElement).getBoundingClientRect().width;
      if (width > 0) {
        (container as HTMLElement).style.setProperty(
          "--tile-text-unit",
          String(width / TILE_TEXT_BASE_PX),
        );
      }
    }

    publish();

    // A viewport resize changes the tile without re-rendering anything, so it needs watching too.
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", publish);
      return () => window.removeEventListener("resize", publish);
    }

    const observer = new ResizeObserver(publish);
    observer.observe(tile);
    return () => observer.disconnect();
  });
}
