import type { Coordinate, Orientation } from "./coordinate";
import type { TileId } from "./ids";

/**
 * A word derived from the board (committed tiles plus a pending placement), never trusted as
 * client-supplied input. Word/dictionary validity is a separate later concern (dictionary.md);
 * this only records what word was formed and from which tiles.
 */
export interface FormedWord {
  readonly text: string;
  readonly orientation: Orientation;
  /** In reading order (left-to-right or top-to-bottom). */
  readonly coordinates: readonly Coordinate[];
  /** Parallel to `coordinates`. */
  readonly tileIds: readonly TileId[];
}
