import { describe, expect, it } from "vitest";
import { createSwedishWordClassificationRules } from "../dictionary/swedishWordClassificationRules";
import { pass } from "../engine/pass";
import { placeTile } from "../engine/placeTile";
import { submitMove } from "../engine/submitMove";
import { buildEngineTestGame } from "../testing/fixtures";
import {
  deserializeGameState,
  parseGameState,
  serializeGameState,
} from "./serialization";
import type { GameState } from "./game";

const rules = createSwedishWordClassificationRules();

/** A game a few moves in, so the round trip has history, a score and a used bag to carry. */
function gameInProgress(): {
  state: GameState;
  setup: ReturnType<typeof buildEngineTestGame>;
} {
  const setup = buildEngineTestGame({
    playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
  });
  const centre = setup.board.centreCoordinate;
  let state = setup.state;
  for (const [index, tileId] of state.players[0].rack.tileIds
    .slice(0, 3)
    .entries()) {
    const placed = placeTile(state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId,
      coordinate: { row: centre.row, column: centre.column + index },
    });
    if (!placed.success) throw new Error("setup failed");
    state = placed.state;
  }
  const committed = submitMove(
    state,
    setup.configuration,
    rules,
    setup.playerOneId,
  );
  if (!committed.success) throw new Error("setup failed");
  return { state: committed.state, setup };
}

/**
 * Every history event gets a freshly generated id, so the same action applied twice can never
 * produce byte-identical states. Blanking those ids leaves everything that actually has to match
 * — the board, the racks, the bag, the scores, the turn, and the events themselves.
 */
function withoutGeneratedIds(state: GameState) {
  return {
    ...state,
    history: {
      ...state.history,
      events: state.history.events.map((event) => ({ ...event, id: "" })),
    },
  };
}

describe("serializeGameState / deserializeGameState", () => {
  it("carries a game through text unchanged", () => {
    const { state } = gameInProgress();

    const restored = deserializeGameState(serializeGameState(state));

    expect(restored).toEqual(state);
  });

  it("produces a state that can still be played on", () => {
    const { state, setup } = gameInProgress();
    const restored = deserializeGameState(serializeGameState(state))!;

    // The same action on the original and on the restored copy must land in the same place: a
    // server rehydrating a match has to continue it, not merely display it.
    const fromOriginal = pass(state, setup.playerTwoId);
    const fromRestored = pass(restored, setup.playerTwoId);

    expect(fromRestored.success).toBe(true);
    expect(fromOriginal.success).toBe(true);
    if (!fromOriginal.success || !fromRestored.success) return;
    expect(withoutGeneratedIds(fromRestored.state)).toEqual(
      withoutGeneratedIds(fromOriginal.state),
    );
  });

  it("survives a round trip through a plain object, as a database row would be", () => {
    const { state } = gameInProgress();

    // A store hands back parsed JSON rather than text; that path has to validate too.
    const asRow: unknown = JSON.parse(serializeGameState(state));

    expect(parseGameState(asRow)).toEqual(state);
  });

  it("keeps a finished game's result", () => {
    const { state, setup } = gameInProgress();
    let finished = pass(state, setup.playerTwoId);
    for (let i = 0; i < 3 && finished.success; i++) {
      const next = pass(
        finished.state,
        finished.state.turnState.type === "PLAYER_TURN"
          ? finished.state.turnState.playerId
          : setup.playerOneId,
      );
      if (!next.success) break;
      finished = next;
    }
    if (!finished.success || finished.state.status !== "FINISHED") {
      throw new Error("expected four passes to finish the game");
    }

    const restored = deserializeGameState(serializeGameState(finished.state))!;

    expect(restored.status).toBe("FINISHED");
    expect(restored).toEqual(finished.state);
  });

  it("drops properties that were explicitly undefined, which changes nothing", () => {
    // A fresh game, so it is the first player's turn and their hand is full: a half-built move is
    // the state most likely to be interrupted by a save, and the one carrying undefined fields.
    const setup = buildEngineTestGame();
    const withPending = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: setup.state.players[0].rack.tileIds[0],
      coordinate: setup.board.centreCoordinate,
    });
    if (!withPending.success) throw new Error("setup failed");
    expect(withPending.state.pendingMove?.placedTiles[0]).toHaveProperty(
      "representedLetter",
      undefined,
    );

    // A placed tile carries `representedLetter: undefined` for anything but a blank, and JSON has
    // no way to write that — the key simply disappears. The code reads a missing key and an
    // undefined one alike, so the restored game behaves identically.
    const restored = deserializeGameState(
      serializeGameState(withPending.state),
    )!;
    expect(restored.pendingMove?.placedTiles[0]).not.toHaveProperty(
      "representedLetter",
    );
    expect(restored).toEqual(withPending.state);

    // And it can still be played on, which is what the missing key could have broken.
    const removed = placeTile(restored, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: setup.state.players[0].rack.tileIds[1],
      coordinate: {
        row: setup.board.centreCoordinate.row,
        column: setup.board.centreCoordinate.column + 1,
      },
    });
    expect(removed.success).toBe(true);
  });
});

describe("parseGameState", () => {
  it("rejects things that are not a game state", () => {
    for (const value of [null, undefined, 42, "a game", [], {}]) {
      expect(parseGameState(value)).toBeUndefined();
    }
  });

  it("rejects text that is not JSON at all", () => {
    expect(deserializeGameState("{ not json")).toBeUndefined();
  });

  it("rejects a state whose invariants no longer hold", () => {
    const { state } = gameInProgress();
    // The same tile in two places at once: exactly the corruption assertValidGameState exists to
    // catch, and precisely what a bad migration or a hand-edited row would produce.
    const corrupted = {
      ...state,
      players: [
        {
          ...state.players[0],
          rack: {
            tileIds: [
              ...state.players[0].rack.tileIds,
              state.board.occupiedCells[0].tileId,
            ],
          },
        },
        state.players[1],
      ],
    };

    expect(parseGameState(corrupted)).toBeUndefined();
  });
});
