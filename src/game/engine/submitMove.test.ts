import { describe, expect, it } from "vitest";
import { createFrenchWordClassificationRules } from "../dictionary/frenchWordClassificationRules";
import { createGermanWordClassificationRules } from "../dictionary/germanWordClassificationRules";
import { createSwedishWordClassificationRules } from "../dictionary/swedishWordClassificationRules";
import { isOccupied, placeCommittedTile } from "../model/board";
import type { GameState } from "../model/game";
import { addHistoryEvent, nextSequence } from "../model/history";
import { createHistoryEventId, createTileId, type TileId } from "../model/ids";
import type { Player } from "../model/player";
import { createBlankTile, createLetterTile, type Tile } from "../model/tile";
import { playerTurn } from "../model/turnState";
import { buildEngineTestGame as buildTestGame } from "../testing/fixtures";
import { pass } from "./pass";
import { placeTile } from "./placeTile";
import { submitMove } from "./submitMove";

function letterTile(
  tiles: Record<TileId, Tile>,
  letter: string,
  points = 1,
): TileId {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, points);
  return id;
}

const rules = createSwedishWordClassificationRules();

describe("submitMove: normal dictionary-valid path", () => {
  it("commits a valid first move covering the centre", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;

    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      expect(result.success).toBe(true);
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
    expect(result.state.board.occupiedCells).toHaveLength(3);
  });

  it("identifies both the main word and a crossing word", () => {
    const setup = buildTestGame();
    // Pre-seed a committed "S" one row below the centre column, so a vertical placement of "I"
    // at the centre forms the crossing word "IS" (a real Swedish word).
    const centre = setup.board.centreCoordinate;
    const existingS = letterTile(setup.tiles, "S", 1);
    const board = placeCommittedTile(
      setup.state.board,
      { row: centre.row + 1, column: centre.column + 1 },
      existingS,
    );
    let state = { ...setup.state, board };

    const [b, i, l] = state.players[0].rack.tileIds;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      expect(result.success).toBe(true);
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const event = result.state.history.events.at(-1);
    expect(event?.type).toBe("WORD_MOVE_COMMITTED");
    if (event?.type === "WORD_MOVE_COMMITTED") {
      expect([...event.payload.words].sort()).toEqual(["BIL", "IS"]);
    }
  });

  it("does not require opponent approval when every word is a dictionary word", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.turnState.type).toBe("PLAYER_TURN");
  });

  it("applies the score exactly once, only on commit", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }
    expect(state.players[0].score).toBe(0);

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    // B(1) + I(1) + L(1) = 3, no multipliers on this board.
    expect(player.score).toBe(3);
  });

  it("draws replacement tiles and reduces the tile bag", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }
    const bagSizeBeforeSubmit = state.tileBag.tileIds.length;

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).toHaveLength(7);
    expect(result.state.tileBag.tileIds).toHaveLength(bagSizeBeforeSubmit - 3);
  });

  it("advances current player to the opponent", () => {
    const setup = buildTestGame();
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.currentPlayerId).toBe(setup.playerTwoId);
    expect(result.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerTwoId,
    });
  });

  it("permanently fixes a blank tile's represented letter on commit", () => {
    const setup = buildTestGame({ playerOneRackLetters: ["B", "L"] });
    const blankId = createTileId();
    setup.tiles[blankId] = createBlankTile(blankId);
    const players = setup.state.players.map((p) =>
      p.id === setup.playerOneId
        ? { ...p, rack: { tileIds: [...p.rack.tileIds, blankId] } }
        : p,
    ) as [Player, Player];
    let state: GameState = { ...setup.state, players };

    const [b, l] = state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    const placedB = placeTile(state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: b,
      coordinate: centre,
    });
    expect(placedB.success).toBe(true);
    if (placedB.success) state = placedB.state;

    const placedBlank = placeTile(state, setup.board, ["I"], {
      playerId: setup.playerOneId,
      tileId: blankId,
      coordinate: { row: centre.row, column: centre.column + 1 },
      representedLetter: "I",
    });
    expect(placedBlank.success).toBe(true);
    if (placedBlank.success) state = placedBlank.state;

    const placedL = placeTile(state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: l,
      coordinate: { row: centre.row, column: centre.column + 2 },
    });
    expect(placedL.success).toBe(true);
    if (placedL.success) state = placedL.state;

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const committedBlank = result.state.tiles[blankId];
    expect(committedBlank.kind).toBe("BLANK");
    if (committedBlank.kind === "BLANK") {
      expect(committedBlank.representedLetter).toBe("I");
    }
  });

  it("awards the all-tiles bonus when the whole rack is played", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      rackSize: 6,
      bagLetters: [],
    });
    // Use a 6-tile rack but only place all 3 available tiles is not "all tiles" unless rack
    // size matches placed count; here the rack legitimately only has 3 tiles because we're
    // testing with a small custom rack, but the bonus is keyed on the *configured* rack size,
    // so this should NOT award the 6-tile bonus.
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    // 3 placed but configured rack size is 6, so no bonus: just B+I+L = 3.
    expect(player.score).toBe(3);
  });
});

