import { describe, expect, it } from "vitest";
import { createPlayerId, createTileId } from "./ids";
import { addTileToRack, createPlayer, removeTileFromRack } from "./player";

describe("createPlayer", () => {
  it("creates a player with an empty rack and zero score", () => {
    const player = createPlayer(createPlayerId(), "August");
    expect(player.name).toBe("August");
    expect(player.rack.tileIds).toEqual([]);
    expect(player.score).toBe(0);
  });

  it("rejects an empty display name", () => {
    expect(() => createPlayer(createPlayerId(), "  ")).toThrow();
  });

  it("does not derive identity from the display name", () => {
    const idA = createPlayerId();
    const idB = createPlayerId();
    const playerA = createPlayer(idA, "August");
    const playerB = createPlayer(idB, "August");
    expect(playerA.id).not.toBe(playerB.id);
  });
});

describe("rack operations", () => {
  it("adds a tile to the rack", () => {
    const player = createPlayer(createPlayerId(), "August");
    const tileId = createTileId();
    const rack = addTileToRack(player.rack, tileId);
    expect(rack.tileIds).toContain(tileId);
  });

  it("rejects adding the same tile twice", () => {
    const tileId = createTileId();
    const rack = addTileToRack({ tileIds: [] }, tileId);
    expect(() => addTileToRack(rack, tileId)).toThrow();
  });

  it("removes a tile from the rack", () => {
    const tileId = createTileId();
    const rack = addTileToRack({ tileIds: [] }, tileId);
    const updated = removeTileFromRack(rack, tileId);
    expect(updated.tileIds).not.toContain(tileId);
  });

  it("rejects removing a tile that is not present", () => {
    expect(() => removeTileFromRack({ tileIds: [] }, createTileId())).toThrow();
  });
});
