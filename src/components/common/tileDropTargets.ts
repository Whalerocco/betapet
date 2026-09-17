import {
  parseCoordinateKey,
  type Coordinate,
} from "../../game/model/coordinate";
import type { TileId } from "../../game/model/ids";
import type { DragPointerPosition } from "./useTileDrag";

export interface DropTarget {
  readonly coordinate?: Coordinate;
  readonly overRack: boolean;
}

/**
 * Resolves what a drag ended over, purely by DOM hit-testing the data attributes Board/Rack
 * already expose (`data-coordinate`, `data-rack-dropzone`). Kept outside the screens since it has
 * no dependency on game state — it only answers "what's under this point", not "is that a legal
 * move" (ui-design.md section 52-53 keeps that decision in the engine).
 *
 * Shared by both game screens: the hit-testing is the same question whether the answer is then
 * given to the engine (hot-seat) or to a local arrangement the server will judge (online), and
 * `architecture.md` section 24 is about exactly the things that only got made once.
 */
export function resolveDropTarget(position: DragPointerPosition): DropTarget {
  const element = document.elementFromPoint(position.x, position.y);
  if (!element) return { overRack: false };
  const cell = element.closest<HTMLElement>("[data-coordinate]");
  if (cell?.dataset.coordinate) {
    return {
      coordinate: parseCoordinateKey(cell.dataset.coordinate),
      overRack: false,
    };
  }
  return { overRack: element.closest("[data-rack-dropzone]") !== null };
}

/**
 * Which gap in the rack a drop at `pointerX` fell into, counted after the dragged tile has been
 * lifted out of the order. Read from where the tiles actually are on screen rather than from a
 * model of the layout, so it stays correct however the rack wraps or resizes.
 */
export function rackDropIndex(draggedTileId: TileId, pointerX: number): number {
  const tiles = Array.from(
    document.querySelectorAll<HTMLElement>(
      "[data-rack-dropzone] [data-rack-tile-id]",
    ),
  ).filter((element) => element.dataset.rackTileId !== draggedTileId);

  const index = tiles.findIndex((element) => {
    const rect = element.getBoundingClientRect();
    return pointerX < rect.left + rect.width / 2;
  });
  return index === -1 ? tiles.length : index;
}
