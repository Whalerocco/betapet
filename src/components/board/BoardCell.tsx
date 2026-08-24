import type { PointerEvent } from "react";
import { Tile } from "../common/Tile";
import { getMultiplierLabel } from "./multiplierLabel";
import type { Multiplier } from "../../game/model/board";
import styles from "./Board.module.css";

export interface BoardCellProps {
  readonly multiplier: Multiplier;
  readonly tile?: {
    readonly letter: string;
    readonly points: number;
    readonly isPending: boolean;
    readonly isBlank: boolean;
    readonly isDragSource?: boolean;
  };
  readonly isPlaceable: boolean;
  /** The total score the current pending move would receive if submitted now, shown as a small
   * badge on the move's first (reading-order) tile only (ui-design.md live score preview). */
  readonly scoreBadge?: number;
  readonly onPlace?: () => void;
  /**
   * Set when the tile on this square may be targeted by the currently selected rack tile, which
   * turns the tile itself into a placement button: a committed tile under Replace mode
   * (game-modifiers.md section 7), or one of the player's own not-yet-played tiles, which simply
   * swaps (DEC-017). Undefined otherwise, leaving a committed tile inert exactly as before.
   * Whether the placement is actually legal is still the engine's call, not this component's.
   */
  readonly onReplace?: () => void;
  readonly onPendingTileClick?: () => void;
  readonly onPendingTilePointerDown?: (
    event: PointerEvent<HTMLButtonElement>,
  ) => void;
  /** Coordinate key (e.g. "7,7"), exposed as a test hook since many cells share visual labels. */
  readonly testId: string;
  /** Bare coordinate key used for drag-and-drop drop-target hit-testing in GameScreen. */
  readonly coordinateKey: string;
  /** True while a dragged tile is currently hovering over this square as a valid target. */
  readonly isDragOver?: boolean;
}

/**
 * A single board square. Renders committed/pending tiles, or an empty square that shows its
 * multiplier and can act as a placement target (board.md: Board must not decide legality —
 * `isPlaceable`/`onPlace`/`onReplace` are handed down from the application layer's decision).
 * Clicking a pending tile always reports the click upward; the application layer decides whether
 * that means "pick it back up" or "open the blank-letter editor" (ui-design.md section 14).
 *
 * Under Replace mode a *committed* tile becomes a placement target too (`onReplace`), so the
 * tap/click flow can do everything dragging can (ui-design.md section 11) — before that, a cell
 * holding a committed tile was inert and a replace could only be performed by dragging.
 *
 * `data-coordinate` is read by GameScreen's drag-and-drop drop-target resolution
 * (`document.elementFromPoint`); it is set on every cell, not just placeable ones, so a drag can
 * also detect "you're over an occupied square" and reject the drop.
 */
export function BoardCell({
  multiplier,
  tile,
  isPlaceable,
  scoreBadge,
  onPlace,
  onReplace,
  onPendingTileClick,
  onPendingTilePointerDown,
  testId,
  coordinateKey,
  isDragOver = false,
}: BoardCellProps) {
  if (tile) {
    const dragOverClass = isDragOver ? styles.dragOver : "";
    /*
     * A square holding a tile can be tapped for either of two reasons, and `onReplace` decides
     * which: with a rack tile selected it is a placement target — a Replace-mode replacement, or
     * a swap with one of your own not-yet-played tiles (DEC-017) — and otherwise a pending tile
     * falls back to its own "pick it back up" behaviour. Placing wins when both are possible,
     * because selecting a tile first is a clear statement of intent to put it somewhere.
     */
    const onClick =
      onReplace ?? (tile.isPending ? onPendingTileClick : undefined);
    const ariaLabel = onReplace
      ? `Ersätt bricka ${tile.letter}`
      : tile.isPending
        ? `Pending bricka ${tile.letter}, tryck för att redigera`
        : undefined;
    return (
      <div
        className={`${styles.cell} ${styles[multiplier]} ${dragOverClass}`}
        data-testid={testId}
        data-coordinate={coordinateKey}
      >
        {tile.isPending && scoreBadge !== undefined && (
          <span className={styles.scoreBadge}>{scoreBadge}</span>
        )}
        <Tile
          letter={tile.letter}
          points={tile.points}
          variant={tile.isPending ? "pending" : "committed"}
          isBlank={tile.isBlank}
          isDragSource={tile.isDragSource}
          onClick={onClick}
          onPointerDown={tile.isPending ? onPendingTilePointerDown : undefined}
          ariaLabel={ariaLabel}
        />
      </div>
    );
  }

  const label = getMultiplierLabel(multiplier);
  const dragOverClass = isDragOver ? styles.dragOver : "";

  if (isPlaceable) {
    return (
      <button
        type="button"
        className={`${styles.cell} ${styles[multiplier]} ${styles.placeable} ${dragOverClass}`}
        onClick={onPlace}
        aria-label={label ? `Placera bricka: ${label.full}` : "Placera bricka"}
        title={label?.full}
        data-testid={testId}
        data-coordinate={coordinateKey}
      >
        {label && (
          <span className={styles.multiplierLabel}>{label.short}</span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`${styles.cell} ${styles[multiplier]} ${dragOverClass}`}
      aria-label={label?.full}
      title={label?.full}
      data-testid={testId}
      data-coordinate={coordinateKey}
    >
      {label && <span className={styles.multiplierLabel}>{label.short}</span>}
    </div>
  );
}
