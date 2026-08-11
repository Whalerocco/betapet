import { describe, expect, it } from "vitest";
import { createSwedishDictionary } from "./swedishDictionary";

describe("createSwedishDictionary", () => {
  const dictionary = createSwedishDictionary();

  it("recognizes normal Swedish words", () => {
    expect(dictionary.isWord("SKOG")).toBe(true);
    expect(dictionary.isWord("HUS")).toBe(true);
    expect(dictionary.isWord("BIL")).toBe(true);
    expect(dictionary.isWord("MÅNE")).toBe(true);
  });

  it("recognizes words containing Å, Ä, Ö", () => {
    expect(dictionary.isWord("VÄG")).toBe(true);
    expect(dictionary.isWord("ÖRA")).toBe(true);
    expect(dictionary.isWord("GÅRD")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(dictionary.isWord("skog")).toBe(true);
    expect(dictionary.isWord("Skog")).toBe(true);
    expect(dictionary.isWord("SKOG")).toBe(true);
  });

  it("recognizes ordinary grammatical forms", () => {
    expect(dictionary.isWord("HUSET")).toBe(true); // definite
    expect(dictionary.isWord("HUSEN")).toBe(true); // definite plural
    expect(dictionary.isWord("SPRINGER")).toBe(true); // present tense verb
    expect(dictionary.isWord("SPRANG")).toBe(true); // past tense verb
  });

  it("recognizes countries, months, and weekdays as ordinary dictionary words", () => {
    // Whether these are *allowed* by the game's word rules is a separate, later concern
    // (dictionary.md sections 12-14); this only checks raw dictionary presence.
    expect(dictionary.isWord("SVERIGE")).toBe(true);
    expect(dictionary.isWord("JANUARI")).toBe(true);
    expect(dictionary.isWord("MÅNDAG")).toBe(true);
  });

  it("still contains proper/place names, pending word classification (Milestone 2.2)", () => {
    // Not yet filtered out — game-rule forbidding of these categories is a later milestone.
    // This documents the current scope boundary rather than final gameplay behaviour.
    expect(dictionary.isWord("STOCKHOLM")).toBe(true);
  });

  it("does not recognize an invented nonsense word", () => {
    expect(dictionary.isWord("GRÖMP")).toBe(false);
  });

  it("does not recognize multi-word phrases or hyphenated compounds", () => {
    expect(dictionary.isWord("A-lag")).toBe(false);
    expect(dictionary.isWord("A lag")).toBe(false);
  });
});
