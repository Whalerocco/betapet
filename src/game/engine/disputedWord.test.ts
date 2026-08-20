import { describe, expect, it } from "vitest";
import { classifyWord } from "../dictionary/classifyWord";
import { createSwedishWordClassificationRules } from "../dictionary/swedishWordClassificationRules";
import { placeCommittedTile } from "../model/board";
import type { GameState } from "../model/game";
import { createTileId, type TileId } from "../model/ids";
import { createLetterTile, type Tile } from "../model/tile";
import { buildEngineTestGame } from "../testing/fixtures";
import { acceptedVocabularySet } from "./acceptedVocabulary";
import { acceptProposedMove } from "./acceptProposedMove";
import { cancelProposal } from "./cancelProposal";
import { confirmProposal } from "./confirmProposal";
import { placeTile } from "./placeTile";
import { rejectProposedMove } from "./rejectProposedMove";
import { submitMove } from "./submitMove";

const rules = createSwedishWordClassificationRules();

function letterTile(
  tiles: Record<TileId, Tile>,
  letter: string,
  points = 1,
): TileId {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, points);
  return id;
}

/** GRÖMP is confirmed absent from the dictionary elsewhere in this project (an artificial example). */
function placeGromp() {
  const setup = buildEngineTestGame({
    playerOneRackLetters: ["G", "R", "Ö", "M", "P"],
  });
  const [g, r, o, m, p] = setup.state.players[0].rack.tileIds;
  const centre = setup.board.centreCoordinate;
  let state = setup.state;
  for (const [tileId, offset] of [
    [g, 0],
    [r, 1],
    [o, 2],
    [m, 3],
    [p, 4],
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

function proposeGromp() {
  const { setup, state } = placeGromp();
  const submitted = submitMove(
    state,
    setup.configuration,
    rules,
    setup.playerOneId,
  );
  if (!submitted.success) throw new Error("setup failed: submit");
  const confirmed = confirmProposal(submitted.state, setup.playerOneId);
  if (!confirmed.success) throw new Error("setup failed: confirm");
  return { setup, state: confirmed.state };
}

describe("submitMove: unknown word", () => {
  it("requires proposing-player confirmation instead of committing", () => {
    const { setup, state } = placeGromp();

    const result = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.status).toBe(
      "REQUIRES_PLAYER_CONFIRMATION",
    );
    expect(result.state.turnState).toEqual({
      type: "REQUIRES_PLAYER_CONFIRMATION",
      playerId: setup.playerOneId,
    });
    // Nothing has happened yet: no score, no draw, no commit.
    expect(result.state.board.occupiedCells).toHaveLength(0);
    expect(result.state.players[0].score).toBe(0);
  });

  it("classifies GRÖMP as unknown, not forbidden", () => {
    expect(classifyWord("GRÖMP", rules).status).toBe("UNKNOWN_WORD");
  });
});

describe("cancelProposal (Ändra)", () => {
  it("returns to editing with the tiles preserved", () => {
    const { setup, state } = placeGromp();
    const submitted = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    if (!submitted.success) throw new Error("setup failed");

    const result = cancelProposal(submitted.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.status).toBe("EDITING");
    expect(result.state.pendingMove?.placedTiles).toHaveLength(5);
    expect(result.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerOneId,
    });
  });

  it("does not add a history event", () => {
    const { setup, state } = placeGromp();
    const submitted = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    if (!submitted.success) throw new Error("setup failed");
    const eventsBefore = submitted.state.history.events.length;

    const result = cancelProposal(submitted.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.history.events).toHaveLength(eventsBefore);
  });
});

describe("confirmProposal (Spela ändå)", () => {
  it("enters the waiting-for-opponent state", () => {
    const { setup, state } = placeGromp();
    const submitted = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    if (!submitted.success) throw new Error("setup failed");

    const result = confirmProposal(submitted.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.status).toBe("WAITING_FOR_OPPONENT");
    expect(result.state.turnState).toEqual({
      type: "WAITING_FOR_OPPONENT_APPROVAL",
      proposingPlayerId: setup.playerOneId,
      reviewingPlayerId: setup.playerTwoId,
    });
  });

  it("records an UNKNOWN_WORD_PROPOSED history event", () => {
    const { setup, state } = placeGromp();
    const submitted = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    if (!submitted.success) throw new Error("setup failed");

    const result = confirmProposal(submitted.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const event = result.state.history.events.at(-1);
    expect(event?.type).toBe("UNKNOWN_WORD_PROPOSED");
    if (event?.type === "UNKNOWN_WORD_PROPOSED") {
      expect(event.payload.words).toEqual(["GRÖMP"]);
    }
  });

  it("has not scored, drawn tiles, or advanced the turn yet", () => {
    const { setup, state } = placeGromp();
    const submitted = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    if (!submitted.success) throw new Error("setup failed");

    const result = confirmProposal(submitted.state, setup.playerOneId);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.players[0].score).toBe(0);
    expect(result.state.board.occupiedCells).toHaveLength(0);
    expect(result.state.acceptedVocabulary).toEqual([]);
    expect(result.state.currentPlayerId).toBe(setup.playerOneId);
  });
});

describe("wrong-player review attempts", () => {
  it("rejects the proposer trying to approve their own move", () => {
    const { setup, state } = proposeGromp();
    const result = acceptProposedMove(state, setup.playerOneId, setup.configuration);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("NOT_AUTHORIZED_TO_APPROVE");
  });

  it("rejects a stranger trying to reject the move", () => {
    const { state } = proposeGromp();
    const strangerId = buildEngineTestGame().playerOneId;
    const result = rejectProposedMove(state, strangerId);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("NOT_AUTHORIZED_TO_APPROVE");
  });
});

describe("duplicate/stale action protection (T12.8)", () => {
  it("a second acceptance after commit is rejected and does not double-score", () => {
    const { setup, state } = proposeGromp();
    const firstAccept = acceptProposedMove(state, setup.playerTwoId, setup.configuration);
    if (!firstAccept.success) throw new Error("setup failed");

    // Simulates a duplicate/replayed "Godkänn" dispatched against the already-committed state
    // (turnState is no longer WAITING_FOR_OPPONENT_APPROVAL once commitMove has run).
    const secondAccept = acceptProposedMove(firstAccept.state, setup.playerTwoId, setup.configuration);

    expect(secondAccept.success).toBe(false);
    if (secondAccept.success) return;
    expect(secondAccept.error.code).toBe("NOT_AUTHORIZED_TO_APPROVE");
    const player = firstAccept.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    // G(1)+R(1)+Ö(1)+M(1)+P(1) = 5, applied once — not doubled by the rejected second call.
    expect(player.score).toBe(5);
  });

  it("a stale rejection sent after acceptance cannot undo the committed move", () => {
    const { setup, state } = proposeGromp();
    const accepted = acceptProposedMove(state, setup.playerTwoId, setup.configuration);
    if (!accepted.success) throw new Error("setup failed");

    // Simulates a stale "Neka" (e.g. a slow/duplicate dispatch) arriving after the move already
    // committed via acceptProposedMove.
    const staleReject = rejectProposedMove(accepted.state, setup.playerTwoId);

    expect(staleReject.success).toBe(false);
    if (staleReject.success) return;
    expect(staleReject.error.code).toBe("NOT_AUTHORIZED_TO_APPROVE");
    // The committed move is untouched: tiles stay on the board, score stays awarded, turn stays
    // advanced to the reviewer.
    expect(accepted.state.board.occupiedCells).toHaveLength(5);
    const player = accepted.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    expect(player.score).toBe(5);
    expect(accepted.state.currentPlayerId).toBe(setup.playerTwoId);
  });
});

describe("acceptProposedMove (Godkänn)", () => {
  it("commits the move", () => {
    const { setup, state } = proposeGromp();

    const result = acceptProposedMove(state, setup.playerTwoId, setup.configuration);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove).toBeUndefined();
    expect(result.state.board.occupiedCells).toHaveLength(5);
  });

  it("applies the score exactly once", () => {
    const { setup, state } = proposeGromp();

    const result = acceptProposedMove(state, setup.playerTwoId, setup.configuration);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const player = result.state.players.find(
      (p) => p.id === setup.playerOneId,
    )!;
    // G(1)+R(1)+Ö(1)+M(1)+P(1) = 5, no multipliers on this board.
    expect(player.score).toBe(5);
  });

  it("adds the unknown word to accepted vocabulary", () => {
    const { setup, state } = proposeGromp();

    const result = acceptProposedMove(state, setup.playerTwoId, setup.configuration);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.acceptedVocabulary).toEqual([{ word: "GRÖMP" }]);
  });

  it("lets the accepted word be reused later without a second approval", () => {
    const { setup, state } = proposeGromp();
    const accepted = acceptProposedMove(state, setup.playerTwoId, setup.configuration);
    if (!accepted.success) throw new Error("setup failed");

    const acceptedSet = acceptedVocabularySet(accepted.state);
    const result = classifyWord("GRÖMP", rules, acceptedSet);

    expect(result.status).toBe("ACCEPTED_IN_GAME");
  });

  it("advances the turn to the reviewer", () => {
    const { setup, state } = proposeGromp();

    const result = acceptProposedMove(state, setup.playerTwoId, setup.configuration);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.currentPlayerId).toBe(setup.playerTwoId);
    expect(result.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerTwoId,
    });
  });

  it("records UNKNOWN_WORD_ACCEPTED before WORD_MOVE_COMMITTED", () => {
    const { setup, state } = proposeGromp();

    const result = acceptProposedMove(state, setup.playerTwoId, setup.configuration);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const types = result.state.history.events.map((e) => e.type);
    expect(types).toEqual([
      "UNKNOWN_WORD_PROPOSED",
      "UNKNOWN_WORD_ACCEPTED",
      "WORD_MOVE_COMMITTED",
    ]);
  });
});

