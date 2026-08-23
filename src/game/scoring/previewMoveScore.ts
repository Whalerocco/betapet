import type { BoardDefinition, BoardState } from "../model/board";
import type { RackSize } from "../model/gameConfiguration";
import type { TileId } from "../model/ids";
import type { PendingPlacedTile } from "../model/pendingMove";
import type { Tile } from "../model/tile";
import {
  validatePhysicalPlacement,
  type PhysicalValidationOptions,
} from "../rules/physicalValidation";
import { detectFormedWords } from "../rules/wordDetection";
import { scoreMove } from "./scoreMove";

/**
 * The total score a pending move would receive if submitted right now, ignoring word
 * classification entirely (dictionary/proposal status is decided later, at submit time —
 * game-modifiers.md, submitMove.ts). Returns `undefined` whenever the current placement isn't
 * physically valid yet (out of bounds, disconnected, mid-gap) or forms no word — there's nothing
 * coherent to preview in that state.
 */
export function previewMoveScore(
  boardState: BoardState,
  boardDefinition: BoardDefinition,
  tiles: Readonly<Record<TileId, Tile>>,
  placedTiles: readonly PendingPlacedTile[],
  configuredRackSize: RackSize,
  /** Tiles still in the player's rack; the pending tiles have already left it. */
  tilesLeftInRack: number,
  options: PhysicalValidationOptions,
): number | undefined {
  if (placedTiles.length === 0) return undefined;

  const physical = validatePhysicalPlacement(
    boardState,
    boardDefinition,
    placedTiles,
    options,
  );
  if (!physical.valid) return undefined;

  const formedWords = detectFormedWords(boardState, tiles, placedTiles);
  if (formedWords.length === 0) return undefined;

  return scoreMove(
    boardDefinition,
    placedTiles,
    tiles,
    formedWords,
    configuredRackSize,
    tilesLeftInRack,
  ).total;
}
