import { describe, expect, it } from "vitest";
import { createTileId } from "../model/ids";
import { buildEngineTestGame } from "../testing/fixtures";
import { moveRackTile, swapRackTiles } from "./reorderRack";

/** A game whose first player holds B, I, L, A, R, E, N in that order. */
function game() {
  const setup = buildEngineTestGame();
  return {
    setup,
    rack: setup.state.players[0].rack.tileIds,
    lettersOf: (state: typeof setup.state) =>
      state.players[0].rack.tileIds
        .map((id) => {
          const tile = state.tiles[id];
          return tile.kind === "LETTER" ? tile.letter : "_";
        })
        .join(""),
  };
}

describe("moveRackTile", () => {
  it("moves a tile later in the rack, sliding the tiles it passes", () => {
    const { setup, rack, lettersOf } = game();
    expect(lettersOf(setup.state)).toBe("BILAREN");

    const result = moveRackTile(setup.state, {
      playerId: setup.playerOneId,
      tileId: rack[0],
      toIndex: 3,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(lettersOf(result.state)).toBe("ILABREN");
  });

  it("moves a tile earlier in the rack", () => {
    const { setup, rack, lettersOf } = game();

    const result = moveRackTile(setup.state, {
      playerId: setup.playerOneId,
      tileId: rack[4],
      toIndex: 1,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(lettersOf(result.state)).toBe("BRILAEN");
  });

  it("treats a drop past the end as 'put it last' rather than an error", () => {
    const { setup, rack, lettersOf } = game();

    const result = moveRackTile(setup.state, {
      playerId: setup.playerOneId,
      tileId: rack[0],
      toIndex: 99,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(lettersOf(result.state)).toBe("ILARENB");
  });

  it("keeps exactly the same tiles, only their order", () => {
    const { setup, rack } = game();

    const result = moveRackTile(setup.state, {
      playerId: setup.playerOneId,
      tileId: rack[5],
      toIndex: 0,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const after = result.state.players[0].rack.tileIds;
    expect([...after].sort()).toEqual([...rack].sort());
    expect(after).toHaveLength(rack.length);
  });

  it("rejects a tile the player is not holding", () => {
    const { setup } = game();

    const result = moveRackTile(setup.state, {
      playerId: setup.playerOneId,
      tileId: createTileId(),
      toIndex: 0,
    });

    expect(result).toEqual({
      success: false,
      error: { code: "TILE_NOT_IN_RACK", messageKey: "tileNotInRack" },
    });
  });
});

describe("swapRackTiles", () => {
  it("exchanges two tiles and leaves the rest where they are", () => {
    const { setup, rack, lettersOf } = game();

    const result = swapRackTiles(setup.state, {
      playerId: setup.playerOneId,
      firstTileId: rack[0],
      secondTileId: rack[4],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(lettersOf(result.state)).toBe("RILABEN");
  });

  it("is its own inverse", () => {
    const { setup, rack, lettersOf } = game();

    const once = swapRackTiles(setup.state, {
      playerId: setup.playerOneId,
      firstTileId: rack[1],
      secondTileId: rack[6],
    });
    expect(once.success).toBe(true);
    if (!once.success) return;
    const twice = swapRackTiles(once.state, {
      playerId: setup.playerOneId,
      firstTileId: rack[1],
      secondTileId: rack[6],
    });

    expect(twice.success).toBe(true);
    if (!twice.success) return;
    expect(lettersOf(twice.state)).toBe("BILAREN");
  });

  it("rejects a tile the player is not holding", () => {
    const { setup, rack } = game();

    const result = swapRackTiles(setup.state, {
      playerId: setup.playerOneId,
      firstTileId: rack[0],
      secondTileId: createTileId(),
    });

    expect(result).toEqual({
      success: false,
      error: { code: "TILE_NOT_IN_RACK", messageKey: "tileNotInRack" },
    });
  });
});
