import {
  getTileIdAt,
  isWithinBounds,
  placeCommittedTile,
  removeCommittedTile,
  type BoardDefinition,
  type BoardState,
} from "../model/board";
import { coordinatesEqual, type Coordinate } from "../model/coordinate";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import { createPendingMove } from "../model/pendingMove";
import { addTileToRack, removeTileFromRack, type Player } from "../model/player";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";
import { replacesSameLetter, tilesDisplacedThisMove } from "./placeTile";

export interface MovePendingTileParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
  readonly coordinate: Coordinate;
}

export interface MovePendingTileOptions {
  /**
   * Replace mode (game-modifiers.md section 7): allows moving a pending tile onto a cell that
   * already holds a committed tile, exactly like a fresh placement there would (placeTile.ts's
   * own `allowReplace`). Defaults to false (the standard rule: only empty cells).
   */
  readonly allowReplace?: boolean;
}

/**
 * Moves an already-pending tile to a new coordinate, preserving its identity. If the tile being
 * moved was itself a Replace-mode placement (game-modifiers.md section 7) at its old coordinate,
 * that displacement is reversed first: the tile it had displaced returns to the board there, and
 * out of the rack, before the move proceeds. If the destination is itself occupied by a committed
 * tile, `options.allowReplace` decides whether this move may displace it in turn (same rules as
 * placeTile.ts: not allowed if the moved tile was already used to displace something else earlier
 * in this same move — REPLACE_CHAINING_NOT_ALLOWED).
 */
export function movePendingTile(
  state: GameState,
  boardDefinition: BoardDefinition,
  params: MovePendingTileParams,
  options: MovePendingTileOptions = {},
): ActionResult {
  const precondition = checkEditPreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  const pendingMove = state.pendingMove;
  if (!pendingMove || pendingMove.playerId !== params.playerId) {
    return actionFailure("INVALID_TILE", "tileNotPending");
  }
  const placedTile = pendingMove.placedTiles.find(
    (p) => p.tileId === params.tileId,
  );
  if (!placedTile) {
    return actionFailure("INVALID_TILE", "tileNotPending");
  }

  if (!isWithinBounds(boardDefinition, params.coordinate)) {
    return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
  }
  const otherPlacedTiles = pendingMove.placedTiles.filter(
    (p) => p.tileId !== params.tileId,
  );
  /**
   * Another of the player's own not-yet-played tiles on the destination square. Dropping this one
   * onto it sends that one back to the rack and takes its place (DEC-017) — the same ordinary
   * editing `placeTile` allows from the rack, so the tap flow and dragging agree.
   */
  const swappedOutTile = otherPlacedTiles.find((p) =>
    coordinatesEqual(p.coordinate, params.coordinate),
  );

  // Reverse this tile's own old displacement (if any) first, so the board correctly reflects
  // "as if this tile had never been placed" before deciding what's occupying the destination.
  let board: BoardState = state.board;
  let players = state.players;
  if (placedTile.replacedTileId !== undefined) {
    board = placeCommittedTile(
      board,
      placedTile.coordinate,
      placedTile.replacedTileId,
    );
    players = players.map((p) =>
      p.id === params.playerId
        ? { ...p, rack: removeTileFromRack(p.rack, placedTile.replacedTileId!) }
        : p,
    ) as [Player, Player];
  }

  const displacedTileId = getTileIdAt(board, params.coordinate);
  if (displacedTileId !== undefined) {
    if (!options.allowReplace) {
      return actionFailure("INVALID_PLACEMENT", "invalidPlacement");
    }
    if (tilesDisplacedThisMove(otherPlacedTiles).has(params.tileId)) {
      return actionFailure(
        "REPLACE_CHAINING_NOT_ALLOWED",
        "replaceChainingNotAllowed",
      );
    }
    board = removeCommittedTile(board, params.coordinate);
    players = players.map((p) =>
      p.id === params.playerId
        ? { ...p, rack: addTileToRack(p.rack, displacedTileId) }
        : p,
    ) as [Player, Player];
  }

  // The destination inherits whatever displacement it already stood for, so a swap never loses
  // the link back to the committed tile an earlier placement this move took off the board.
  const replacedTileId = displacedTileId ?? swappedOutTile?.replacedTileId;
  if (
    replacedTileId !== undefined &&
    replacesSameLetter(
      state.tiles,
      params.tileId,
      placedTile.representedLetter,
      replacedTileId,
    )
  ) {
    return actionFailure("REPLACE_SAME_LETTER", "replaceSameLetter");
  }

  if (swappedOutTile) {
    players = players.map((p) =>
      p.id === params.playerId
        ? { ...p, rack: addTileToRack(p.rack, swappedOutTile.tileId) }
        : p,
    ) as [Player, Player];
  }

  const movedTile = {
    ...placedTile,
    coordinate: params.coordinate,
    replacedTileId,
  };
  const newPendingMove = createPendingMove(params.playerId, [
    ...otherPlacedTiles.filter((p) => p !== swappedOutTile),
    movedTile,
  ]);

  return {
    success: true,
    state: createGameState({
      ...state,
      board,
      players,
      pendingMove: newPendingMove,
    }),
  };
}
