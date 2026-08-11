import { createGameResult, type GameResult } from "../model/gameResult";
import type { GameState } from "../model/game";
import type { PlayerId } from "../model/ids";

export type GameEndCheckResult =
  | { readonly ended: false }
  | { readonly ended: true; readonly result: GameResult };

/**
 * Checks whether the game has ended (game-rules.md section 29): either the bag is empty and a
 * player has emptied their rack, or every player has passed in succession (one full round-trip
 * per player, i.e. `players.length * 2` consecutive passes — game-rules.md's own worked example
 * for two players is four passes in a row). The third documented condition, "no player can form
 * any legal move", is not proactively detected: doing so would require a full move-generator/
 * solver, which is out of scope for this milestone (see docs/decisions.md). In practice this is
 * not a dead end, since a player facing no legal move can always pass, and consecutive passes are
 * already detected here.
 */
export function checkGameEnd(state: GameState): GameEndCheckResult {
  const bagEmpty = state.tileBag.tileIds.length === 0;
  const aPlayerHasEmptyRack = state.players.some(
    (p) => p.rack.tileIds.length === 0,
  );

  if (bagEmpty && aPlayerHasEmptyRack) {
    return {
      ended: true,
      result: calculateFinalResult(state, "NO_TILES_AND_NO_MORE_PLAY"),
    };
  }

  if (state.consecutivePasses >= state.players.length * 2) {
    return {
      ended: true,
      result: calculateFinalResult(state, "CONSECUTIVE_PASSES"),
    };
  }

  return { ended: false };
}

/**
 * Final scoring per game-rules.md section 30: each player's remaining rack tiles are deducted
 * from their score. The highest final score wins; equal top scores are a tie.
 */
export function calculateFinalResult(
  state: GameState,
  endReason: GameResult["endReason"],
): GameResult {
  const remainingRackDeductions: Record<PlayerId, number> = {};
  const finalScores: Record<PlayerId, number> = {};

  for (const player of state.players) {
    const deduction = player.rack.tileIds.reduce(
      (sum, tileId) => sum + state.tiles[tileId].points,
      0,
    );
    remainingRackDeductions[player.id] = deduction;
    finalScores[player.id] = player.score - deduction;
  }

  const maxScore = Math.max(...state.players.map((p) => finalScores[p.id]));
  const playersAtMax = state.players.filter(
    (p) => finalScores[p.id] === maxScore,
  );
  const winnerPlayerIds = playersAtMax.length === 1 ? [playersAtMax[0].id] : [];

  return createGameResult(
    finalScores,
    winnerPlayerIds,
    remainingRackDeductions,
    endReason,
  );
}
