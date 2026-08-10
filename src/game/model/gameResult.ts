import type { PlayerId } from "./ids";

export type EndReason =
  "NO_TILES_AND_NO_MORE_PLAY" | "CONSECUTIVE_PASSES" | "NO_PLAYER_CAN_PLAY";

export interface GameResult {
  readonly finalScores: Readonly<Record<PlayerId, number>>;
  /** Empty array represents a tie between all players with the highest final score. */
  readonly winnerPlayerIds: readonly PlayerId[];
  readonly remainingRackDeductions: Readonly<Record<PlayerId, number>>;
  readonly endReason: EndReason;
}

export function createGameResult(
  finalScores: Readonly<Record<PlayerId, number>>,
  winnerPlayerIds: readonly PlayerId[],
  remainingRackDeductions: Readonly<Record<PlayerId, number>>,
  endReason: EndReason,
): GameResult {
  for (const winnerId of winnerPlayerIds) {
    if (!(winnerId in finalScores)) {
      throw new Error(`Winner ${winnerId} is not among the final scores`);
    }
  }
  return { finalScores, winnerPlayerIds, remainingRackDeductions, endReason };
}
