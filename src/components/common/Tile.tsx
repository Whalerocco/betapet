import styles from "./Tile.module.css";

export type TileVisualVariant = "rack" | "pending" | "committed";

export interface TileProps {
  readonly letter: string;
  readonly points: number;
  readonly variant?: TileVisualVariant;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly onClick?: () => void;
  readonly ariaLabel?: string;
}

/** A single letter tile, shared between the rack and the board (ui-design.md section 9). */
export function Tile({
  letter,
  points,
  variant = "rack",
  selected = false,
  disabled = false,
  onClick,
  ariaLabel,
}: TileProps) {
  const classNames = [
    styles.tile,
    styles[variant],
    selected ? styles.selected : "",
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
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
    >
      <span className={styles.letter}>{letter}</span>
      <span className={styles.points}>{points}</span>
    </button>
  );
}
