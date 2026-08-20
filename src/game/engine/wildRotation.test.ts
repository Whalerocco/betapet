import { describe, expect, it } from "vitest";
import { addHistoryEvent, createGameHistory, nextSequence } from "../model/history";
import { createHistoryEventId, createPlayerId } from "../model/ids";
import { activeWildLanguageIndex } from "./wildRotation";

const playerOneId = createPlayerId();
const playerTwoId = createPlayerId();

function withCommittedMove(history: ReturnType<typeof createGameHistory>) {
  return addHistoryEvent(history, {
    id: createHistoryEventId(),
    sequence: nextSequence(history),
    type: "WORD_MOVE_COMMITTED",
    playerId: playerOneId,
    payload: {
      placedTiles: [],
      words: [],
      scoreAwarded: 0,
      usedUnknownWordApproval: false,
    },
  });
}

function withPass(history: ReturnType<typeof createGameHistory>, playerId = playerTwoId) {
  return addHistoryEvent(history, {
    id: createHistoryEventId(),
    sequence: nextSequence(history),
    type: "PASS",
    playerId,
    payload: {},
  });
}

function withRejection(history: ReturnType<typeof createGameHistory>) {
  return addHistoryEvent(history, {
    id: createHistoryEventId(),
    sequence: nextSequence(history),
    type: "UNKNOWN_WORD_REJECTED",
    playerId: playerTwoId,
    payload: {
      proposingPlayerId: playerOneId,
      reviewingPlayerId: playerTwoId,
      words: [],
    },
  });
}

describe("activeWildLanguageIndex", () => {
  it("is language 0 before any turn has completed", () => {
    expect(activeWildLanguageIndex(createGameHistory(), 3)).toBe(0);
  });

  it("is still language 0 after only one player has completed a turn", () => {
    const history = withCommittedMove(createGameHistory());
    expect(activeWildLanguageIndex(history, 3)).toBe(0);
  });

  it("advances to language 1 once a full round (both players) has completed", () => {
    let history = createGameHistory();
    history = withCommittedMove(history);
    history = withPass(history);
    expect(activeWildLanguageIndex(history, 3)).toBe(1);
  });

  it("advances to language 2 after two full rounds", () => {
    let history = createGameHistory();
    for (let i = 0; i < 4; i++) {
      history = i % 2 === 0 ? withCommittedMove(history) : withPass(history);
    }
    expect(activeWildLanguageIndex(history, 3)).toBe(2);
  });

  it("cycles back to language 0 after enough full rounds to exceed the language count", () => {
    let history = createGameHistory();
    for (let i = 0; i < 6; i++) {
      history = i % 2 === 0 ? withCommittedMove(history) : withPass(history);
    }
    // 6 completed turns = 3 full rounds; with 3 languages, 3 rounds wraps exactly back to 0.
    expect(activeWildLanguageIndex(history, 3)).toBe(0);
  });

  it("does not advance the round when a proposal is rejected", () => {
    let history = createGameHistory();
    history = withCommittedMove(history);
    history = withPass(history);
    // One full round has passed (language now 1). A rejection must not itself count as a turn.
    history = withRejection(history);
    expect(activeWildLanguageIndex(history, 3)).toBe(1);
  });

  it("counts TILES_EXCHANGED as a completed turn", () => {
    let history = createGameHistory();
    history = withCommittedMove(history);
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence: nextSequence(history),
      type: "TILES_EXCHANGED",
      playerId: playerTwoId,
      payload: { tileCount: 3 },
    });
    expect(activeWildLanguageIndex(history, 2)).toBe(1);
  });

  it("works correctly with only two configured languages", () => {
    let history = createGameHistory();
    expect(activeWildLanguageIndex(history, 2)).toBe(0);
    history = withCommittedMove(history);
    history = withPass(history);
    expect(activeWildLanguageIndex(history, 2)).toBe(1);
    history = withCommittedMove(history);
    history = withPass(history);
    expect(activeWildLanguageIndex(history, 2)).toBe(0);
  });
});
