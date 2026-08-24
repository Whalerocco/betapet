import type { PointerEvent } from "react";
import styles from "./Tile.module.css";

export type TileVisualVariant = "rack" | "pending" | "committed";

export interface TileProps {
  readonly letter: string;
  readonly points: number;
  readonly variant?: TileVisualVariant;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly isBlank?: boolean;
  readonly onClick?: () => void;
  readonly ariaLabel?: string;
  /** Starts a drag gesture (roadmap.md Milestone 4.1); has no effect on a plain tap. */
  readonly onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  /** True while this exact tile is the one currently being dragged, so its origin spot dims. */
  readonly isDragSource?: boolean;
  /**
   * Replace mode (game-modifiers.md section 7): this rack tile was displaced from the board by
   * the move in progress, and cannot displace another tile until the turn ends. Shown in blue so
   * it is distinguishable from tiles that were already in the hand.
   */
  readonly isDisplaced?: boolean;
  /** Identifies this tile's place in the rack for drop-position hit-testing (GameScreen.tsx). */
  readonly dataRackTileId?: string;
}

/**
 * A single letter tile, shared between the rack and the board (ui-design.md section 9). A
 * blank tile gets a distinguishing marker so it never reads as identical to a same-lettered
 * ordinary tile — its zero point value alone isn't always visually obvious at a glance.
 */
export function Tile({
  letter,
  points,
  variant = "rack",
  selected = false,
  disabled = false,
  isBlank = false,
  onClick,
  ariaLabel,
  onPointerDown,
  isDragSource = false,
  isDisplaced = false,
  dataRackTileId,
}: TileProps) {
  const classNames = [
    styles.tile,
    styles[variant],
    selected ? styles.selected : "",
    isBlank ? styles.blank : "",
    onPointerDown ? styles.draggable : "",
    isDragSource ? styles.dragSource : "",
    isDisplaced ? styles.displaced : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (!onClick) {
    return (
      <div className={classNames} aria-label={ariaLabel}>
        <span className={styles.letter}>{letter}</span>
        <span className={styles.points}>{points}</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={classNames}
      onClick={onClick}
      onPointerDown={onPointerDown}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      // Marks the tiles that own their own drag gesture, so the board's pan gesture leaves them
      // alone (useBoardZoom.ts) instead of panning the board out from under a tile being moved.
      data-tile-draggable={onPointerDown ? "true" : undefined}
      data-rack-tile-id={dataRackTileId}
    >
      <span className={styles.letter}>{letter}</span>
      <span className={styles.points}>{points}</span>
    </button>
  );
}