describe("rejectProposedMove (Neka)", () => {
  it("does not change the score", () => {
    const { setup, state } = proposeGromp();
    const result = rejectProposedMove(state, setup.playerTwoId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.players[0].score).toBe(0);
  });

  it("does not change the tile bag", () => {
    const { setup, state } = proposeGromp();
    const bagSizeBefore = state.tileBag.tileIds.length;
    const result = rejectProposedMove(state, setup.playerTwoId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.tileBag.tileIds).toHaveLength(bagSizeBefore);
  });

  it("returns turn ownership to the proposing player", () => {
    const { setup, state } = proposeGromp();
    const result = rejectProposedMove(state, setup.playerTwoId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.currentPlayerId).toBe(setup.playerOneId);
    expect(result.state.turnState).toEqual({
      type: "PLAYER_TURN",
      playerId: setup.playerOneId,
    });
  });

  it("preserves the pending tiles as editable", () => {
    const { setup, state } = proposeGromp();
    const result = rejectProposedMove(state, setup.playerTwoId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.pendingMove?.status).toBe("EDITING");
    expect(result.state.pendingMove?.placedTiles).toHaveLength(5);
    expect(result.state.board.occupiedCells).toHaveLength(0);
  });

  it("does not add the word to accepted vocabulary", () => {
    const { setup, state } = proposeGromp();
    const result = rejectProposedMove(state, setup.playerTwoId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.state.acceptedVocabulary).toEqual([]);
  });

  it("records an UNKNOWN_WORD_REJECTED history event", () => {
    const { setup, state } = proposeGromp();
    const result = rejectProposedMove(state, setup.playerTwoId);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const event = result.state.history.events.at(-1);
    expect(event?.type).toBe("UNKNOWN_WORD_REJECTED");
    if (event?.type === "UNKNOWN_WORD_REJECTED") {
      expect(event.payload.words).toEqual(["GRÖMP"]);
      expect(event.payload.proposingPlayerId).toBe(setup.playerOneId);
      expect(event.payload.reviewingPlayerId).toBe(setup.playerTwoId);
    }
  });

  it("lets the proposer edit and resubmit after rejection", async () => {
    const { setup, state } = proposeGromp();
    const rejected = rejectProposedMove(state, setup.playerTwoId);
    if (!rejected.success) throw new Error("setup failed");

    // The rejected placement is still fully editable via the normal pending-move actions.
    const { removePendingTile } = await import("./removePendingTile");
    const [tileId] = rejected.state.pendingMove!.placedTiles.map(
      (p) => p.tileId,
    );
    const removeResult = removePendingTile(rejected.state, {
      playerId: setup.playerOneId,
      tileId,
    });

    expect(removeResult.success).toBe(true);
  });
});

