"use client";

import {
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from "react";
import { flushSync } from "react-dom";
import {
  clampZoom,
  distanceBetween,
  midpointOf,
  scrollAfterPan,
  scrollAfterZoom,
  MIN_ZOOM,
  type Point,
  type ScrollOffset,
} from "./boardZoom";

/** Movement below this many pixels stays a tap, so tapping a square still places a tile. */
const PAN_THRESHOLD_PX = 6;

export interface BoardZoomResult {
  readonly zoom: number;
  readonly isZoomed: boolean;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onWheel: (event: WheelEvent<HTMLDivElement>) => void;
  readonly resetZoom: () => void;
}

/**
 * Pinch-to-zoom and drag-to-pan for the board alone (ui-design.md sections 41-42): on a phone the
 * whole 15x15 board fits the screen only at roughly 22px per cell, which is half a comfortable
 * touch target, and pinching the *page* would carry the rack and buttons off-screen with it.
 *
 * Two pointers pinch. One pointer pans, but only when the gesture did not start on a tile the
 * player can drag — those keep their existing drag behaviour untouched (`useTileDrag`), which is
 * why the viewport takes `touch-action: none` and pans by hand instead of leaning on native
 * scrolling: a native scroll would start under the first finger before the second one lands.
 *
 * Every DOM read and write goes through the gesture's own `currentTarget` — the scrolling
 * viewport — so this hook holds no element reference and the caller stays in charge of its ref.
 *
 * Zoom state is transient view state, never part of GameState (content-model.md section 38).
 */
export function useBoardZoom(): BoardZoomResult {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const pointers = useRef(new Map<number, Point>());
  const pinchDistance = useRef<number | undefined>(undefined);
  const panOrigin = useRef<Point | undefined>(undefined);
  const isPanning = useRef(false);
  /** The live zoom mid-gesture, which handlers need before React has re-rendered. */
  const zoomValue = useRef(MIN_ZOOM);
  /**
   * The scroll offset we last asked for, kept as a float.
   *
   * A scroll container does not necessarily store what it is given: WebKit rounds an offset to a
   * whole pixel where Chromium keeps the fraction. Recomputing each pinch step from the value
   * read back out therefore throws away up to half a pixel every time, and a pinch is dozens of
   * steps — the board visibly creeps away from the fingers. Carrying the unrounded value forward
   * keeps the error from compounding.
   */
  const requestedScroll = useRef<ScrollOffset>({ scrollLeft: 0, scrollTop: 0 });

  /**
   * What to treat as the current offset: our own unrounded value while it still matches the
   * element, and the element's own when something else has moved it — a native scroll, or a new
   * gesture starting somewhere else entirely. A whole pixel of slack is enough to tell the two
   * apart, since rounding can never exceed half of one.
   */
  function currentScroll(viewport: HTMLDivElement): ScrollOffset {
    const requested = requestedScroll.current;
    const movedElsewhere =
      Math.abs(viewport.scrollLeft - requested.scrollLeft) > 1 ||
      Math.abs(viewport.scrollTop - requested.scrollTop) > 1;
    return movedElsewhere
      ? { scrollLeft: viewport.scrollLeft, scrollTop: viewport.scrollTop }
      : requested;
  }

  function applyScroll(viewport: HTMLDivElement, scroll: ScrollOffset): void {
    requestedScroll.current = scroll;
    viewport.scrollLeft = scroll.scrollLeft;
    viewport.scrollTop = scroll.scrollTop;
  }

  function applyZoom(
    viewport: HTMLDivElement,
    nextZoomValue: number,
    focalClientX: number,
    focalClientY: number,
  ): void {
    const nextZoom = clampZoom(nextZoomValue);
    if (nextZoom === zoomValue.current) return;

    const rect = viewport.getBoundingClientRect();
    const focus = { x: focalClientX - rect.left, y: focalClientY - rect.top };
    const scroll = scrollAfterZoom({
      scroll: currentScroll(viewport),
      zoom: zoomValue.current,
      nextZoom,
      focus,
    });

    zoomValue.current = nextZoom;
    // Committed synchronously so the grid is already laid out at the new tile size when the
    // scroll offset is written below. A scroll container clamps any offset to its *current*
    // extent, so writing before the re-render would clamp against the smaller board and the
    // content would creep out from under the fingers on every pinch step.
    flushSync(() => setZoom(nextZoom));
    applyScroll(viewport, scroll);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>): void {
    // A tile the player can pick up owns its own gesture; panning must not steal it.
    if ((event.target as HTMLElement).closest("[data-tile-draggable]")) return;

    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 1) {
      panOrigin.current = { x: event.clientX, y: event.clientY };
      isPanning.current = false;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = distanceBetween(a, b);
      panOrigin.current = undefined;
    }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>): void {
    if (!pointers.current.has(event.pointerId)) return;
    const position = { x: event.clientX, y: event.clientY };
    const previous = pointers.current.get(event.pointerId)!;
    pointers.current.set(event.pointerId, position);

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const nextDistance = distanceBetween(a, b);
      const lastDistance = pinchDistance.current;
      pinchDistance.current = nextDistance;
      if (!lastDistance) return;
      const midpoint = midpointOf(a, b);
      applyZoom(
        event.currentTarget,
        zoomValue.current * (nextDistance / lastDistance),
        midpoint.x,
        midpoint.y,
      );
      return;
    }

    // Single pointer: pan, but only once past the tap threshold and only while zoomed in — at
    // fit-to-width there is nothing to pan to, and a stray drag must not eat the tap.
    const origin = panOrigin.current;
    if (!origin || zoomValue.current <= MIN_ZOOM) return;
    if (
      !isPanning.current &&
      Math.hypot(position.x - origin.x, position.y - origin.y) <
        PAN_THRESHOLD_PX
    ) {
      return;
    }
    isPanning.current = true;
    const viewport = event.currentTarget;
    applyScroll(
      viewport,
      scrollAfterPan(currentScroll(viewport), {
        x: position.x - previous.x,
        y: position.y - previous.y,
      }),
    );
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>): void {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = undefined;
    if (pointers.current.size === 0) {
      panOrigin.current = undefined;
      isPanning.current = false;
    }
  }

  /** Trackpad pinch and ctrl+wheel arrive as a wheel event rather than as pointers. */
  function onWheel(event: WheelEvent<HTMLDivElement>): void {
    if (!event.ctrlKey) return;
    applyZoom(
      event.currentTarget,
      zoomValue.current * (1 - event.deltaY / 200),
      event.clientX,
      event.clientY,
    );
  }

  const resetZoom = useCallback(() => {
    zoomValue.current = MIN_ZOOM;
    requestedScroll.current = { scrollLeft: 0, scrollTop: 0 };
    setZoom(MIN_ZOOM);
  }, []);

  return {
    zoom,
    isZoomed: zoom > MIN_ZOOM,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
    resetZoom,
  };
}
