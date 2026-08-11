import { describe, expect, it } from "vitest";
import { buildEngineTestGame } from "../testing/fixtures";
import { placeTile } from "./placeTile";
import { shuffleRack } from "./shuffleRack";

describe("shuffleRack", () => {
  it("reorders the rack without changing which tiles it contains", () => {
    const setup = buildEngineTestGame();
    const before = setup.state.players[0].rack.tileIds;

    const result = shuffleRack(setup.state, setup.playerOneId, () => 0.999);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const after = result.state.players[0].rack.tileIds;
    expect(after).toHaveLength(before.length);
    expect(new Set(after)).toEqual(new Set(before));
  });

  it("does not touch turn ownership, score, tile bag, or history", () => {
    const setup = buildEngineTestGame();

    const result = shuffleRack(setup.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.currentPlayerId).toBe(setup.state.currentPlayerId);
    expect(result.state.turnState).toEqual(setup.state.turnState);
    expect(result.state.tileBag).toEqual(setup.state.tileBag);
    expect(result.state.history).toEqual(setup.state.history);
    expect(result.state.players[0].score).toBe(0);
  });

  it("leaves the opponent's rack untouched", () => {
    const setup = buildEngineTestGame();
    const result = shuffleRack(setup.state, setup.playerOneId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.players[1]).toEqual(setup.state.players[1]);
  });

  it("is deterministic given the same random source", () => {
    const setup = buildEngineTestGame();
    const first = shuffleRack(setup.state, setup.playerOneId, () => 0.5);
    const second = shuffleRack(setup.state, setup.playerOneId, () => 0.5);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    if (!first.success || !second.success) return;
    expect(first.state.players[0].rack.tileIds).toEqual(
      second.state.players[0].rack.tileIds,
    );
  });

  it("is allowed even with an in-progress pending placement", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;
    const placed = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId,
      coordinate: setup.board.centreCoordinate,
    });
    expect(placed.success).toBe(true);
    if (!placed.success) return;

    const result = shuffleRack(placed.state, setup.playerOneId);
    expect(result.success).toBe(true);
  });

  it("rejects a shuffle from the player who is not on turn", () => {
    const setup = buildEngineTestGame();
    const result = shuffleRack(setup.state, setup.playerTwoId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("NOT_YOUR_TURN");
  });

  it("rejects a shuffle once the game has finished", () => {
    const setup = buildEngineTestGame();
    const finishedState = {
      ...setup.state,
      status: "FINISHED" as const,
      turnState: { type: "FINISHED" as const },
      result: {
        finalScores: {},
        winnerPlayerIds: [],
        remainingRackDeductions: {},
        endReason: "CONSECUTIVE_PASSES" as const,
      },
    };
    const result = shuffleRack(finishedState, setup.playerOneId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("GAME_NOT_ACTIVE");
  });
});
