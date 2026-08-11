import type { GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, type PlayerId, type TileId } from "../model/ids";
import type { Player } from "../model/player";
import { drawTiles, shuffleTileBag, type RandomSource } from "../model/tileBag";
import { playerTurn } from "../model/turnState";
import { checkNoPendingMovePreconditions } from "./actionPreconditions";
import { finalizeTurn } from "./finalizeTurn";
import { actionFailure, type ActionResult } from "./gameError";

export interface ExchangeTilesParams {
  readonly playerId: PlayerId;
  readonly tileIds: readonly TileId[];
}

/**
 * A player exchanges one or more rack tiles for fresh ones instead of playing a word
 * (game-rules.md section 26, game-engine.md section 26): the selected tiles return to the bag,
 * the bag is shuffled, and the player draws the same number of replacements. Counts as the
 * player's turn (does not increment consecutivePasses; only a genuine pass does — see DEC-006
 * in docs/decisions.md for the minimum-bag-size rule enforced below).
 */
export function exchangeTiles(
  state: GameState,
  params: ExchangeTilesParams,
  randomSource?: RandomSource,
): ActionResult {
  const precondition = checkNoPendingMovePreconditions(state, params.playerId);
  if (precondition) return { success: false, error: precondition };

  if (params.tileIds.length === 0) {
    return actionFailure("INVALID_TILE", "noTilesSelectedForExchange");
  }
  const uniqueTileIds = new Set(params.tileIds);
  if (uniqueTileIds.size !== params.tileIds.length) {
    return actionFailure("INVALID_TILE", "duplicateTileInExchange");
  }

  const player = state.players.find((p) => p.id === params.playerId)!;
  const rackSet = new Set(player.rack.tileIds);
  if (!params.tileIds.every((id) => rackSet.has(id))) {
    return actionFailure("TILE_NOT_IN_RACK", "tileNotInRack");
  }

  if (state.tileBag.tileIds.length < params.tileIds.length) {
    return actionFailure("EXCHANGE_NOT_ALLOWED", "notEnoughTilesToExchange");
  }

  const exchangedSet = new Set(params.tileIds);
  const remainingRack = player.rack.tileIds.filter(
    (id) => !exchangedSet.has(id),
  );
  const bagWithReturnedTiles = shuffleTileBag(
    { tileIds: [...state.tileBag.tileIds, ...params.tileIds] },
    randomSource,
  );
  const draw = drawTiles(bagWithReturnedTiles, params.tileIds.length);

  const updatedPlayer: Player = {
    ...player,
    rack: { tileIds: [...remainingRack, ...draw.drawn] },
  };
  const players = state.players.map((p) =>
    p.id === params.playerId ? updatedPlayer : p,
  ) as [Player, Player];

  const history = addHistoryEvent(state.history, {
    id: createHistoryEventId(),
    sequence: nextSequence(state.history),
    type: "TILES_EXCHANGED",
    playerId: params.playerId,
    payload: { tileCount: params.tileIds.length },
  });

  const otherPlayer = players.find((p) => p.id !== params.playerId)!;

  const activeState: GameState = {
    ...state,
    tileBag: draw.bag,
    players,
    history,
    consecutivePasses: 0,
    currentPlayerId: otherPlayer.id,
    turnState: playerTurn(otherPlayer.id),
  };

  return { success: true, state: finalizeTurn(activeState) };
}
