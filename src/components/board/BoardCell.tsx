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
  };
  readonly isPlaceable: boolean;
  readonly onPlace?: () => void;
  readonly onPickUpPending?: () => void;
  /** Coordinate key (e.g. "7,7"), exposed as a test hook since many cells share visual labels. */
  readonly testId: string;
}

/**
 * A single board square. Renders committed/pending tiles, or an empty square that shows its
 * multiplier and can act as a placement target (board.md: Board must not decide legality —
 * `isPlaceable`/`onPlace` are handed down from the application layer's decision).
 */
export function BoardCell({
  multiplier,
  tile,
  isPlaceable,
  onPlace,
  onPickUpPending,
  testId,
}: BoardCellProps) {
  if (tile) {
    return (
      <div
        className={`${styles.cell} ${styles[multiplier]}`}
        data-testid={testId}
      >
        <Tile
          letter={tile.letter}
          points={tile.points}
          variant={tile.isPending ? "pending" : "committed"}
          onClick={tile.isPending ? onPickUpPending : undefined}
          ariaLabel={
            tile.isPending
              ? `Pending bricka ${tile.letter}, ta tillbaka till handen`
              : undefined
          }
        />
      </div>
    );
  }

  const label = getMultiplierLabel(multiplier);

  if (isPlaceable) {
    return (
      <button
        type="button"
        className={`${styles.cell} ${styles[multiplier]} ${styles.placeable}`}
        onClick={onPlace}
        aria-label={label ? `Placera bricka: ${label.full}` : "Placera bricka"}
        title={label?.full}
        data-testid={testId}
      >
        {label?.short}
      </button>
    );
  }

  return (
    <div
      className={`${styles.cell} ${styles[multiplier]}`}
      aria-label={label?.full}
      title={label?.full}
      data-testid={testId}
    >
      {label?.short}
    </div>
  );
}
