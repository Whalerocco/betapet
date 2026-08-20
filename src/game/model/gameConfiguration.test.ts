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

  it("defaults to empty polyglot/wild language selections", () => {
    const configuration = createGameConfiguration("test", "sv", testBoard(), 7);
    expect(configuration.polyglotLanguages).toEqual([]);
    expect(configuration.wildLanguages).toEqual([]);
  });

  it("rejects Polyglot mode with fewer than two selected languages", () => {
    expect(() =>
      createGameConfiguration(
        "test",
        "sv",
        testBoard(),
        7,
        new Set(["POLYGLOT"]),
        ["sv"],
      ),
    ).toThrow();
    expect(() =>
      createGameConfiguration(
        "test",
        "sv",
        testBoard(),
        7,
        new Set(["POLYGLOT"]),
        [],
      ),
    ).toThrow();
  });

  it("accepts Polyglot mode with two or more selected languages", () => {
    const configuration = createGameConfiguration(
      "test",
      "sv",
      testBoard(),
      7,
      new Set(["POLYGLOT"]),
      ["sv", "de"],
    );
    expect(configuration.polyglotLanguages).toEqual(["sv", "de"]);
  });

  it("rejects Wild mode with fewer than two selected languages", () => {
    expect(() =>
      createGameConfiguration(
        "test",
        "sv",
        testBoard(),
        7,
        new Set(["WILD"]),
        [],
        ["sv"],
      ),
    ).toThrow();
  });

  it("accepts Wild mode with two or more selected languages, preserving order", () => {
    const configuration = createGameConfiguration(
      "test",
      "sv",
      testBoard(),
      7,
      new Set(["WILD"]),
      [],
      ["fr", "sv", "de"],
    );
    expect(configuration.wildLanguages).toEqual(["fr", "sv", "de"]);
  });

  it("does not require polyglotLanguages/wildLanguages when neither modifier is selected", () => {
    expect(() =>
      createGameConfiguration(
        "test",
        "sv",
        testBoard(),
        7,
        new Set(["ILLEGAL"]),
      ),
    ).not.toThrow();
  });
});
