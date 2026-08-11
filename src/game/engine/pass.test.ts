import { describe, expect, it } from "vitest";
import { buildEngineTestGame } from "../testing/fixtures";
import { pass } from "./pass";
import { placeTile } from "./placeTile";

describe("pass", () => {
  it("advances the turn to the other player and records a PASS event", () => {
    const setup = buildEngineTestGame();
    const result = pass(setup.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.currentPlayerId).toBe(setup.playerTwoId);
    expect(result.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerTwoId,
    });
    expect(result.state.consecutivePasses).toBe(1);
    const lastEvent =
      result.state.history.events[result.state.history.events.length - 1];
    expect(lastEvent.type).toBe("PASS");
    if (lastEvent.type === "PASS") {
      expect(lastEvent.playerId).toBe(setup.playerOneId);
    }
  });

  it("does not change scores, racks, or the tile bag", () => {
    const setup = buildEngineTestGame();
    const result = pass(setup.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.players).toEqual(setup.state.players);
    expect(result.state.tileBag).toEqual(setup.state.tileBag);
  });

  it("rejects a pass from the player who is not on turn", () => {
    const setup = buildEngineTestGame();
    const result = pass(setup.state, setup.playerTwoId);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("NOT_YOUR_TURN");
  });

  it("rejects a pass while the player has an in-progress placement", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;
    const placed = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId,
      coordinate: setup.board.centreCoordinate,
    });
    expect(placed.success).toBe(true);
    if (!placed.success) return;

    const result = pass(placed.state, setup.playerOneId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_GAME_STATE");
  });

  it("rejects a pass once the game has finished", () => {
    const setup = buildEngineTestGame();
    const firstPass = pass(setup.state, setup.playerOneId);
    expect(firstPass.success).toBe(true);
    if (!firstPass.success) return;
    const secondPass = pass(firstPass.state, setup.playerTwoId);
    expect(secondPass.success).toBe(true);
    if (!secondPass.success) return;
    const thirdPass = pass(secondPass.state, setup.playerOneId);
    expect(thirdPass.success).toBe(true);
    if (!thirdPass.success) return;
    const fourthPass = pass(thirdPass.state, setup.playerTwoId);
    expect(fourthPass.success).toBe(true);
    if (!fourthPass.success) return;

    expect(fourthPass.state.status).toBe("FINISHED");

    const fifthPass = pass(fourthPass.state, setup.playerOneId);
    expect(fifthPass.success).toBe(false);
    if (fifthPass.success) return;
    expect(fifthPass.error.code).toBe("GAME_NOT_ACTIVE");
  });

  it("ends the game after four consecutive passes with CONSECUTIVE_PASSES as the reason", () => {
    const setup = buildEngineTestGame();
    let state = setup.state;
    const players = [setup.playerOneId, setup.playerTwoId];
    for (let i = 0; i < 4; i++) {
      const result = pass(state, players[i % 2]);
      expect(result.success).toBe(true);
      if (!result.success) return;
      state = result.state;
    }

    expect(state.status).toBe("FINISHED");
    if (state.status !== "FINISHED") return;
    expect(state.result.endReason).toBe("CONSECUTIVE_PASSES");
    expect(state.turnState).toEqual({ type: "FINISHED" });
  });

  it("deducts each player's remaining rack points from their final score on consecutive-pass end", () => {
    const setup = buildEngineTestGame();
    let state = setup.state;
    const players = [setup.playerOneId, setup.playerTwoId];
    for (let i = 0; i < 4; i++) {
      const result = pass(state, players[i % 2]);
      expect(result.success).toBe(true);
      if (!result.success) return;
      state = result.state;
    }

    expect(state.status).toBe("FINISHED");
    if (state.status !== "FINISHED") return;
    for (const player of state.players) {
      const rackPoints = player.rack.tileIds.reduce(
        (sum, id) => sum + state.tiles[id].points,
        0,
      );
      expect(state.result.remainingRackDeductions[player.id]).toBe(rackPoints);
      expect(state.result.finalScores[player.id]).toBe(
        player.score - rackPoints,
      );
    }
  });
});
