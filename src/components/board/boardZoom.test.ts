import { describe, expect, it } from "vitest";
import {
  clampZoom,
  distanceBetween,
  midpointOf,
  scrollAfterPan,
  scrollAfterZoom,
  MAX_ZOOM,
  MIN_ZOOM,
} from "./boardZoom";

describe("clampZoom", () => {
  it("never zooms out past fit-to-width or in past the maximum", () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM + 5)).toBe(MAX_ZOOM);
    expect(clampZoom(1.8)).toBe(1.8);
  });

  it("falls back to fit-to-width for a degenerate ratio", () => {
    // A pinch that starts with two fingers in the same spot divides by zero.
    expect(clampZoom(Number.NaN)).toBe(MIN_ZOOM);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(MAX_ZOOM);
  });
});

describe("pinch geometry", () => {
  it("measures the distance and midpoint between two fingers", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 30, y: 40 };

    expect(distanceBetween(a, b)).toBe(50);
    expect(midpointOf(a, b)).toEqual({ x: 15, y: 20 });
  });
});

describe("scrollAfterZoom", () => {
  it("keeps the content under the fingers under the fingers", () => {
    // Zooming 2x around a point 100px into the viewport, already scrolled 50px across.
    const scroll = { scrollLeft: 50, scrollTop: 20 };
    const focus = { x: 100, y: 60 };
    const contentX = (scroll.scrollLeft + focus.x) / 1; // 150
    const contentY = (scroll.scrollTop + focus.y) / 1; // 80

    const next = scrollAfterZoom({ scroll, zoom: 1, nextZoom: 2, focus });

    // That same content point must still sit `focus` pixels into the viewport.
    expect(next.scrollLeft + focus.x).toBe(contentX * 2);
    expect(next.scrollTop + focus.y).toBe(contentY * 2);
  });

  it("is reversible: zooming in then back out restores the offset", () => {
    const focus = { x: 80, y: 90 };
    const start = { scrollLeft: 40, scrollTop: 30 };

    const zoomedIn = scrollAfterZoom({
      scroll: start,
      zoom: 1,
      nextZoom: 2.5,
      focus,
    });
    const backOut = scrollAfterZoom({
      scroll: zoomedIn,
      zoom: 2.5,
      nextZoom: 1,
      focus,
    });

    expect(backOut.scrollLeft).toBeCloseTo(start.scrollLeft, 6);
    expect(backOut.scrollTop).toBeCloseTo(start.scrollTop, 6);
  });

  it("never returns a negative offset", () => {
    const next = scrollAfterZoom({
      scroll: { scrollLeft: 0, scrollTop: 0 },
      zoom: 2,
      nextZoom: 1,
      focus: { x: 200, y: 200 },
    });

    expect(next.scrollLeft).toBe(0);
    expect(next.scrollTop).toBe(0);
  });
});

describe("scrollAfterPan", () => {
  it("moves the content with the finger, so the offset moves against it", () => {
    const next = scrollAfterPan(
      { scrollLeft: 100, scrollTop: 100 },
      { x: -30, y: 15 },
    );

    expect(next).toEqual({ scrollLeft: 130, scrollTop: 85 });
  });

  it("stops at the start of the board instead of going negative", () => {
    const next = scrollAfterPan(
      { scrollLeft: 10, scrollTop: 0 },
      { x: 90, y: 40 },
    );

    expect(next).toEqual({ scrollLeft: 0, scrollTop: 0 });
  });
});
