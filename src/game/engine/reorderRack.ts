import { createGameState, type GameState } from "../model/game";
import type { PlayerId, TileId } from "../model/ids";
import type { Player } from "../model/player";
import { checkEditPreconditions } from "./actionPreconditions";
import { actionFailure, type ActionResult } from "./gameError";

/**
 * Rearranging your own rack is a presentation convenience rather than a game rule — the tiles you
 * hold are unchanged either way — but rack order lives in `GameState` (`player.rack.tileIds`), so
 * it goes through the engine for the same reason `shuffleRack` does: one source of truth, and an
 * order that survives a re-render and a saved-game refresh. Neither action consumes a turn or
 * touches history.
 */

/** Moves one rack tile to a new position, sliding the tiles it passes over. */
export function moveRackTile(
  state: GameState,
  params: {
    readonly playerId: PlayerId;
    readonly tileId: TileId;
    /** Position in the rack the tile should end up at, counted after it has been lifted out. */
    readonly toIndex: number;
  },
): ActionResult {
  const precondition = checkEditPreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  const player = state.players.find((p) => p.id === params.playerId)!;
  const fromIndex = player.rack.tileIds.indexOf(params.tileId);
  if (fromIndex === -1) {
    return actionFailure("TILE_NOT_IN_RACK", "tileNotInRack");
  }

  const withoutTile = player.rack.tileIds.filter((id) => id !== params.tileId);
  // Clamped rather than rejected: a drop past the last tile is an ordinary "put it at the end",
  // not a mistake the player should see an error about.
  const target = Math.min(Math.max(params.toIndex, 0), withoutTile.length);
  const tileIds = [
    ...withoutTile.slice(0, target),
    params.tileId,
    ...withoutTile.slice(target),
  ];

  return { success: true, state: withRack(state, params.playerId, tileIds) };
}

/** Exchanges the positions of two rack tiles, leaving every other tile where it is. */
export function swapRackTiles(
  state: GameState,
  params: {
    readonly playerId: PlayerId;
    readonly firstTileId: TileId;
    readonly secondTileId: TileId;
  },
): ActionResult {
  const precondition = checkEditPreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  const player = state.players.find((p) => p.id === params.playerId)!;
  const firstIndex = player.rack.tileIds.indexOf(params.firstTileId);
  const secondIndex = player.rack.tileIds.indexOf(params.secondTileId);
  if (firstIndex === -1 || secondIndex === -1) {
    return actionFailure("TILE_NOT_IN_RACK", "tileNotInRack");
  }

  const tileIds = [...player.rack.tileIds];
  tileIds[firstIndex] = params.secondTileId;
  tileIds[secondIndex] = params.firstTileId;

  return { success: true, state: withRack(state, params.playerId, tileIds) };
}

function withRack(
  state: GameState,
  playerId: PlayerId,
  tileIds: readonly TileId[],
): GameState {
  const players = state.players.map((p) =>
    p.id === playerId ? { ...p, rack: { tileIds } } : p,
  ) as [Player, Player];
  return createGameState({ ...state, players });
}
