import type { BoardDefinition, BoardState } from "../../game/model/board";
import type { Coordinate } from "../../game/model/coordinate";
import type { RackSize } from "../../game/model/gameConfiguration";
import type { GameHistory } from "../../game/model/history";
import type { TileId } from "../../game/model/ids";
import type { PendingPlacedTile } from "../../game/model/pendingMove";
import type { Tile } from "../../game/model/tile";
import { hasCommittedMove } from "../../game/engine/wildRotation";
import { previewMoveScore } from "../../game/scoring/previewMoveScore";

export interface ScorePreviewInput {
  readonly boardState: BoardState;
  readonly boardDefinition: BoardDefinition;
  readonly tiles: Readonly<Record<TileId, Tile>>;
  /** The tiles placed this turn and not yet played. */
  readonly placedTiles: readonly PendingPlacedTile[];
  readonly rackSize: RackSize;
  /** Tiles still in the player's hand; the placed ones have already left it. */
  readonly tilesLeftInRack: number;
  /** Crisscross mode (game-modifiers.md section 6), which changes what connects. */
  readonly crisscrossMode: boolean;
  /** Read only for "has any move ever been committed" — see `isFirstMoveOverride`. */
  readonly history: GameHistory;
}

export interface ScorePreview {
  /**
   * What the move would score if submitted right now, or undefined when there is nothing
   * coherent to preview: no tiles placed, a placement that is not physically valid yet, or one
   * that forms no word (ui-design.md section 17).
   */
  readonly total?: number;
  /** Where the badge belongs: the move's first tile in reading order, if any tile is placed. */
  readonly badgeCoordinate?: Coordinate;
}

/**
 * The live score preview for a placement in progress, for both game screens.
 *
 * This is the middle layer `architecture.md` section 24 warns about — what the screen decides,
 * written once instead of twice. The computation itself is the engine's (`previewMoveScore`), and
 * everything it needs is public: the board, the multiplier layout, the point values of the tiles
 * being placed, and how many tiles the player still holds. None of it is the opponent's hand or
 * the bag, which is why an online client can answer this without holding the game (DEC-035).
 *
 * The badge coordinate is returned even when the score is not, since a placement that cannot be
 * previewed yet is a normal state on the way to one that can.
 */
export function pendingMoveScorePreview(
  input: ScorePreviewInput,
): ScorePreview {
  const { placedTiles } = input;
  if (placedTiles.length === 0) return {};

  const total = previewMoveScore(
    input.boardState,
    input.boardDefinition,
    input.tiles,
    placedTiles,
    input.rackSize,
    input.tilesLeftInRack,
    {
      allowMultiBranch: input.crisscrossMode,
      /*
       * Replace mode can empty the board mid-move, which would make a later move look like the
       * first one; the history says otherwise (physicalValidation.ts `isFirstMoveOverride`).
       */
      isFirstMoveOverride: hasCommittedMove(input.history) ? false : undefined,
    },
  );

  const badgeCoordinate = [...placedTiles].sort(
    (a, b) =>
      a.coordinate.row - b.coordinate.row ||
      a.coordinate.column - b.coordinate.column,
  )[0]!.coordinate;

  return { total, badgeCoordinate };
}
