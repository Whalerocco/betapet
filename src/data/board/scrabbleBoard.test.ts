import { describe, expect, it } from "vitest";
import { getMultiplierAt } from "../../game/model/board";
import { SCRABBLE_BOARD_DEFINITION } from "./scrabbleBoard";

function countByMultiplier(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const cell of SCRABBLE_BOARD_DEFINITION.cells) {
    counts[cell.multiplier] = (counts[cell.multiplier] ?? 0) + 1;
  }
  return counts;
}

describe("SCRABBLE_BOARD_DEFINITION", () => {
  it("is 15x15", () => {
    expect(SCRABBLE_BOARD_DEFINITION.width).toBe(15);
    expect(SCRABBLE_BOARD_DEFINITION.height).toBe(15);
  });

  it("has its centre at (7, 7)", () => {
    expect(SCRABBLE_BOARD_DEFINITION.centreCoordinate).toEqual({
      row: 7,
      column: 7,
    });
  });

  it("has the standard count of each special square type", () => {
    const counts = countByMultiplier();
    expect(counts.WORD_X3).toBe(8);
    expect(counts.WORD_X2).toBe(17);
    expect(counts.LETTER_X3).toBe(12);
    expect(counts.LETTER_X2).toBe(24);
  });

  it("does not use Letter x4, Word x4, or Letter -x2 (Alfapet-only squares)", () => {
    const counts = countByMultiplier();
    expect(counts.LETTER_X4).toBeUndefined();
    expect(counts.WORD_X4).toBeUndefined();
    expect(counts.LETTER_MINUS_X2).toBeUndefined();
  });

  it("marks the four corners as Word x3", () => {
    expect(
      getMultiplierAt(SCRABBLE_BOARD_DEFINITION, { row: 0, column: 0 }),
    ).toBe("WORD_X3");
    expect(
      getMultiplierAt(SCRABBLE_BOARD_DEFINITION, { row: 0, column: 14 }),
    ).toBe("WORD_X3");
    expect(
      getMultiplierAt(SCRABBLE_BOARD_DEFINITION, { row: 14, column: 0 }),
    ).toBe("WORD_X3");
    expect(
      getMultiplierAt(SCRABBLE_BOARD_DEFINITION, { row: 14, column: 14 }),
    ).toBe("WORD_X3");
  });

  it("marks the centre square as Word x2", () => {
    expect(
      getMultiplierAt(SCRABBLE_BOARD_DEFINITION, { row: 7, column: 7 }),
    ).toBe("WORD_X2");
  });

  it("defaults ordinary squares to NONE", () => {
    expect(
      getMultiplierAt(SCRABBLE_BOARD_DEFINITION, { row: 4, column: 8 }),
    ).toBe("NONE");
  });
});
