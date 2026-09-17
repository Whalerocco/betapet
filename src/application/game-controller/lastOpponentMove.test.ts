import { describe, expect, it } from "vitest";

import {
  addHistoryEvent,
  createGameHistory,
  nextSequence,
  type GameHistory,
  type HistoryEvent,
} from "../../game/model/history";
import {
  createHistoryEventId,
  createPlayerId,
  createTileId,
  type PlayerId,
  type TileId,
} from "../../game/model/ids";
import { lastOpponentMove } from "./lastOpponentMove";

const ME = createPlayerId();
const THEM = createPlayerId();

/**
 * `Omit` over a union collapses its members into their common properties, which loses `playerId`
 * — so the omission is distributed over the union instead, leaving each event shape intact.
 */
type NewHistoryEvent = HistoryEvent extends infer Event
  ? Event extends HistoryEvent
    ? Omit<Event, "id" | "sequence">
    : never
  : never;

function add(history: GameHistory, event: NewHistoryEvent): GameHistory {
  return addHistoryEvent(history, {
    id: createHistoryEventId(),
    sequence: nextSequence(history),
    ...event,
  } as HistoryEvent);
}

/** A committed word move by `playerId`, placing one tile per letter on row 7. */
function wordMove(
  history: GameHistory,
  playerId: PlayerId,
  word: string,
  tileIds: readonly TileId[],
  scoreAwarded = 12,
): GameHistory {
  return add(history, {
    type: "WORD_MOVE_COMMITTED",
    playerId,
    payload: {
      placedTiles: tileIds.map((tileId, index) => ({
        tileId,
        coordinate: { row: 7, column: 7 + index },
      })),
      words: [word],
      scoreAwarded,
      usedUnknownWordApproval: false,
    },
  });
}

describe("lastOpponentMove", () => {
  it("returns the tiles the opponent placed in their most recent move", () => {
    const theirs = [createTileId(), createTileId(), createTileId()];
    const history = wordMove(createGameHistory(), THEM, "ORD", theirs, 18);

    const move = lastOpponentMove(history, ME);

    expect(move).toEqual({
      playerId: THEM,
      tileIds: new Set(theirs),
      words: ["ORD"],
      scoreAwarded: 18,
    });
  });

  it("returns nothing once this player has committed a move of their own", () => {
    let history = wordMove(createGameHistory(), THEM, "ORD", [createTileId()]);
    history = wordMove(history, ME, "SVAR", [createTileId()]);

    // This is the whole clearing rule: the mark goes when you play, with nothing to reset.
    expect(lastOpponentMove(history, ME)).toBeUndefined();
  });

  it("marks only the most recent of the opponent's moves", () => {
    const older = [createTileId()];
    const newer = [createTileId(), createTileId()];
    let history = wordMove(createGameHistory(), THEM, "ORD", older);
    history = wordMove(history, ME, "SVAR", [createTileId()]);
    history = wordMove(history, THEM, "NYTT", newer);

    expect(lastOpponentMove(history, ME)?.tileIds).toEqual(new Set(newer));
  });

  it("keeps the move marked across a pass, an exchange and a rejected proposal", () => {
    const theirs = [createTileId(), createTileId()];
    let history = wordMove(createGameHistory(), THEM, "ORD", theirs);
    history = add(history, { type: "PASS", playerId: ME, payload: {} });
    history = add(history, {
      type: "TILES_EXCHANGED",
      playerId: THEM,
      payload: { tileCount: 3 },
    });
    history = add(history, {
      type: "UNKNOWN_WORD_REJECTED",
      playerId: ME,
      payload: {
        proposingPlayerId: ME,
        reviewingPlayerId: THEM,
        words: ["QWZ"],
      },
    });

    // None of those changed a square, so the board's newest change is still their word.
    expect(lastOpponentMove(history, ME)?.tileIds).toEqual(new Set(theirs));
  });

  it("returns nothing for a game with no committed moves", () => {
    const history = add(createGameHistory(), {
      type: "GAME_STARTED",
      payload: {},
    });

    expect(lastOpponentMove(history, ME)).toBeUndefined();
    expect(lastOpponentMove(createGameHistory(), ME)).toBeUndefined();
  });

  it("is per viewer: the same history marks the other player's move for each of them", () => {
    const theirs = [createTileId()];
    const mine = [createTileId()];
    let history = wordMove(createGameHistory(), THEM, "ORD", theirs);
    history = wordMove(history, ME, "SVAR", mine);

    expect(lastOpponentMove(history, THEM)?.tileIds).toEqual(new Set(mine));
    expect(lastOpponentMove(history, ME)).toBeUndefined();
  });
});