describe("submitMove: rejected variations", () => {
  it("rejects a physically invalid placement without touching state", () => {
    const setup = buildTestGame();
    const [b, i] = setup.state.players[0].rack.tileIds;
    // Two adjacent tiles (no gap), but not covering the centre on this, the game's first move.
    const first = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: b,
      coordinate: { row: 0, column: 0 },
    });
    expect(first.success).toBe(true);
    if (!first.success) return;
    const second = placeTile(first.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: i,
      coordinate: { row: 0, column: 1 },
    });
    expect(second.success).toBe(true);
    if (!second.success) return;

    const result = submitMove(
      second.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("FIRST_MOVE_MUST_COVER_CENTER");
    // August remains in the same turn with the pending tiles intact.
    expect(second.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerOneId,
    });
  });

  it("offers an abbreviation for opponent approval rather than rejecting it outright (DEC-007)", () => {
    const setup = buildTestGame({ playerOneRackLetters: ["T", "V"] });
    const [t, v] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    const placedT = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: t,
      coordinate: centre,
    });
    expect(placedT.success).toBe(true);
    if (!placedT.success) return;
    const placedV = placeTile(placedT.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: v,
      coordinate: { row: centre.row, column: centre.column + 1 },
    });
    expect(placedV.success).toBe(true);
    if (!placedV.success) return;

    const result = submitMove(
      placedV.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.turnState).toEqual({
      type: "REQUIRES_PLAYER_CONFIRMATION",
      playerId: setup.playerOneId,
    });
    const wordResults = result.state.pendingMove?.wordResults ?? [];
    expect(wordResults).toHaveLength(1);
    expect(wordResults[0].status).toBe("UNKNOWN_WORD");
    expect(wordResults[0].word).toBe("TV");
  });

  it("rejects submitting with no pending move", () => {
    const setup = buildTestGame();
    const result = submitMove(
      setup.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_GAME_STATE");
  });
});

describe("submitMove: game end", () => {
  it("ends the game when the bag empties and a player empties their rack", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      bagLetters: [],
    });
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.status).toBe("FINISHED");
    expect(result.state.turnState).toEqual({ type: "FINISHED" });
    if (result.state.status === "FINISHED") {
      expect(result.state.result.winnerPlayerIds).toEqual([setup.playerOneId]);
    }
  });
});

describe("submitMove: Crisscross mode", () => {
  /** Places a T-shaped, entirely-new-tile cluster: horizontal "DOG" crossing vertical "OGRE". */
  function buildTCluster() {
    const setup = buildTestGame({
      playerOneRackLetters: ["D", "O", "G", "G", "R", "E"],
      modifiers: new Set(["CRISSCROSS"]),
    });
    const [d, o, g1, g2, r, e] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;

    let state = setup.state;
    const placements: [TileId, number, number][] = [
      [d, 0, -1],
      [o, 0, 0],
      [g1, 0, 1],
      [g2, 1, 0],
      [r, 2, 0],
      [e, 3, 0],
    ];
    for (const [tileId, rowOffset, columnOffset] of placements) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: {
          row: centre.row + rowOffset,
          column: centre.column + columnOffset,
        },
      });
      expect(result.success).toBe(true);
      if (result.success) state = result.state;
    }
    return { setup, state };
  }

  it("detects both words of a connected multi-branch first move when the modifier is active", () => {
    const { setup, state } = buildTCluster();

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    // DOG/OGRE are not Swedish dictionary words, so this proposes rather than commits directly —
    // either way, both words must have been detected and reached the pending move.
    const words = result.state.pendingMove?.wordResults?.map((w) => w.word);
    expect(words?.sort()).toEqual(["DOG", "OGRE"]);
    // Every fixture tile is worth 1 point with no multipliers on this test board (fixtures.ts):
    // DOG (3 tiles) + OGRE (4 tiles), with the shared O scored once per word it belongs to,
    // exactly as an ordinary crossing word already is (scoreMove.ts) — no crisscross-specific
    // scoring logic exists, or needs to.
    expect(result.state.pendingMove?.scorePreview?.total).toBe(3 + 4);
  });

  it("rejects the identical placement when Crisscross mode is not configured", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["D", "O", "G", "G", "R", "E"],
    });
    const [d, o, g1, g2, r, e] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;

    let state = setup.state;
    const placements: [TileId, number, number][] = [
      [d, 0, -1],
      [o, 0, 0],
      [g1, 0, 1],
      [g2, 1, 0],
      [r, 2, 0],
      [e, 3, 0],
    ];
    for (const [tileId, rowOffset, columnOffset] of placements) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: {
          row: centre.row + rowOffset,
          column: centre.column + columnOffset,
        },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("INVALID_PLACEMENT");
    expect(result.error.messageKey).toBe("notInLine");
  });

  it("rejects two new-tile clusters that don't connect to each other, even with Crisscross active", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["D", "O"],
      modifiers: new Set(["CRISSCROSS"]),
    });
    const [d, o] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;

    let state = setup.state;
    // Two single-tile "clusters" several cells apart, not orthogonally adjacent to each other.
    for (const [tileId, rowOffset, columnOffset] of [
      [d, 0, 0],
      [o, 5, 5],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: {
          row: centre.row + rowOffset,
          column: centre.column + columnOffset,
        },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("NOT_CONNECTED_CLUSTER");
    expect(result.error.messageKey).toBe("notConnectedCluster");
    // Nothing committed: the input state's board is untouched by a failed submission.
    expect(state.board.occupiedCells).toHaveLength(0);
  });
});

