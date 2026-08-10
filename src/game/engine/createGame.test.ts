import { describe, expect, it } from "vitest";
import { createLetterTile } from "../model/tile";
import { createTileId, createPlayerId } from "../model/ids";
import { createTileBag } from "../model/tileBag";
import { createGame, determineStartingPlayer } from "./createGame";

describe("determineStartingPlayer", () => {
  it("starts the player who drew the higher-value tile", () => {
    const playerOneId = createPlayerId();
    const playerTwoId = createPlayerId();
    const lowTileId = createTileId();
    const highTileId = createTileId();
    const tiles = {
      [lowTileId]: createLetterTile(lowTileId, "A", 1),
      [highTileId]: createLetterTile(highTileId, "B", 4),
    };
    const bag = createTileBag([lowTileId, highTileId]);

    const result = determineStartingPlayer(
      bag,
      tiles,
      playerOneId,
      playerTwoId,
    );

    expect(result.startingPlayerId).toBe(playerTwoId);
  });

  it("returns both drawn tiles to the bag", () => {
    const playerOneId = createPlayerId();
    const playerTwoId = createPlayerId();
    const lowTileId = createTileId();
    const highTileId = createTileId();
    const tiles = {
      [lowTileId]: createLetterTile(lowTileId, "A", 1),
      [highTileId]: createLetterTile(highTileId, "B", 4),
    };
    const bag = createTileBag([lowTileId, highTileId]);

    const result = determineStartingPlayer(
      bag,
      tiles,
      playerOneId,
      playerTwoId,
    );

    expect(result.bag.tileIds).toHaveLength(2);
    expect(new Set(result.bag.tileIds)).toEqual(
      new Set([lowTileId, highTileId]),
    );
  });

  it("re-draws on a tie until a unique winner emerges", () => {
    const playerOneId = createPlayerId();
    const playerTwoId = createPlayerId();
    const tieA1 = createTileId();
    const tieA2 = createTileId();
    const decisiveHigh = createTileId();
    const decisiveLow = createTileId();
    const tiles = {
      [tieA1]: createLetterTile(tieA1, "A", 1),
      [tieA2]: createLetterTile(tieA2, "A", 1),
      [decisiveHigh]: createLetterTile(decisiveHigh, "B", 4),
      [decisiveLow]: createLetterTile(decisiveLow, "C", 1),
    };
    // First draw (tieA1, tieA2) ties; they go to the back and the next draw is decisive.
    const bag = createTileBag([tieA1, tieA2, decisiveHigh, decisiveLow]);

    const result = determineStartingPlayer(
      bag,
      tiles,
      playerOneId,
      playerTwoId,
    );

    expect(result.startingPlayerId).toBe(playerOneId);
    expect(new Set(result.bag.tileIds)).toEqual(
      new Set([tieA1, tieA2, decisiveHigh, decisiveLow]),
    );
  });
});

describe("createGame", () => {
  it("produces a valid, active two-player game", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
    });
    expect(state.status).toBe("ACTIVE");
    expect(state.players.map((p) => p.name)).toEqual(["Alice", "Bob"]);
  });

  it("gives each player a full rack", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
    });
    expect(state.players[0].rack.tileIds).toHaveLength(7);
    expect(state.players[1].rack.tileIds).toHaveLength(7);
  });

  it("leaves the bag with the remaining tiles after both racks and the starting draw", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
    });
    // 100 total - 7 - 7; the two starting-determination tiles are returned to the bag.
    expect(state.tileBag.tileIds).toHaveLength(100 - 14);
  });

  it("sets currentPlayerId and turnState to the same starting player", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 6,
    });
    expect(state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: state.currentPlayerId,
    });
    expect(state.players.some((p) => p.id === state.currentPlayerId)).toBe(
      true,
    );
  });

  it("records a single GAME_STARTED history event", () => {
    const state = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 6,
    });
    expect(state.history.events).toHaveLength(1);
    expect(state.history.events[0].type).toBe("GAME_STARTED");
  });

  it("produces the same rack contents for the same deterministic random source", () => {
    const randomSource = () => 0.42;
    const stateA = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
      randomSource,
    });
    const stateB = createGame({
      playerOneName: "Alice",
      playerTwoName: "Bob",
      rackSize: 7,
      randomSource,
    });

    const lettersOf = (state: typeof stateA, playerIndex: 0 | 1) =>
      state.players[playerIndex].rack.tileIds
        .map((id) => state.tiles[id])
        .map((tile) => (tile.kind === "LETTER" ? tile.letter : "BLANK"))
        .sort();

    expect(lettersOf(stateA, 0)).toEqual(lettersOf(stateB, 0));
    expect(lettersOf(stateA, 1)).toEqual(lettersOf(stateB, 1));
  });
});
