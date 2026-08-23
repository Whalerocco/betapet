/**
 * Pure geometry for the board's pinch-zoom (ui-design.md sections 41-42). Kept out of the React
 * hook so the arithmetic that decides what stays under your fingers is testable on its own.
 *
 * Coordinates here are viewport-relative pixels: the visible window onto the board, with (0, 0)
 * at its top-left corner. "Content" coordinates are unscaled board pixels — what a cell's
 * position would be at zoom 1.
 */

/** Fit-to-width, the zoom the board has always rendered at. Zooming out below it is pointless. */
export const MIN_ZOOM = 1;
/** Roughly a 22px cell becoming a 66px one: past comfortable, but some players will want it. */
export const MAX_ZOOM = 3;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ScrollOffset {
  readonly scrollLeft: number;
  readonly scrollTop: number;
}

export function clampZoom(zoom: number): number {
  // NaN has no ordering, so it would slip through the comparisons below; every other value,
  // including an infinite pinch ratio, clamps to the nearer end of the range.
  if (Number.isNaN(zoom)) return MIN_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function distanceBetween(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpointOf(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export interface ZoomChange {
  readonly scroll: ScrollOffset;
  readonly zoom: number;
  readonly nextZoom: number;
  /** Where the gesture is centred, relative to the viewport's top-left corner. */
  readonly focus: Point;
}

/**
 * The scroll offset that keeps the content under `focus` exactly under `focus` after the zoom
 * changes — so the board grows around your fingers rather than around its top-left corner.
 *
 * The content point under the focus is `(scroll + focus) / zoom`; we want that same point to land
 * on `focus` again at `nextZoom`, which gives `contentPoint * nextZoom - focus`. Offsets are
 * clamped at 0 because a scroll container cannot scroll to a negative position; the caller's
 * `overflow` handles the upper bound.
 */
export function scrollAfterZoom({
  scroll,
  zoom,
  nextZoom,
  focus,
}: ZoomChange): ScrollOffset {
  const contentX = (scroll.scrollLeft + focus.x) / zoom;
  const contentY = (scroll.scrollTop + focus.y) / zoom;
  return {
    scrollLeft: Math.max(0, contentX * nextZoom - focus.x),
    scrollTop: Math.max(0, contentY * nextZoom - focus.y),
  };
}

/**
 * Scroll offset after dragging the board by a pointer delta. Panning moves the content with the
 * finger, so the scroll offset moves against it.
 */
export function scrollAfterPan(
  scroll: ScrollOffset,
  delta: Point,
): ScrollOffset {
  return {
    scrollLeft: Math.max(0, scroll.scrollLeft - delta.x),
    scrollTop: Math.max(0, scroll.scrollTop - delta.y),
  };
}
