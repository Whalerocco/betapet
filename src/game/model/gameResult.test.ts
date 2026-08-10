import { describe, expect, it } from "vitest";
import { createPlayerId } from "./ids";
import { createGameResult } from "./gameResult";

describe("createGameResult", () => {
  it("creates a result with a single winner", () => {
    const playerA = createPlayerId();
    const playerB = createPlayerId();
    const result = createGameResult(
      { [playerA]: 120, [playerB]: 98 },
      [playerA],
      { [playerA]: 0, [playerB]: -6 },
      "NO_TILES_AND_NO_MORE_PLAY",
    );
    expect(result.winnerPlayerIds).toEqual([playerA]);
  });

  it("represents a tie with no winners", () => {
    const playerA = createPlayerId();
    const playerB = createPlayerId();
    const result = createGameResult(
      { [playerA]: 100, [playerB]: 100 },
      [],
      { [playerA]: 0, [playerB]: 0 },
      "CONSECUTIVE_PASSES",
    );
    expect(result.winnerPlayerIds).toEqual([]);
  });

  it("rejects a winner who has no final score", () => {
    const playerA = createPlayerId();
    const strangerId = createPlayerId();
    expect(() =>
      createGameResult(
        { [playerA]: 50 },
        [strangerId],
        { [playerA]: 0 },
        "NO_PLAYER_CAN_PLAY",
      ),
    ).toThrow();
  });
});