describe("multiple unknown words", () => {
  it("treats the whole move as one proposal and one acceptance decision", () => {
    // GRÖMP (unknown) crosses a pre-existing committed "X", forming the crossing word "RX",
    // which is also unknown - two simultaneously-unknown words from one placement.
    const setup = buildEngineTestGame({
      playerOneRackLetters: ["G", "R", "Ö", "M", "P"],
    });
    const centre = setup.board.centreCoordinate;
    const xTileId = letterTile(setup.tiles, "X");
    const boardWithX = placeCommittedTile(
      setup.state.board,
      { row: centre.row + 1, column: centre.column + 1 },
      xTileId,
    );
    let state: GameState = { ...setup.state, board: boardWithX };

    const [g, r, o, m, p] = state.players[0].rack.tileIds;
    for (const [tileId, offset] of [
      [g, 0],
      [r, 1],
      [o, 2],
      [m, 3],
      [p, 4],
    ] as const) {
      const result = placeTile(state, setup.board, [], {
        playerId: setup.playerOneId,
        tileId,
        coordinate: { row: centre.row, column: centre.column + offset },
      });
      if (result.success) state = result.state;
    }

    const submitted = submitMove(
      state,
      setup.configuration,
      rules,
      setup.playerOneId,
    );
    expect(submitted.success).toBe(true);
    if (!submitted.success) return;
    expect(submitted.state.pendingMove?.wordResults).toHaveLength(2);
    expect(
      submitted.state.pendingMove?.wordResults?.every(
        (r) => r.status === "UNKNOWN_WORD",
      ),
    ).toBe(true);

    const confirmed = confirmProposal(submitted.state, setup.playerOneId);
    expect(confirmed.success).toBe(true);
    if (!confirmed.success) return;
    const proposedEvent = confirmed.state.history.events.at(-1);
    expect(proposedEvent?.type).toBe("UNKNOWN_WORD_PROPOSED");
    if (proposedEvent?.type === "UNKNOWN_WORD_PROPOSED") {
      expect([...proposedEvent.payload.words].sort()).toEqual(["GRÖMP", "RX"]);
    }

    // A single accept/reject decision resolves the entire move.
    const result = acceptProposedMove(confirmed.state, setup.playerTwoId, setup.configuration);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(
      result.state.acceptedVocabulary.map((entry) => entry.word).sort(),
    ).toEqual(["GRÖMP", "RX"]);
  });
});
