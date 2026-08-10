import { describe, expect, it } from "vitest";
import { createGameState } from "./game";
import { createPlayerId, createTileId } from "./ids";
import { createPendingMove } from "./pendingMove";
import { placeCommittedTile } from "./board";
import { createTestGame, withTileInRack } from "../testing/fixtures";

describe("createGameState", () => {
  it("accepts a well-formed game state", () => {
    const { state } = createTestGame();
    expect(() => createGameState(state)).not.toThrow();
  });

  it("can be created, inspected, and serialized as plain data", () => {
    const { state } = createTestGame();
    const json = JSON.stringify(state);
    const restored = JSON.parse(json);
    expect(restored.status).toBe("ACTIVE");
    expect(restored.players).toHaveLength(2);
  });

  it("rejects duplicate player IDs", () => {
    const { state, playerOneId } = createTestGame();
    const [playerOne, playerTwo] = state.players;
    const brokenState = {
      ...state,
      players: [playerOne, { ...playerTwo, id: playerOneId }] as const,
    };
    expect(() => createGameState(brokenState)).toThrow(/unique/);
  });

  it("rejects a tile that exists in two locations at once", () => {
    const { state, playerOneId } = createTestGame();
    const strayTileId = state.tileBag.tileIds[0];
    // Same tile referenced by both the bag (already there) and player one's rack.
    const [playerOne, playerTwo] = state.players;
    const brokenState = {
      ...state,
      players: [
        { ...playerOne, rack: { tileIds: [strayTileId] } },
        playerTwo,
      ] as const,
    };
    expect(() => createGameState(brokenState)).toThrow(
      /more than one location/,
    );
    void playerOneId;
  });

  it("rejects a tile referenced but missing from the tile registry", () => {
    const { state } = createTestGame();
    const unregisteredTileId = createTileId();
    const brokenState = {
      ...state,
      tileBag: { tileIds: [...state.tileBag.tileIds, unregisteredTileId] },
    };
    expect(() => createGameState(brokenState)).toThrow(
      /not present in state.tiles/,
    );
  });

  it("rejects a committed board cell with more than one tile", () => {
    const { state } = createTestGame();
    const [tileIdA, tileIdB] = state.tileBag.tileIds;
    const tileBag = { tileIds: state.tileBag.tileIds.slice(2) };
    const board = placeCommittedTile(
      state.board,
      { row: 0, column: 0 },
      tileIdA,
    );
    const brokenState = {
      ...state,
      tileBag,
      board: {
        occupiedCells: [
          ...board.occupiedCells,
          { coordinate: { row: 0, column: 0 }, tileId: tileIdB },
        ],
      },
    };
    expect(() => createGameState(brokenState)).toThrow(
      /more than one committed tile/,
    );
  });

  it("allows only a single pending move, enforced by the type shape", () => {
    const { state, playerOneId } = createTestGame();
    const [tileId, ...remainingBag] = state.tileBag.tileIds;
    const withPending = {
      ...state,
      tileBag: { tileIds: remainingBag },
      pendingMove: createPendingMove(playerOneId, [
        { tileId, coordinate: { row: 1, column: 1 } },
      ]),
    };
    // GameState.pendingMove is a single optional field, not a collection: there is no way to
    // represent two simultaneous pending moves without violating the TypeScript type itself.
    expect(withPending.pendingMove).toBeDefined();
    expect(() => createGameState(withPending)).not.toThrow();
  });

  it("rejects a pending move for a player outside the game", () => {
    const { state } = createTestGame();
    const [tileId, ...remainingBag] = state.tileBag.tileIds;
    const brokenState = {
      ...state,
      tileBag: { tileIds: remainingBag },
      pendingMove: createPendingMove(createPlayerId(), [
        { tileId, coordinate: { row: 1, column: 1 } },
      ]),
    };
    expect(() => createGameState(brokenState)).toThrow(
      /must belong to one of the game's players/,
    );
  });

  it("rejects duplicate accepted vocabulary entries", () => {
    const { state } = createTestGame();
    const brokenState = { ...state, acceptedVocabulary: ["GRÖMP", "GRÖMP"] };
    expect(() => createGameState(brokenState)).toThrow(/duplicate/);
  });

  it("requires an ACTIVE game to omit a result", () => {
    const { state } = createTestGame();
    expect(state.status).toBe("ACTIVE");
    // @ts-expect-error an ACTIVE game must not carry a result field
    const _invalid: typeof state = { ...state, result: {} };
    void _invalid;
  });

  it("moves a tile from the bag into a player's rack", () => {
    const game = createTestGame();
    const tileId = game.state.tileBag.tileIds[0];
    const withTile = withTileInRack(game, game.playerOneId, tileId);
    const player = withTile.state.players.find(
      (p) => p.id === game.playerOneId,
    )!;
    expect(player.rack.tileIds).toContain(tileId);
    expect(withTile.state.tileBag.tileIds).not.toContain(tileId);
    expect(() => createGameState(withTile.state)).not.toThrow();
  });
});
