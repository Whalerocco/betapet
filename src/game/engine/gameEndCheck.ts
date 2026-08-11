import { createGameResult, type GameResult } from "../model/gameResult";
import type { GameState } from "../model/game";
import type { PlayerId } from "../model/ids";

export type GameEndCheckResult =
  | { readonly ended: false }
  | { readonly ended: true; readonly result: GameResult };

/**
 * Checks whether the game has ended (game-rules.md section 29). Currently checks only the
 * "no tiles left and a player has nothing left to play" condition (the standard convention
 * across this game family: the bag is empty and at least one player has emptied their rack) —
 * the consecutive-pass and no-player-can-play conditions are added once pass/exchange exist
 * (roadmap.md Milestone 2.6).
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
