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
}: TileProps) {
  const classNames = [
    styles.tile,
    styles[variant],
    selected ? styles.selected : "",
    isBlank ? styles.blank : "",
    onPointerDown ? styles.draggable : "",
    isDragSource ? styles.dragSource : "",
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
    >
      <span className={styles.letter}>{letter}</span>
      <span className={styles.points}>{points}</span>
    </button>
  );
}
