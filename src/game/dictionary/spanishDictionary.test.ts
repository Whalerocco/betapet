import { describe, expect, it } from "vitest";
import { createSpanishDictionary } from "./spanishDictionary";

describe("createSpanishDictionary", () => {
  const dictionary = createSpanishDictionary();

  it("recognizes normal Spanish words", () => {
    expect(dictionary.isWord("CASA")).toBe(true);
    expect(dictionary.isWord("PERRO")).toBe(true);
    expect(dictionary.isWord("GATO")).toBe(true);
  });

  it("recognizes words containing Ñ and accented letters", () => {
    expect(dictionary.isWord("NIÑO")).toBe(true);
    expect(dictionary.isWord("AÑO")).toBe(true);
    expect(dictionary.isWord("JAPONÉS")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(dictionary.isWord("casa")).toBe(true);
    expect(dictionary.isWord("Casa")).toBe(true);
    expect(dictionary.isWord("CASA")).toBe(true);
  });

  it("recognizes ordinary grammatical forms (verb conjugations)", () => {
    expect(dictionary.isWord("CORRO")).toBe(true); // 1st person present
    expect(dictionary.isWord("CORRIÓ")).toBe(true); // 3rd person preterite
  });

  it("recognizes months and weekdays as ordinary dictionary words", () => {
    expect(dictionary.isWord("ENERO")).toBe(true);
    expect(dictionary.isWord("LUNES")).toBe(true);
  });

  it("still contains proper/place names, pending word classification", () => {
    // Not filtered out at this layer — see spanishWordClassificationRules.test coverage below.
    expect(dictionary.isWord("ESPAÑA")).toBe(true);
    expect(dictionary.isWord("FRANCIA")).toBe(true);
  });

  it("does not recognize an invented nonsense word", () => {
    expect(dictionary.isWord("GRÖMPFEL")).toBe(false);
  });

  it("does not recognize multi-word phrases or hyphenated compounds", () => {
    expect(dictionary.isWord("fin-de-semana")).toBe(false);
    expect(dictionary.isWord("de nada")).toBe(false);
  });
});
