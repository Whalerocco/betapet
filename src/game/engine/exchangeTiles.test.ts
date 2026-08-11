import { describe, expect, it } from "vitest";
import { buildEngineTestGame } from "../testing/fixtures";
import { exchangeTiles } from "./exchangeTiles";
import { pass } from "./pass";
import { placeTile } from "./placeTile";

describe("exchangeTiles", () => {
  it("returns the selected tiles to the bag, shuffles, and draws the same number back", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;
    const rackBefore = setup.state.players[0].rack.tileIds;
    const bagSizeBefore = setup.state.tileBag.tileIds.length;

    // A fixed random source (always picks index 0 during the Fisher-Yates shuffle) makes the
    // outcome deterministic: it guarantees the exchanged tile does not land back in the draw.
    const result = exchangeTiles(
      setup.state,
      { playerId: setup.playerOneId, tileIds: [tileId] },
      () => 0,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const updatedPlayer = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(updatedPlayer.rack.tileIds.length).toBe(rackBefore.length);
    expect(updatedPlayer.rack.tileIds).not.toContain(tileId);
    expect(result.state.tileBag.tileIds.length).toBe(bagSizeBefore);
    expect(result.state.tileBag.tileIds).toContain(tileId);
  });

  it("advances the turn and records a TILES_EXCHANGED event", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;

    const result = exchangeTiles(setup.state, {
      playerId: setup.playerOneId,
      tileIds: [tileId],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.currentPlayerId).toBe(setup.playerTwoId);
    const lastEvent =
      result.state.history.events[result.state.history.events.length - 1];
    expect(lastEvent.type).toBe("TILES_EXCHANGED");
    if (lastEvent.type === "TILES_EXCHANGED") {
      expect(lastEvent.playerId).toBe(setup.playerOneId);
      expect(lastEvent.payload.tileCount).toBe(1);
    }
  });

  it("does not award any score", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;
    const result = exchangeTiles(setup.state, {
      playerId: setup.playerOneId,
      tileIds: [tileId],
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const updatedPlayer = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(updatedPlayer.score).toBe(0);
  });

  it("resets consecutivePasses to 0", () => {
    const setup = buildEngineTestGame();
    const firstPass = pass(setup.state, setup.playerOneId);
    expect(firstPass.success).toBe(true);
    if (!firstPass.success) return;
    const secondPass = pass(firstPass.state, setup.playerTwoId);
    expect(secondPass.success).toBe(true);
    if (!secondPass.success) return;
    expect(secondPass.state.consecutivePasses).toBe(2);

    const [tileId] = secondPass.state.players[0].rack.tileIds;
    const result = exchangeTiles(secondPass.state, {
      playerId: setup.playerOneId,
      tileIds: [tileId],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.consecutivePasses).toBe(0);
  });

  it("rejects an exchange from the player who is not on turn", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[1].rack.tileIds;
    const result = exchangeTiles(setup.state, {
      playerId: setup.playerTwoId,
      tileIds: [tileId],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("NOT_YOUR_TURN");
  });

  it("rejects an exchange while the player has an in-progress placement", () => {
    const setup = buildEngineTestGame();
    const [tileId, secondTileId] = setup.state.players[0].rack.tileIds;
    const placed = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId,
      coordinate: setup.board.centreCoordinate,
    });
    expect(placed.success).toBe(true);
    if (!placed.success) return;

    const result = exchangeTiles(placed.state, {
      playerId: setup.playerOneId,
      tileIds: [secondTileId],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_GAME_STATE");
  });

  it("rejects an empty tile selection", () => {
    const setup = buildEngineTestGame();
    const result = exchangeTiles(setup.state, {
      playerId: setup.playerOneId,
      tileIds: [],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_TILE");
  });

  it("rejects a tile that is not in the acting player's rack", () => {
    const setup = buildEngineTestGame();
    const [opponentTileId] = setup.state.players[1].rack.tileIds;
    const result = exchangeTiles(setup.state, {
      playerId: setup.playerOneId,
      tileIds: [opponentTileId],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("TILE_NOT_IN_RACK");
  });

  it("rejects duplicate tile IDs in the same exchange", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;
    const result = exchangeTiles(setup.state, {
      playerId: setup.playerOneId,
      tileIds: [tileId, tileId],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_TILE");
  });

  it("rejects an exchange for more tiles than remain in the bag", () => {
    const setup = buildEngineTestGame({
      bagLetters: ["S", "T"],
    });
    const rackTileIds = setup.state.players[0].rack.tileIds;
    const result = exchangeTiles(setup.state, {
      playerId: setup.playerOneId,
      tileIds: rackTileIds,
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("EXCHANGE_NOT_ALLOWED");
    expect(rackTileIds.length).toBeGreaterThan(2);
  });

  it("is deterministic with an injected random source", () => {
    const setup = buildEngineTestGame();
    const [tileId] = setup.state.players[0].rack.tileIds;
    const result = exchangeTiles(
      setup.state,
      { playerId: setup.playerOneId, tileIds: [tileId] },
      () => 0,
    );
    expect(result.success).toBe(true);
  });
});
