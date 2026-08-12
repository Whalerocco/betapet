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
 * (local-multiplayer.md section 42) rather than requiring one REMOVE_TILE per tile. Committed
 * board tiles are never touched — this only ever affects the current, still-editable pending
 * move.
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

  const updatedPlayers = state.players.map((p) =>
    p.id === params.playerId
      ? {
          ...p,
          rack: pendingMove.placedTiles.reduce(
            (rack, placed) => addTileToRack(rack, placed.tileId),
            p.rack,
          ),
        }
      : p,
  ) as [Player, Player];

  return {
    success: true,
    state: createGameState({
      ...state,
      players: updatedPlayers,
      pendingMove: undefined,
    }),
  };
}
