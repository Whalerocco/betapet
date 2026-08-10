import { describe, expect, it } from "vitest";
import { SWEDISH_SCRABBLE_TILE_DEFINITIONS } from "./swedishScrabbleTiles";

function findLetter(letter: string) {
  const definition = SWEDISH_SCRABBLE_TILE_DEFINITIONS.find(
    (d) => d.kind === "LETTER" && d.letter === letter,
  );
  if (!definition || definition.kind !== "LETTER") {
    throw new Error(`No definition found for letter ${letter}`);
  }
  return definition;
}

describe("SWEDISH_SCRABBLE_TILE_DEFINITIONS", () => {
  it("totals exactly 100 physical tiles", () => {
    const total = SWEDISH_SCRABBLE_TILE_DEFINITIONS.reduce(
      (sum, d) => sum + d.count,
      0,
    );
    expect(total).toBe(100);
  });

  it("does not include Q or W", () => {
    const letters = SWEDISH_SCRABBLE_TILE_DEFINITIONS.filter(
      (d) => d.kind === "LETTER",
    ).map((d) => (d.kind === "LETTER" ? d.letter : ""));
    expect(letters).not.toContain("Q");
    expect(letters).not.toContain("W");
  });

  it("includes Å, Ä, Ö", () => {
    expect(findLetter("Å").count).toBe(2);
    expect(findLetter("Ä").count).toBe(2);
    expect(findLetter("Ö").count).toBe(2);
  });

  it.each([
    ["A", 8, 1],
    ["E", 7, 1],
    ["N", 6, 1],
    ["R", 8, 1],
    ["S", 8, 1],
    ["T", 8, 1],
    ["Z", 1, 10],
    ["X", 1, 8],
    ["C", 1, 8],
  ])(
    "has the correct count and point value for %s",
    (letter, count, points) => {
      const definition = findLetter(letter);
      expect(definition.count).toBe(count);
      expect(definition.points).toBe(points);
    },
  );

  it("has exactly two blank tiles worth zero points", () => {
    const blank = SWEDISH_SCRABBLE_TILE_DEFINITIONS.find(
      (d) => d.kind === "BLANK",
    );
    expect(blank?.count).toBe(2);
    expect(blank?.points).toBe(0);
  });

  it("has no duplicate letter definitions", () => {
    const letters = SWEDISH_SCRABBLE_TILE_DEFINITIONS.filter(
      (d) => d.kind === "LETTER",
    ).map((d) => (d.kind === "LETTER" ? d.letter : ""));
    expect(new Set(letters).size).toBe(letters.length);
  });
});