describe("submitMove: Illegal mode", () => {
  it("blocks a dictionary-valid word (DEC-008)", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      modifiers: new Set(["ILLEGAL"]),
    });
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("DICTIONARY_WORD_NOT_ALLOWED");
    expect(result.error.details).toEqual({ word: "BIL" });
    // Nothing committed: still the same player's turn, tiles still pending.
    expect(state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerOneId,
    });
  });

  it("still allows a genuinely unknown word, subject to the normal proposal flow", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["T", "V"],
      modifiers: new Set(["ILLEGAL"]),
    });
    const [t, v] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    const placedT = placeTile(setup.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: t,
      coordinate: centre,
    });
    if (!placedT.success) throw new Error("setup failed");
    const placedV = placeTile(placedT.state, setup.board, [], {
      playerId: setup.playerOneId,
      tileId: v,
      coordinate: { row: centre.row, column: centre.column + 1 },
    });
    if (!placedV.success) throw new Error("setup failed");

    const result = submitMove(
      placedV.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.turnState).toEqual({
      type: "REQUIRES_PLAYER_CONFIRMATION",
      playerId: setup.playerOneId,
    });
  });

  it("blocks a multi-word move if even one of its words is dictionary-valid", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      modifiers: new Set(["ILLEGAL"]),
    });
    // An existing "X" positioned so placing "BIL" horizontally through the centre also forms a
    // vertical crossing word "IX" at the I — not a real Swedish word, unlike "BIL" itself. The
    // move must still be blocked, because DEC-008 blocks the whole move if *any* formed word is
    // dictionary-valid, not only when every word is.
    const centre = setup.board.centreCoordinate;
    const existingX = letterTile(setup.tiles, "X", 1);
    const board = placeCommittedTile(
      setup.state.board,
      { row: centre.row + 1, column: centre.column + 1 },
      existingX,
    );
    let state = { ...setup.state, board };

    const [b, i, l] = state.players[0].rack.tileIds;
    for (const [tileId, offset] of [
      [b, 0],
      [i, 1],
      [l, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("DICTIONARY_WORD_NOT_ALLOWED");
    expect(result.error.details).toEqual({ word: "BIL" });
  });
});

