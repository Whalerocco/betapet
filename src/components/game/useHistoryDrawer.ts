"use client";

import { useEffect, useState } from "react";

/** The breakpoint at which the history stops being a side column and becomes a drawer. */
const NARROW_LAYOUT = "(max-width: 56rem)";

export interface HistoryDrawer {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
}

/**
 * Whether the history drawer is open, shared by both playing screens (`architecture.md`
 * section 24: the layer between the engine and the shared components is where hot-seat and online
 * have drifted apart before, so anything both need lives in one place).
 *
 * It matters beyond the drawer itself because the playing view is pinned to the viewport while it
 * is closed and not while it is open (`ui-design.md` section 41). The pinning exists to stop a
 * mobile browser's address bar shifting the board out from under a finger mid-drag; a player
 * reading the history is not dragging anything, and the whole drawer has to be reachable. The
 * game-over screen already makes the same trade for the same reason.
 *
 * **Open on a wide screen, closed on a narrow one.** On a wide screen the history is a column
 * beside the board and there is no address bar to disturb; on a phone it is a drawer, which is
 * what `ui-design.md` section 41 calls it, and leaving it open by default would mean the view was
 * un-pinned for most players most of the time — giving back the protection the pinning exists for.
 *
 * The decision is made after mount rather than during render. The server cannot know the
 * viewport, so rendering one state and hydrating another would be a mismatch; this starts closed
 * on both and opens on a wide screen once there is a window to ask.
 */
export function useHistoryDrawer(): HistoryDrawer {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(NARROW_LAYOUT);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(!query.matches);

    // A rotation or a resize crosses the breakpoint, and the drawer should follow the layout it
    // is part of rather than keep a state that belonged to the other one.
    const onChange = (event: MediaQueryListEvent) => setOpen(!event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return { open, setOpen };
}
