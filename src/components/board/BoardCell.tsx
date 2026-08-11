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
  };
  readonly isPlaceable: boolean;
  readonly onPlace?: () => void;
  readonly onPendingTileClick?: () => void;
  /** Coordinate key (e.g. "7,7"), exposed as a test hook since many cells share visual labels. */
  readonly testId: string;
}

/**
 * A single board square. Renders committed/pending tiles, or an empty square that shows its
 * multiplier and can act as a placement target (board.md: Board must not decide legality —
 * `isPlaceable`/`onPlace` are handed down from the application layer's decision). Clicking a
 * pending tile always reports the click upward; the application layer decides whether that
 * means "pick it back up" or "open the blank-letter editor" (ui-design.md section 14).
 */
export function BoardCell({
  multiplier,
  tile,
  isPlaceable,
  onPlace,
  onPendingTileClick,
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
          isBlank={tile.isBlank}
          onClick={tile.isPending ? onPendingTileClick : undefined}
          ariaLabel={
            tile.isPending
              ? `Pending bricka ${tile.letter}, tryck för att redigera`
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
