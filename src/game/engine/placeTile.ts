import {
  getTileIdAt,
  isWithinBounds,
  removeCommittedTile,
  type BoardDefinition,
  type BoardState,
} from "../model/board";
import { coordinatesEqual, type Coordinate } from "../model/coordinate";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import { addTileToRack, removeTileFromRack, type Player } from "../model/player";
import {
  createPendingMove,
  type PendingPlacedTile,
} from "../model/pendingMove";
import { tileLetter, type Tile } from "../model/tile";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface PlaceTileParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
  readonly coordinate: Coordinate;
  /** Required if, and only if, the tile is a blank. */
  readonly representedLetter?: string;
}

export interface PlaceTileOptions {
  /**
   * Replace mode (game-modifiers.md section 7): allows targeting a cell that already holds a
   * committed tile. The displaced tile moves to the replacing player's rack immediately (see
   * board.ts removeCommittedTile doc). Defaults to false (the standard rule: only empty cells).
   */
  readonly allowReplace?: boolean;
}

/**
 * Tiles displaced earlier in this same pending move (game-modifiers.md section 7): a displaced
 * tile may be placed normally on an empty cell later in the same move, but not used to displace
 * yet another tile until at least one full turn has passed — i.e. after this move commits.
 * Exported for `movePendingTile.ts`, which needs the identical chaining check when a pending
 * Replace-mode tile is dragged onto a different occupied cell.
 */
export function tilesDisplacedThisMove(
  placedTiles: readonly PendingPlacedTile[],
): ReadonlySet<TileId> {
  return new Set(
    placedTiles
      .map((p) => p.replacedTileId)
      .filter((id): id is TileId => id !== undefined),
  );
}

/**
 * Replace mode (game-modifiers.md section 7, DEC-015): a replace placement must actually change
 * the letter on the cell — playing an "R" on top of an "R" is not allowed. Blanks count as the
 * letter they represent, since that is the letter the cell shows and the words through it use.
 * Exported for `movePendingTile.ts`, which needs the identical check.
 */
export function replacesSameLetter(
  tiles: Readonly<Record<TileId, Tile>>,
  placedTileId: TileId,
  representedLetter: string | undefined,
  displacedTileId: TileId,
): boolean {
  const newLetter = representedLetter ?? tileLetter(tiles[placedTileId]);
  const displacedLetter = tileLetter(tiles[displacedTileId]);
  return (
    newLetter !== undefined &&
    displacedLetter !== undefined &&
    newLetter.toUpperCase() === displacedLetter.toUpperCase()
  );
}

/** Places a tile from the player's rack onto the board as part of the current pending move. */
export function placeTile(
  state: GameState,
  boardDefinition: BoardDefinition,
  alphabet: readonly string[],
  params: PlaceTileParams,
  options: PlaceTileOptions = {},
): ActionResult {
  const precondition = checkEditPreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  const player = state.players.find((p) => p.id === params.playerId);
  if (!player || !player.rack.tileIds.includes(params.tileId)) {
    return actionFailure("TILE_NOT_IN_RACK", "tileNotInRack");
  }

  const tile = state.tiles[params.tileId];
  if (tile.kind === "BLANK") {
    if (params.representedLetter === undefined) {
      return actionFailure("BLANK_LETTER_REQUIRED", "blankLetterRequired");
    }
    if (!alphabet.includes(params.representedLetter)) {
      return actionFailure("INVALID_BLANK_LETTER", "invalidBlankLetter");
    }
  } else if (params.representedLetter !== undefined) {
    return actionFailure("UNEXPECTED_BLANK_LETTER", "unexpectedBlankLetter");
  }

  if (!isWithinBounds(boardDefinition, params.coordinate)) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }

  const displacedTileId = getTileIdAt(state.board, params.coordinate);
  if (displacedTileId !== undefined) {
    if (!options.allowReplace) {
      return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
    }
    if (
      tilesDisplacedThisMove(state.pendingMove?.placedTiles ?? []).has(
        params.tileId,
      )
    ) {
      return actionFailure(
        "REPLACE_CHAINING_NOT_ALLOWED",
        "replaceChainingNotAllowed",
      );
    }
    if (
      replacesSameLetter(
        state.tiles,
        params.tileId,
        params.representedLetter,
        displacedTileId,
      )
    ) {
      return actionFailure("REPLACE_SAME_LETTER", "replaceSameLetter");
    }
  }

  const existingPlacedTiles = state.pendingMove?.placedTiles ?? [];
  if (
    existingPlacedTiles.some((p) =>
      coordinatesEqual(p.coordinate, params.coordinate),
    )
  ) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }

  const newPlacedTile: PendingPlacedTile = {
    tileId: params.tileId,
    coordinate: params.coordinate,
    representedLetter: params.representedLetter,
    replacedTileId: displacedTileId,
  };
  const newPendingMove = createPendingMove(params.playerId, [
    ...existingPlacedTiles,
    newPlacedTile,
  ]);

  // Displacing a committed tile moves it out of the board immediately, the same way placing the
  // replacing tile moves *it* out of the rack immediately — not deferred to commit (board.ts
  // removeCommittedTile doc).
  let board: BoardState = state.board;
  let players = state.players;
  if (displacedTileId !== undefined) {
    board = removeCommittedTile(board, params.coordinate);
    players = players.map((p) =>
      p.id === params.playerId
        ? { ...p, rack: addTileToRack(p.rack, displacedTileId) }
        : p,
    ) as [Player, Player];
  }

  const updatedPlayers = players.map((p) =>
    p.id === params.playerId
      ? { ...p, rack: removeTileFromRack(p.rack, params.tileId) }
      : p,
  ) as [Player, Player];

  return {
    success: true,
    state: createGameState({
      ...state,
      board,
      players: updatedPlayers,
      pendingMove: newPendingMove,
    }),
  };
}
