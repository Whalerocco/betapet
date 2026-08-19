import { placeCommittedTile, type BoardState } from "../model/board";
import { createGameState, type GameState } from "../model/game";
import type { PlayerId } from "../model/ids";
import { addTileToRack, type Player } from "../model/player";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

export interface ClearPendingMoveParams {
  readonly playerId: PlayerId;
}

/**
 * "Rensa": returns every pending tile to the player's rack in one atomic step
 * (local-multiplayer.md section 42) rather than requiring one REMOVE_TILE per tile. Tiles
 * committed *before* this move started are never touched. Any Replace-mode placement in this
 * pending move (game-modifiers.md section 7) is fully reversed, though: the tile it displaced
 * comes back out of the rack and back onto the board where it was.
 */
export function clearPendingMove(
  state: GameState,
  params: ClearPendingMoveParams,
): ActionResult {
  const precondition = checkEditPreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  const pendingMove = state.pendingMove;
  if (!pendingMove || pendingMove.playerId !== params.playerId) {
    return actionFailure("INVALID_GAME_STATE", "noPendingMoveToClear");
  }

  let board: BoardState = state.board;
  for (const placed of pendingMove.placedTiles) {
    if (placed.replacedTileId !== undefined) {
      board = placeCommittedTile(board, placed.coordinate, placed.replacedTileId);
    }
  }

  const displacedTileIds = new Set(
    pendingMove.placedTiles
      .map((p) => p.replacedTileId)
      .filter((id): id is NonNullable<typeof id> => id !== undefined),
  );

  const updatedPlayers = state.players.map((p) => {
    if (p.id !== params.playerId) return p;
    const rack = pendingMove.placedTiles.reduce(
      (r, placed) => addTileToRack(r, placed.tileId),
      p.rack,
    );
    return {
      ...p,
      rack: {
        tileIds: rack.tileIds.filter((id) => !displacedTileIds.has(id)),
      },
    };
  }) as [Player, Player];

  return {
    success: true,
    state: createGameState({
      ...state,
      board,
      players: updatedPlayers,
      pendingMove: undefined,
    }),
  };
}
