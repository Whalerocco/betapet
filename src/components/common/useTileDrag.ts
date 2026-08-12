"use client";

import { useCallback, useState } from "react";

/** Movement below this many CSS pixels is treated as a tap, not a drag. */
const DRAG_THRESHOLD_PX = 6;

export interface DragPointerPosition {
  readonly x: number;
  readonly y: number;
}

export interface DragState<T> {
  readonly item: T;
  readonly position: DragPointerPosition;
}

export interface UseTileDragOptions<T> {
  /** Called once, when the pointer is released after crossing the movement threshold. */
  readonly onDrop: (item: T, position: DragPointerPosition) => void;
}

export interface UseTileDragResult<T> {
  /** Present only once movement has crossed the threshold; drives the floating preview. */
  readonly dragState: DragState<T> | undefined;
  /** Attach to a tile's onPointerDown. Below the threshold this does nothing, so the tile's
   * normal onClick still fires for a plain tap. */
  readonly startDrag: (item: T, event: React.PointerEvent) => void;
}

/**
 * Native pointer-based drag detection (tech-stack.md section 37: prefer simple pointer handling
 * over a drag-and-drop library) shared by rack and pending board tiles. Drag position is purely
 * transient UI state — never part of `GameState` or persisted local session state
 * (content-model.md sections 38, 49) — so it lives here as ordinary React state, reset the
 * instant the pointer is released.
 *
 * The tap/click fallback (ui-design.md section 11) is preserved automatically: while the pointer
 * hasn't moved past the threshold, this hook stays silent and the tile's own onClick handles the
 * interaction exactly as before. Only real movement takes over the gesture.
 *
 * Each gesture gets its own `AbortController` so cleanup is a single `controller.abort()` call
 * rather than named handlers that have to remove themselves — the tidiest way to avoid the two
 * listeners outliving the gesture they belong to.
 */
export function useTileDrag<T>({
  onDrop,
}: UseTileDragOptions<T>): UseTileDragResult<T> {
  const [dragState, setDragState] = useState<DragState<T> | undefined>();

  const startDrag = useCallback(
    (item: T, event: React.PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const origin = { x: event.clientX, y: event.clientY };
      let dragging = false;
      const controller = new AbortController();

      function handleMove(moveEvent: PointerEvent) {
        const dx = moveEvent.clientX - origin.x;
        const dy = moveEvent.clientY - origin.y;
        if (!dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
          dragging = true;
        }
        moveEvent.preventDefault();
        setDragState({
          item,
          position: { x: moveEvent.clientX, y: moveEvent.clientY },
        });
      }

      function handleEnd(endEvent: PointerEvent) {
        controller.abort();
        setDragState(undefined);
        if (dragging && endEvent.type === "pointerup") {
          onDrop(item, { x: endEvent.clientX, y: endEvent.clientY });
        }
      }

      window.addEventListener("pointermove", handleMove, {
        signal: controller.signal,
      });
      window.addEventListener("pointerup", handleEnd, {
        signal: controller.signal,
      });
      window.addEventListener("pointercancel", handleEnd, {
        signal: controller.signal,
      });
    },
    [onDrop],
  );

  return { dragState, startDrag };
}
