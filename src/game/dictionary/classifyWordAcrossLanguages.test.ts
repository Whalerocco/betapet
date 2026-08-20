import { describe, expect, it } from "vitest";
import { classifyWordAcrossLanguages } from "./classifyWordAcrossLanguages";
import type { WordClassificationRules } from "./classifyWord";
import { createDictionary } from "./dictionary";

function rules(
  words: readonly string[],
  overrides: Partial<WordClassificationRules> = {},
): WordClassificationRules {
  return {
    dictionary: createDictionary(words),
    properNounOnly: new Set(),
    abbreviationOnly: new Set(),
    allowedCountries: new Set(),
    allowedMonths: new Set(),
    allowedWeekdays: new Set(),
    allowedAbbreviations: new Set(),
    ...overrides,
  };
}

describe("classifyWordAcrossLanguages", () => {
  it("behaves exactly like classifyWord when given a single language", () => {
    const result = classifyWordAcrossLanguages("SKOG", [rules(["SKOG"])]);
    expect(result.status).toBe("DICTIONARY_WORD");
  });

  it("classifies a word as DICTIONARY_WORD if it matches any selected language", () => {
    // "HAUS" is German, not French — Polyglot should still accept it.
    const german = rules(["HAUS"]);
    const french = rules(["MAISON"]);
    const result = classifyWordAcrossLanguages("HAUS", [french, german]);
    expect(result.status).toBe("DICTIONARY_WORD");
  });

  it("does not care which position in the array matches", () => {
    const german = rules(["HAUS"]);
    const french = rules(["MAISON"]);
    const result = classifyWordAcrossLanguages("HAUS", [german, french]);
    expect(result.status).toBe("DICTIONARY_WORD");
  });

  it("classifies a word as UNKNOWN_WORD only if it matches no selected language", () => {
    const german = rules(["HAUS"]);
    const french = rules(["MAISON"]);
    const result = classifyWordAcrossLanguages("GRÖMPFEL", [german, french]);
    expect(result.status).toBe("UNKNOWN_WORD");
  });

  it("forbids a one-letter word regardless of any language's dictionary content", () => {
    const german = rules(["A"]);
    const french = rules(["A"]);
    const result = classifyWordAcrossLanguages("A", [german, french]);
    expect(result).toEqual({
      word: "A",
      normalizedWord: "A",
      status: "FORBIDDEN_WORD",
      reason: "ONE_LETTER_WORD",
    });
  });

  it("classifies a word already in the shared accepted vocabulary as accepted, even if no language's dictionary contains it", () => {
    const german = rules(["HAUS"]);
    const french = rules(["MAISON"]);
    const acceptedVocabulary = new Set(["GRÖMPFEL"]);
    const result = classifyWordAcrossLanguages(
      "GRÖMPFEL",
      [german, french],
      acceptedVocabulary,
    );
    expect(result.status).toBe("ACCEPTED_IN_GAME");
  });

  it("still classifies a word as unknown when it is proper-noun-only in every language but no language explicitly allows it", () => {
    const german = rules(["BERLIN"], { properNounOnly: new Set(["BERLIN"]) });
    const french = rules(["PARIS"], { properNounOnly: new Set(["PARIS"]) });
    expect(classifyWordAcrossLanguages("BERLIN", [german, french]).status).toBe(
      "UNKNOWN_WORD",
    );
  });

  it("allows a word that is proper-noun-only in one language but an explicit allow-list entry in another", () => {
    // Models e.g. a country name that's a dictionary entry needing the allow-list override in
    // one language (like Swedish/Spanish) but simply absent from another (like French/English).
    const restrictive = rules(["SVERIGE"], {
      properNounOnly: new Set(["SVERIGE"]),
    });
    const permissive = rules(["SVERIGE"], {
      properNounOnly: new Set(["SVERIGE"]),
      allowedCountries: new Set(["SVERIGE"]),
    });
    const result = classifyWordAcrossLanguages("SVERIGE", [
      restrictive,
      permissive,
    ]);
    expect(result.status).toBe("DICTIONARY_WORD");
  });
});