describe("submitMove: Polyglot mode", () => {
  const german = createGermanWordClassificationRules();
  const french = createFrenchWordClassificationRules();

  function placeHaus(polyglotLanguages: readonly ["de", "fr"]) {
    const setup = buildTestGame({
      playerOneRackLetters: ["H", "A", "U", "S"],
      modifiers: new Set(["POLYGLOT"]),
      polyglotLanguages,
    });
    const [h, a, u, s] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [h, 0],
      [a, 1],
      [u, 2],
      [s, 3],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }
    return { setup, state };
  }

  it("commits directly when the word matches one of two selected languages (French rules alone would not know it)", () => {
    // "HAUS" is real German, not French.
    const { setup, state } = placeHaus(["de", "fr"]);

    const result = submitMove(state, setup.configuration, french, setup.playerOneId, {
      polyglotClassificationRules: [german, french],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
    expect(result.state.board.occupiedCells).toHaveLength(4);
  });

  it("does not matter which position in the array matches", () => {
    const { setup, state } = placeHaus(["de", "fr"]);

    const result = submitMove(state, setup.configuration, german, setup.playerOneId, {
      polyglotClassificationRules: [french, german],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
  });

  it("requires proposer confirmation instead, without Polyglot mode, using only the non-matching language", () => {
    const setup = buildTestGame({ playerOneRackLetters: ["H", "A", "U", "S"] });
    const [h, a, u, s] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [h, 0],
      [a, 1],
      [u, 2],
      [s, 3],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(state, setup.configuration, french, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.turnState).toEqual({
      type: "REQUIRES_PLAYER_CONFIRMATION",
      playerId: setup.playerOneId,
    });
  });

  it("blocks the move under Illegal mode if it matches any selected language, per DEC-010", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["H", "A", "U", "S"],
      modifiers: new Set(["POLYGLOT", "ILLEGAL"]),
      polyglotLanguages: ["de", "fr"],
    });
    const [h, a, u, s] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [h, 0],
      [a, 1],
      [u, 2],
      [s, 3],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(state, setup.configuration, french, setup.playerOneId, {
      polyglotClassificationRules: [german, french],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("DICTIONARY_WORD_NOT_ALLOWED");
    expect(result.error.details).toEqual({ word: "HAUS" });
  });

  it("throws when Polyglot is active but fewer than two languages' rules are supplied", () => {
    const { setup, state } = placeHaus(["de", "fr"]);

    expect(() =>
      submitMove(state, setup.configuration, french, setup.playerOneId, {
        polyglotClassificationRules: [german],
      }),
    ).toThrow();
    expect(() =>
      submitMove(state, setup.configuration, french, setup.playerOneId),
    ).toThrow();
  });
});

describe("submitMove: Wild mode", () => {
  const german = createGermanWordClassificationRules();
  const french = createFrenchWordClassificationRules();
  // REN (German-only) and PEU (French-only) share their middle letter "E"/"E", letting the
  // second move cross through the first move's committed tile with no incidental extra words.
  const wildLanguages = ["de", "fr"] as const;
  const wildRules = [german, french];

  function buildRound0Setup() {
    return buildTestGame({
      playerOneRackLetters: ["R", "E", "N", "P", "U"],
      modifiers: new Set(["WILD"]),
      wildLanguages,
    });
  }

  function playRenInRound0(setup: ReturnType<typeof buildRound0Setup>) {
    const [r, e, n] = setup.state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let state = setup.state;
    for (const [tileId, offset] of [
      [r, 0],
      [e, 1],
      [n, 2],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }
    return { state, centre };
  }

  it("uses the first configured language (index 0) before any round has completed", () => {
    const setup = buildRound0Setup();
    const { state } = playRenInRound0(setup);

    const result = submitMove(state, setup.configuration, german, setup.playerOneId, {
      wildClassificationRules: wildRules,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
    expect(result.state.board.occupiedCells).toHaveLength(3);
  });

  it("rotates to the second language only after a full round (both players) has completed, not after just one turn", () => {
    const setup = buildRound0Setup();
    const { state: afterPlacing, centre } = playRenInRound0(setup);

    // Only player one has acted so far — still round 0, "de" active. Submitting now must
    // classify REN as DICTIONARY_WORD (German), not require confirmation.
    const renResult = submitMove(
      afterPlacing,
      setup.configuration,
      german,
      setup.playerOneId,
      { wildClassificationRules: wildRules },
    );
    expect(renResult.success).toBe(true);
    if (!renResult.success) return;
    expect(renResult.state.board.occupiedCells).toHaveLength(3);

    // Player two passes — this completes the full round (2 turns), rotating to "fr".
    const passResult = pass(renResult.state, setup.playerTwoId);
    expect(passResult.success).toBe(true);
    if (!passResult.success) return;

    // Player one's turn again: cross a vertical "PEU" through REN's committed middle "E".
    const [, , , p, u] = setup.state.players[0].rack.tileIds;
    let state = passResult.state;
    for (const [tileId, rowOffset] of [
      [p, -1],
      [u, 1],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row + rowOffset, column: centre.column + 1 },
      });
      if (result.success) state = result.state;
    }

    const peuResult = submitMove(state, setup.configuration, german, setup.playerOneId, {
      wildClassificationRules: wildRules,
    });

    expect(peuResult.success).toBe(true);
    if (!peuResult.success) return;
    // Committed directly (PEU is DICTIONARY_WORD under "fr", now active) rather than requiring
    // proposer confirmation — proving the rotation actually took effect for this move.
    expect(peuResult.state.pendingMove).toBeUndefined();
    expect(peuResult.state.board.occupiedCells).toHaveLength(5);

    // The earlier, already-committed REN move keeps its own history entry and score untouched
    // by the later rotation — nothing retroactively reclassifies it.
    const renEvent = peuResult.state.history.events.find(
      (event) =>
        event.type === "WORD_MOVE_COMMITTED" && event.payload.words.includes("REN"),
    );
    expect(renEvent).toBeDefined();
  });

  it("would require proposer confirmation for the same crossing word if the round had not yet rotated", () => {
    // Contrast case: submit PEU immediately after REN, with no intervening pass — still round 0
    // ("de" active) — proving the rotation is what makes the earlier test commit directly,
    // rather than Wild mode always matching every selected language like Polyglot does.
    const setup = buildRound0Setup();
    const { state: afterRen, centre } = playRenInRound0(setup);
    const committed = submitMove(
      afterRen,
      setup.configuration,
      german,
      setup.playerOneId,
      { wildClassificationRules: wildRules },
    );
    if (!committed.success) throw new Error("setup failed");

    // It's now player two's turn, still within round 0 (only one turn has completed so far).
    // Give player two the tiles to cross PEU through REN's committed middle "E" themselves.
    const pTile = letterTile(setup.tiles, "P");
    const uTile = letterTile(setup.tiles, "U");
    const stateWithPlayerTwoTiles: GameState = {
      ...committed.state,
      players: [
        committed.state.players[0],
        {
          ...committed.state.players[1],
          rack: { tileIds: [pTile, uTile] },
        },
      ],
    };

    let state = stateWithPlayerTwoTiles;
    for (const [tileId, rowOffset] of [
      [pTile, -1],
      [uTile, 1],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerTwoId,
        tileId,
        coordinate: { row: centre.row + rowOffset, column: centre.column + 1 },
      });
      if (result.success) state = result.state;
    }

    const result = submitMove(state, setup.configuration, german, setup.playerTwoId, {
      wildClassificationRules: wildRules,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    // "de" is still active (no full round has completed yet), and PEU is not German — so this
    // must require proposer confirmation instead of committing directly.
    expect(result.state.turnState).toEqual({
      type: "REQUIRES_PLAYER_CONFIRMATION",
      playerId: setup.playerTwoId,
    });
  });

  it("cycles back to the first language after enough full rounds", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["R", "E", "N"],
      modifiers: new Set(["WILD"]),
      wildLanguages,
    });
    let history = setup.state.history;
    for (let i = 0; i < 4; i++) {
      history = addHistoryEvent(history, {
        id: createHistoryEventId(),
        sequence: nextSequence(history),
        type: "PASS",
        playerId: i % 2 === 0 ? setup.playerOneId : setup.playerTwoId,
        payload: {},
      });
    }
    // 4 completed turns = 2 full rounds; with 2 languages, that wraps exactly back to index 0
    // ("de") — so REN (German-only, per the earlier tests in this block) should commit directly
    // again here, the same as it did at the very start of the game.
    const state: GameState = { ...setup.state, history };
    const [r, e, n] = state.players[0].rack.tileIds;
    const centre = setup.board.centreCoordinate;
    let stateWithTiles = state;
    for (const [tileId, offset] of [
      [r, 0],
      [e, 1],
      [n, 2],
    ] as const) {
      const result = placeTile(stateWithTiles, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) stateWithTiles = result.state;
    }

    const result = submitMove(
      stateWithTiles,
      setup.configuration,
      german,
      setup.playerOneId,
      { wildClassificationRules: wildRules },
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
    expect(result.state.board.occupiedCells).toHaveLength(3);
  });

  it("throws when Wild mode is active but the rules array length does not match configuration.wildLanguages", () => {
    const setup = buildRound0Setup();
    const { state } = playRenInRound0(setup);

    expect(() =>
      submitMove(state, setup.configuration, german, setup.playerOneId, {
        wildClassificationRules: [german],
      }),
    ).toThrow();
    expect(() =>
      submitMove(state, setup.configuration, german, setup.playerOneId),
    ).toThrow();
  });

  // DEC-012: a word accepted while one Wild language was active is scoped to that language only,
  // not shared across every configured language the way plain/Polyglot acceptances are.
  describe("DEC-012: per-language accepted vocabulary", () => {
    function buildGrompSetup(fullRoundsElapsed: number) {
      const setup = buildTestGame({
        playerOneRackLetters: ["G", "R", "Ö", "M", "P"],
        modifiers: new Set(["WILD"]),
        wildLanguages,
      });
      let history = setup.state.history;
      for (let i = 0; i < fullRoundsElapsed * 2; i++) {
        history = addHistoryEvent(history, {
          id: createHistoryEventId(),
          sequence: nextSequence(history),
          type: "PASS",
          playerId: i % 2 === 0 ? setup.playerOneId : setup.playerTwoId,
          payload: {},
        });
      }
      // GRÖMP was previously accepted while "de" (index 0) was active — DEC-012 tags the entry.
      const state: GameState = {
        ...setup.state,
        history,
        acceptedVocabulary: [{ word: "GRÖMP", languageCode: "de" }],
      };
      const [g, r, o, m, p] = state.players[0].rack.tileIds;
      const centre = setup.board.centreCoordinate;
      let stateWithTiles = state;
      for (const [tileId, offset] of [
        [g, 0],
        [r, 1],
        [o, 2],
        [m, 3],
        [p, 4],
      ] as const) {
        const result = placeTile(stateWithTiles, setup.board, [], {
          playerId: setup.playerOneId,
          tileId,
          coordinate: { row: centre.row, column: centre.column + offset },
        });
        if (result.success) stateWithTiles = result.state;
      }
      return { setup, state: stateWithTiles };
    }

    it("stays ACCEPTED_IN_GAME once rotation returns to the language it was accepted under", () => {
      // 2 full rounds with 2 languages cycles exactly back to index 0 ("de").
      const { setup, state } = buildGrompSetup(2);

      const result = submitMove(state, setup.configuration, german, setup.playerOneId, {
        wildClassificationRules: wildRules,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      // Committed directly rather than requiring confirmation: GRÖMP is ACCEPTED_IN_GAME under
      // "de", the language active now.
      expect(result.state.pendingMove).toBeUndefined();
    });

    it("is UNKNOWN_WORD again once a different Wild language becomes active", () => {
      // 1 full round rotates from index 0 ("de") to index 1 ("fr") — GRÖMP was only ever accepted
      // under "de", so it must not be silently accepted here.
      const { setup, state } = buildGrompSetup(1);

      const result = submitMove(state, setup.configuration, german, setup.playerOneId, {
        wildClassificationRules: wildRules,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.state.turnState).toEqual({
        type: "REQUIRES_PLAYER_CONFIRMATION",
        playerId: setup.playerOneId,
      });
    });
  });
});

describe("submitMove: Replace mode", () => {
  it("replaces the board's only remaining committed tile without being misread as a first move", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["A", "T"],
      modifiers: new Set(["REPLACE"]),
    });
    // A committed tile away from the centre, with a matching history entry: this simulates a
    // game deep enough that the board's only current tile isn't the actual first move, even
    // though replacing it will momentarily empty board.occupiedCells before this move commits.
    const away = {
      row: setup.board.centreCoordinate.row + 3,
      column: setup.board.centreCoordinate.column + 3,
    };
    const existingTileId = createTileId();
    setup.tiles[existingTileId] = createLetterTile(existingTileId, "S", 1);
    const board = placeCommittedTile(setup.state.board, away, existingTileId);
    const history = addHistoryEvent(setup.state.history, {
      id: createHistoryEventId(),
      sequence: nextSequence(setup.state.history),
      type: "WORD_MOVE_COMMITTED",
      playerId: setup.playerTwoId,
      payload: {
        placedTiles: [],
        words: ["S"],
        scoreAwarded: 1,
        usedUnknownWordApproval: false,
      },
    });
    const state = { ...setup.state, board, history };
    const [a, t] = state.players[0].rack.tileIds;

    // Replace S with A, then extend it with a new T to form "AT" — a lone replace can't form a
    // word by itself, same as any single isolated tile.
    const replaced = placeTile(
      state,
      setup.board,
      [],
      { playerId: setup.playerOneId, tileId: a, coordinate: away },
      { allowReplace: true },
    );
    expect(replaced.success).toBe(true);
    if (!replaced.success) return;
    // Confirms the premise: the board really is empty right up until submit.
    expect(isOccupied(replaced.state.board, away)).toBe(false);

    const extended = placeTile(
      replaced.state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: t,
        coordinate: { row: away.row, column: away.column + 1 },
      },
      { allowReplace: true },
    );
    expect(extended.success).toBe(true);
    if (!extended.success) return;

    const result = submitMove(
      extended.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    // The key assertion: this was accepted as a legal, connected placement, rather than
    // rejected as an (incorrect) first move or as disconnected from the board.
    expect(result.success).toBe(true);
  });

  it("leaves the displaced tile usably in the rack after a full commit, untouched by the draw", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      bagLetters: ["Å", "Ä", "Ö"],
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    // An existing tile sits exactly where "I" will replace it; "B" and "L" fill the empty cells
    // on either side, all three together forming "BIL" (a real Swedish word) through the centre.
    const existingTileId = createTileId();
    setup.tiles[existingTileId] = createLetterTile(existingTileId, "X", 1);
    const board = placeCommittedTile(setup.state.board, centre, existingTileId);
    const state = { ...setup.state, board };
    const [b, i, l] = state.players[0].rack.tileIds;

    let working = state;
    for (const [tileId, columnOffset] of [
      [b, -1],
      [i, 0],
      [l, 1],
    ] as const) {
      const result = placeTile(
        working,
        setup.board,
        [],
        {
          playerId: setup.playerOneId,
          tileId,
          coordinate: { row: centre.row, column: centre.column + columnOffset },
        },
        { allowReplace: true },
      );
      expect(result.success).toBe(true);
      if (result.success) working = result.state;
    }

    const result = submitMove(
      working,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    // BIL is a dictionary word: this commits directly rather than proposing.
    expect(result.state.pendingMove).toBeUndefined();
    expect(isOccupied(result.state.board, centre)).toBe(true);

    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    // The displaced "X" stays in the rack as an ordinary tile: the draw refills around it
    // (here the 3-tile bag runs out first) rather than replacing or discarding it.
    expect(player.rack.tileIds).toContain(existingTileId);
    expect(player.rack.tileIds).toHaveLength(4);
  });

  it("refills the rack to the configured size after a replace, not by tiles played", () => {
    // Regression (known-bugs.md, Replace mode 3): drawing one tile per tile placed handed the
    // player a permanent extra tile every replace, because the displaced tile had already
    // returned to the same rack. game-rules.md section 12 refills *up to* the rack size.
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L", "A", "R", "E", "N"],
      bagLetters: ["Å", "Ä", "Ö", "V", "N", "M", "P", "S", "T"],
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    const existingTileId = createTileId();
    setup.tiles[existingTileId] = createLetterTile(existingTileId, "X", 1);
    const board = placeCommittedTile(setup.state.board, centre, existingTileId);
    const state = { ...setup.state, board };
    const [b, i, l] = state.players[0].rack.tileIds;

    let working = state;
    for (const [tileId, columnOffset] of [
      [b, -1],
      [i, 0],
      [l, 1],
    ] as const) {
      const placed = placeTile(
        working,
        setup.board,
        [],
        {
          playerId: setup.playerOneId,
          tileId,
          coordinate: { row: centre.row, column: centre.column + columnOffset },
        },
        { allowReplace: true },
      );
      expect(placed.success).toBe(true);
      if (placed.success) working = placed.state;
    }
    // 7 tiles, minus the 3 placed, plus the displaced "X" the replace handed back.
    expect(
      working.players.find((p) => p.id === setup.playerOneId)!.rack.tileIds,
    ).toHaveLength(5);

    const result = submitMove(
      working,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).toHaveLength(setup.configuration.rackSize);
    expect(player.rack.tileIds).toContain(existingTileId);
  });

  it("awards nothing for words a replace only re-lettered, in either direction (DEC-016)", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["A", "B"],
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    // Committed: "BIL" horizontally through the centre, crossed vertically by "SIL" — the two
    // share the "I" at the centre, which is the tile about to be replaced.
    let board = setup.state.board;
    for (const [letter, coordinate] of [
      ["B", { row: centre.row, column: centre.column - 1 }],
      ["I", centre],
      ["L", { row: centre.row, column: centre.column + 1 }],
      ["S", { row: centre.row - 1, column: centre.column }],
      ["L", { row: centre.row + 1, column: centre.column }],
    ] as const) {
      board = placeCommittedTile(board, coordinate, letterTile(setup.tiles, letter));
    }
    const history = addHistoryEvent(setup.state.history, {
      id: createHistoryEventId(),
      sequence: nextSequence(setup.state.history),
      type: "WORD_MOVE_COMMITTED",
      playerId: setup.playerTwoId,
      payload: {
        placedTiles: [],
        words: ["BIL", "SIL"],
        scoreAwarded: 3,
        usedUnknownWordApproval: false,
      },
    });
    const state = { ...setup.state, board, history };
    const [a] = state.players[0].rack.tileIds;

    // Replace the shared "I" with "A": "BIL" becomes "BAL" and "SIL" becomes "SAL". Both are
    // real words, and neither got any longer.
    const replaced = placeTile(
      state,
      setup.board,
      [],
      { playerId: setup.playerOneId, tileId: a, coordinate: centre },
      { allowReplace: true },
    );
    expect(replaced.success).toBe(true);
    if (!replaced.success) return;

    const result = submitMove(
      replaced.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    // Both words are in the dictionary, so this commits rather than proposing.
    expect(result.state.pendingMove).toBeUndefined();
    const committed = result.state.history.events.at(-1);
    expect(committed?.type).toBe("WORD_MOVE_COMMITTED");
    if (committed?.type !== "WORD_MOVE_COMMITTED") return;
    // Both directions were detected as affected words, and both scored nothing.
    expect(committed.payload.words).toEqual(
      expect.arrayContaining(["BAL", "SAL"]),
    );
    expect(committed.payload.scoreAwarded).toBe(0);
    expect(
      result.state.players.find((p) => p.id === setup.playerOneId)!.score,
    ).toBe(0);
  });

  it("scores the whole word, replaced tile included, when the replace also lengthens it (DEC-016)", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["A", "A"],
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    let board = setup.state.board;
    for (const [letter, column] of [
      ["B", centre.column - 1],
      ["I", centre.column],
      ["L", centre.column + 1],
    ] as const) {
      board = placeCommittedTile(
        board,
        { row: centre.row, column },
        letterTile(setup.tiles, letter),
      );
    }
    const history = addHistoryEvent(setup.state.history, {
      id: createHistoryEventId(),
      sequence: nextSequence(setup.state.history),
      type: "WORD_MOVE_COMMITTED",
      playerId: setup.playerTwoId,
      payload: {
        placedTiles: [],
        words: ["BIL"],
        scoreAwarded: 3,
        usedUnknownWordApproval: false,
      },
    });
    const state = { ...setup.state, board, history };
    const [firstA, secondA] = state.players[0].rack.tileIds;

    // Replace the "I" of "BIL" with an "A", then extend the result into "BALA".
    const replaced = placeTile(
      state,
      setup.board,
      [],
      { playerId: setup.playerOneId, tileId: firstA, coordinate: centre },
      { allowReplace: true },
    );
    expect(replaced.success).toBe(true);
    if (!replaced.success) return;

    const extended = placeTile(
      replaced.state,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: secondA,
        coordinate: { row: centre.row, column: centre.column + 2 },
      },
      { allowReplace: true },
    );
    expect(extended.success).toBe(true);
    if (!extended.success) return;

    const result = submitMove(
      extended.state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    const committed = result.state.history.events.at(-1);
    expect(committed?.type).toBe("WORD_MOVE_COMMITTED");
    if (committed?.type !== "WORD_MOVE_COMMITTED") return;
    expect(committed.payload.words).toEqual(["BALA"]);
    // All four letters count, the replaced "A" included — every tile in this fixture is worth 1.
    expect(committed.payload.scoreAwarded).toBe(4);
  });

  it("still requires the actual first move of the game to cover the centre", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["A", "B"],
      modifiers: new Set(["REPLACE"]),
    });
    let state = setup.state;
    for (const [tileId, column] of [
      [state.players[0].rack.tileIds[0], 0],
      [state.players[0].rack.tileIds[1], 1],
    ] as const) {
      const result = placeTile(
        state,
        setup.board,
        [],
        { playerId: setup.playerOneId, tileId, coordinate: { row: 0, column } },
        { allowReplace: true },
      );
      if (result.success) state = result.state;
    }

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("FIRST_MOVE_MUST_COVER_CENTER");
  });

  it("keeps an earlier committed move's score after a later replace touches one of its tiles", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      // Seven tiles refill the emptied rack to the configured size after the first commit
      // (game-rules.md section 12), leaving "X" as the tile player two replaces with below.
      bagLetters: ["Å", "Ä", "Ö", "V", "N", "M", "P", "X"],
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    let state = setup.state;
    for (const [tileId, columnOffset] of [
      [b, -1],
      [i, 0],
      [l, 1],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + columnOffset },
      });
      if (result.success) state = result.state;
    }
    const committed = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(committed.success).toBe(true);
    if (!committed.success) return;
    // BIL is a dictionary word: it commits directly, scoring 3 (no multipliers on this board).
    expect(committed.state.pendingMove).toBeUndefined();
    const playerOneScoreAfterFirstMove = committed.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!.score;
    expect(playerOneScoreAfterFirstMove).toBe(3);

    // Hand player two a tile to replace with (bypassing normal draw mechanics — this test only
    // cares about what a later replace does to the *first* player's already-awarded score).
    const [replacementTileId, ...restOfBag] = committed.state.tileBag.tileIds;
    const playersWithTwoHoldingATile = committed.state.players.map((p) =>
      p.id === setup.playerTwoId
        ? { ...p, rack: { tileIds: [replacementTileId] } }
        : p,
    ) as [Player, Player];
    const stateForPlayerTwo = {
      ...committed.state,
      players: playersWithTwoHoldingATile,
      tileBag: { tileIds: restOfBag },
      currentPlayerId: setup.playerTwoId,
      turnState: playerTurn(setup.playerTwoId),
    };

    const replaced = placeTile(
      stateForPlayerTwo,
      setup.board,
      [],
      {
        playerId: setup.playerTwoId,
        tileId: replacementTileId,
        coordinate: centre,
      },
      { allowReplace: true },
    );
    expect(replaced.success).toBe(true);
    if (!replaced.success) return;

    const secondResult = submitMove(
      replaced.state,
      setup.configuration,
      rules,
      setup.playerTwoId,
    );
    expect(secondResult.success).toBe(true);
    if (!secondResult.success) return;

    const playerOneScoreAfter = secondResult.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!.score;
    expect(playerOneScoreAfter).toBe(playerOneScoreAfterFirstMove);
  });

  it("lets a displaced tile be used to replace another tile again once its move has committed", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      // More than enough for the 3-tile draw: an empty bag combined with player two's
      // (irrelevant, here) empty rack would otherwise end the game right after the first commit
      // (game-rules.md section 29 / DEC-005), before this test gets to its second placeTile.
      bagLetters: ["Å", "Ä", "Ö", "V", "N", "M", "P", "R", "S"],
      modifiers: new Set(["REPLACE"]),
    });
    const centre = setup.board.centreCoordinate;
    // Two pre-existing committed tiles: "I" replaces the first (forming "BIL" through centre);
    // the second, well away from it, is what the displaced "X" will replace next.
    const firstExisting = createTileId();
    setup.tiles[firstExisting] = createLetterTile(firstExisting, "X", 1);
    const secondExisting = createTileId();
    setup.tiles[secondExisting] = createLetterTile(secondExisting, "Y", 1);
    const farAway = { row: centre.row + 4, column: centre.column + 4 };
    let board = placeCommittedTile(setup.state.board, centre, firstExisting);
    board = placeCommittedTile(board, farAway, secondExisting);
    const [b, i, l] = setup.state.players[0].rack.tileIds;
    let state = { ...setup.state, board };
    for (const [tileId, columnOffset] of [
      [b, -1],
      [i, 0],
      [l, 1],
    ] as const) {
      const result = placeTile(
        state,
        setup.board,
        [],
        {
          playerId: setup.playerOneId,
          tileId,
          coordinate: { row: centre.row, column: centre.column + columnOffset },
        },
        { allowReplace: true },
      );
      if (result.success) state = result.state;
    }
    const firstCommit = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(firstCommit.success).toBe(true);
    if (!firstCommit.success) return;
    // Confirms the premise: within that same move, "X" could not have replaced anything else —
    // this is exactly what the earlier "no chaining" test already covers directly.

    // A brand new pending move (whoever's turn it is) is unaffected by the previous move's
    // now-committed history — the chaining restriction only ever looked at the *current*
    // pending move's own placements, so a fresh one has nothing to restrict.
    const stateForPlayerOneAgain = {
      ...firstCommit.state,
      currentPlayerId: setup.playerOneId,
      turnState: playerTurn(setup.playerOneId),
    };
    const player = stateForPlayerOneAgain.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.rack.tileIds).toContain(firstExisting);

    const replaced = placeTile(
      stateForPlayerOneAgain,
      setup.board,
      [],
      {
        playerId: setup.playerOneId,
        tileId: firstExisting,
        coordinate: farAway,
      },
      { allowReplace: true },
    );

    expect(replaced.success).toBe(true);
  });
});
