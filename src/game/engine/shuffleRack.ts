import { createGameState, type GameState } from "../model/game";
import type { PlayerId } from "../model/ids";
import type { Player } from "../model/player";
import type { RandomSource } from "../model/tileBag";
import { checkEditPreconditions } from "./actionPreconditions";
import type { ActionResult } from "./gameError";

/**
 * Reorders the display order of a player's own rack tiles. This is a presentation convenience,
 * not a game rule (tile identity, count, and content are unchanged) — architecture.md section
 * 24 would normally keep this purely client-side, but rack order lives in GameState
 * (`player.rack.tileIds`), so shuffling through the engine keeps a single source of truth and
 * makes the new order persist across renders and a saved-game refresh, matching every other
 * rack-affecting action. Does not consume a turn or touch history: it never changes who holds
 * which tiles or whose turn it is.
 */
export function shuffleRack(
  state: GameState,
  playerId: PlayerId,
  randomSource: RandomSource = Math.random,
): ActionResult {
  const precondition = checkEditPreconditions(state, playerId);
  if (precondition) return { success: false, error: precondition };

  const player = state.players.find((p) => p.id === playerId)!;
  const shuffled = [...player.rack.tileIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(randomSource() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const updatedPlayer: Player = { ...player, rack: { tileIds: shuffled } };
  const players = state.players.map((p) =>
    p.id === playerId ? updatedPlayer : p,
  ) as [Player, Player];

  return { success: true, state: createGameState({ ...state, players }) };
}
