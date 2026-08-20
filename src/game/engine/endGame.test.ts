import { describe, expect, it } from "vitest";
import { buildEngineTestGame } from "../testing/fixtures";
import { endGame } from "./endGame";
import { placeTile } from "./placeTile";

describe("endGame", () => {
  it("ends the game immediately with MANUALLY_ENDED, without requiring the standard end conditions", () => {
    const setup = buildEngineTestGame();

    const result = endGame(setup.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe("FINISHED");
    expect(result.state.turnState).toEqual({ type: "FINISHED" });
    if (result.state.status !== "FINISHED") return;
    expect(result.state.result.endReason).toBe("MANUALLY_ENDED");
  });

  it("can be called by the player who is not currently on turn", () => {
    const setup = buildEngineTestGame();

    const result = endGame(setup.state, setup.playerTwoId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe("FINISHED");
  });

  it("deducts each player's remaining rack points from their final score", () => {
    const setup = buildEngineTestGame();
    const playerOne = setup.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    const expectedDeduction = playerOne.rack.tileIds.reduce(
      (sum, tileId) => sum + setup.state.tiles[tileId].points,
      0,
    );

    const result = endGame(setup.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    if (result.state.status !== "FINISHED") return;
    expect(result.state.result.remainingRackDeductions[setup.playerOneId]).toBe(
      expectedDeduction,
    );
    expect(result.state.result.finalScores[setup.playerOneId]).toBe(
      playerOne.score - expectedDeduction,
    );
  });

  it("records a GAME_FINISHED history event", () => {
    const setup = buildEngineTestGame();

    const result = endGame(setup.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const lastEvent =
      result.state.history.events[result.state.history.events.length - 1];
    expect(lastEvent.type).toBe("GAME_FINISHED");
  });

  it("returns an in-progress placement to the rack first, counting it toward the deduction", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;
    const placed = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId,
      coordinate: setup.board.centreCoordinate,
    });
    expect(placed.success).toBe(true);
    if (!placed.success) return;

    const result = endGame(placed.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
    expect(result.state.board.occupiedCells).toHaveLength(0);
    if (result.state.status !== "FINISHED") return;
    const untouchedFullRackDeduction = setup.state.players
      .find((p) => p.id === setup.playerOneId)!
      .rack.tileIds.reduce(
        (sum, id) => sum + setup.state.tiles[id].points,
        0,
      );
    expect(
      result.state.result.remainingRackDeductions[setup.playerOneId],
    ).toBe(untouchedFullRackDeduction);
  });

  it("rejects ending an already-finished game", () => {
    const setup = buildEngineTestGame();
    const first = endGame(setup.state, setup.playerOneId);
    expect(first.success).toBe(true);
    if (!first.success) return;

    const second = endGame(first.state, setup.playerOneId);

    expect(second.success).toBe(false);
    if (second.success) return;
    expect(second.error.code).toBe("GAME_NOT_ACTIVE");
  });

  it("rejects a playerId that isn't one of this game's players", () => {
    const setup = buildEngineTestGame();
    const stranger = buildEngineTestGame().playerOneId;

    const result = endGame(setup.state, stranger);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_GAME_STATE");
  });
});
