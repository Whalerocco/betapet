import { placeCommittedTile, type BoardState } from "../model/board";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import { createPendingMove } from "../model/pendingMove";
import { addTileToRack, type Player } from "../model/player";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface RemovePendingTileParams {
  readonly playerId: PlayerId;
  readonly tileId: TileId;
}

/**
 * Returns a pending tile to the player's rack. Clears the pending move once it is empty. If the
 * removed placement was a Replace-mode placement (game-modifiers.md section 7), this reverses
 * the displacement it caused: the tile it had displaced goes back onto the board exactly where it
 * was, whether it was waiting in the rack or had already been played elsewhere this move — in
 * which case that placement is undone too, since one tile cannot be in both places.
 */
export function removePendingTile(
  state: GameState,
  params: RemovePendingTileParams,
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

  const remainingPlacedTiles = pendingMove.placedTiles.filter(
    (p) => p.tileId !== params.tileId,
  );

  const displacedTileId = placedTile.replacedTileId;
  /**
   * The displaced tile does not have to be sitting in the rack: the player may already have
   * played it somewhere else this move. Putting it back on the square it came from therefore
   * also takes it off wherever it currently is — the board cannot hold it twice, and refusing
   * the removal until the player retrieves it by hand is the behaviour the project owner
   * reported as wrong.
   */
  const displacedPlacement =
    displacedTileId !== undefined
      ? remainingPlacedTiles.find((p) => p.tileId === displacedTileId)
      : undefined;

  const placedTilesAfterRemoval = remainingPlacedTiles.filter(
    (p) => p !== displacedPlacement,
  );
  const newPendingMove =
    placedTilesAfterRemoval.length > 0
      ? createPendingMove(params.playerId, placedTilesAfterRemoval)
      : undefined;

  let board: BoardState = state.board;
  let players = state.players.map((p) =>
    p.id === params.playerId
      ? { ...p, rack: addTileToRack(p.rack, params.tileId) }
      : p,
  ) as [Player, Player];

  if (displacedTileId !== undefined) {
    board = placeCommittedTile(board, placedTile.coordinate, displacedTileId);
    // Filtering rather than removeTileFromRack, which throws on a tile that isn't there: the
    // displaced tile is in the rack only when it was not re-played elsewhere this move.
    players = players.map((p) =>
      p.id === params.playerId
        ? {
            ...p,
            rack: {
              tileIds: p.rack.tileIds.filter((id) => id !== displacedTileId),
            },
          }
        : p,
    ) as [Player, Player];
  }

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
