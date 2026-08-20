import { describe, expect, it, vi } from "vitest";
import type { WordClassificationRules } from "../dictionary/classifyWord";
import type { WordValidationResult } from "../model/wordValidationResult";
import { placeCommittedTile } from "../model/board";
import { createTileId, type TileId } from "../model/ids";
import { createLetterTile, type Tile } from "../model/tile";
import { buildEngineTestGame as buildTestGame } from "../testing/fixtures";
import { placeTile } from "./placeTile";
import { submitMove } from "./submitMove";

/**
 * game-modifiers.md section 8 says FORBIDDEN_WORD (one-letter words, DEC-007) "is unaffected"
 * by Illegal mode and "remain[s] hard-blocked". submitMove.ts checks FORBIDDEN_WORD before the
 * ILLEGAL modifier's DICTIONARY_WORD_NOT_ALLOWED check (tasks.md T32.4), but
 * detectFormedWords structurally never returns a single-letter word today, so that ordering
 * can't be exercised through a real board placement (the same pre-existing gap as T12.7/T12.8).
 * classifyWord is mocked here purely to make both classifications reachable in the same move,
 * so the ordering guarantee itself has a regression test even though the real word-length gap
 * remains open.
 */
vi.mock("../dictionary/classifyWord", () => ({
  classifyWord: vi.fn(
    (word: string): WordValidationResult =>
      word === "IX"
        ? {
            word,
            normalizedWord: "ix",
            status: "FORBIDDEN_WORD",
            reason: "ONE_LETTER_WORD",
          }
        : {
            word,
            normalizedWord: word.toLowerCase(),
            status: "DICTIONARY_WORD",
          },
  ),
}));

function letterTile(
  tiles: Record<TileId, Tile>,
  letter: string,
  points = 1,
): TileId {
  const id = createTileId();
  tiles[id] = createLetterTile(id, letter, points);
  return id;
}

describe("submitMove: FORBIDDEN_WORD takes precedence over Illegal mode", () => {
  it("rejects with FORBIDDEN_WORD rather than DICTIONARY_WORD_NOT_ALLOWED when a move forms both", () => {
    const setup = buildTestGame({
      playerOneRackLetters: ["B", "I", "L"],
      modifiers: new Set(["ILLEGAL"]),
    });
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
      // The mocked classifyWord above ignores this argument's content entirely.
      {} as WordClassificationRules,
      setup.playerOneId,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("FORBIDDEN_WORD");
  });
});
