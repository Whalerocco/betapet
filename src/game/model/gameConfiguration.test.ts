import { describe, expect, it } from "vitest";
import { createBoardDefinition } from "./board";
import { createGameConfiguration } from "./gameConfiguration";

function testBoard() {
  return createBoardDefinition(15, 15, { row: 7, column: 7 }, []);
}

describe("createGameConfiguration", () => {
  it("defaults to no modifiers", () => {
    const configuration = createGameConfiguration(
      "test",
      "sv",
      testBoard(),
      7,
    );
    expect(configuration.modifiers.size).toBe(0);
  });

  it("stores an explicit modifier selection", () => {
    const configuration = createGameConfiguration(
      "test",
      "sv",
      testBoard(),
      7,
      new Set(["REPLACE"]),
    );
    expect(configuration.modifiers.has("REPLACE")).toBe(true);
    expect(configuration.modifiers.has("ILLEGAL")).toBe(false);
  });

  it("rejects an empty id", () => {
    expect(() =>
      createGameConfiguration("", "sv", testBoard(), 7),
    ).toThrow();
  });

  it("rejects an empty language", () => {
    expect(() =>
      createGameConfiguration("test", "", testBoard(), 7),
    ).toThrow();
  });
});
