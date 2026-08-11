import { describe, expect, it } from "vitest";
import { classifyWord, type WordClassificationRules } from "./classifyWord";
import { createDictionary } from "./dictionary";
import { createSwedishWordClassificationRules } from "./swedishWordClassificationRules";

function syntheticRules(
  overrides: Partial<WordClassificationRules> = {},
): WordClassificationRules {
  return {
    dictionary: createDictionary(["SKOG", "HUS"]),
    properNounOnly: new Set(["AARON"]),
    abbreviationOnly: new Set(["BBC"]),
    allowedCountries: new Set(["SVERIGE"]),
    allowedMonths: new Set(["JANUARI"]),
    allowedWeekdays: new Set(["MÅNDAG"]),
    allowedAbbreviations: new Set(["IT"]),
    ...overrides,
  };
}

describe("classifyWord (synthetic rules)", () => {
  it("classifies an ordinary dictionary word", () => {
    const result = classifyWord("skog", syntheticRules());
    expect(result).toEqual({
      word: "skog",
      normalizedWord: "SKOG",
      status: "DICTIONARY_WORD",
    });
  });

  it("classifies a one-letter word as forbidden regardless of dictionary content", () => {
    const rules = syntheticRules({ dictionary: createDictionary(["A"]) });
    const result = classifyWord("a", rules);
    expect(result).toEqual({
      word: "a",
      normalizedWord: "A",
      status: "FORBIDDEN_WORD",
      reason: "ONE_LETTER_WORD",
    });
  });

  it("classifies a proper-noun-only word as forbidden", () => {
    const result = classifyWord("Aaron", syntheticRules());
    expect(result).toEqual({
      word: "Aaron",
      normalizedWord: "AARON",
      status: "FORBIDDEN_WORD",
      reason: "PROPER_OR_PLACE_NAME",
    });
  });

  it("classifies an abbreviation-only word as forbidden", () => {
    const result = classifyWord("BBC", syntheticRules());
    expect(result).toEqual({
      word: "BBC",
      normalizedWord: "BBC",
      status: "FORBIDDEN_WORD",
      reason: "ABBREVIATION",
    });
  });

  it("allows an explicitly allowed abbreviation despite the abbreviation-only exclusion", () => {
    const rules = syntheticRules({
      abbreviationOnly: new Set(["IT"]),
      dictionary: createDictionary(["IT"]),
    });
    const result = classifyWord("IT", rules);
    expect(result.status).toBe("DICTIONARY_WORD");
  });

  it("allows a country despite being proper-noun-only in the raw data", () => {
    const rules = syntheticRules({
      properNounOnly: new Set(["SVERIGE"]),
      dictionary: createDictionary(["SVERIGE"]),
    });
    const result = classifyWord("Sverige", rules);
    expect(result.status).toBe("DICTIONARY_WORD");
  });

  it("allows a month despite being proper-noun-only in the raw data", () => {
    const rules = syntheticRules({
      properNounOnly: new Set(["JANUARI"]),
      dictionary: createDictionary(["JANUARI"]),
    });
    expect(classifyWord("Januari", rules).status).toBe("DICTIONARY_WORD");
  });

  it("allows a weekday despite being proper-noun-only in the raw data", () => {
    const rules = syntheticRules({
      properNounOnly: new Set(["MÅNDAG"]),
      dictionary: createDictionary(["MÅNDAG"]),
    });
    expect(classifyWord("Måndag", rules).status).toBe("DICTIONARY_WORD");
  });

  it("classifies a word not in the dictionary as unknown, not forbidden", () => {
    const result = classifyWord("GRÖMP", syntheticRules());
    expect(result).toEqual({
      word: "GRÖMP",
      normalizedWord: "GRÖMP",
      status: "UNKNOWN_WORD",
    });
  });

  it("classifies a word present in the accepted vocabulary", () => {
    const acceptedVocabulary = new Set(["GRÖMP"]);
    const result = classifyWord("grömp", syntheticRules(), acceptedVocabulary);
    expect(result).toEqual({
      word: "grömp",
      normalizedWord: "GRÖMP",
      status: "ACCEPTED_IN_GAME",
    });
  });

  it("is case-insensitive throughout", () => {
    expect(classifyWord("SKOG", syntheticRules()).status).toBe(
      "DICTIONARY_WORD",
    );
    expect(classifyWord("Skog", syntheticRules()).status).toBe(
      "DICTIONARY_WORD",
    );
    expect(classifyWord("skog", syntheticRules()).status).toBe(
      "DICTIONARY_WORD",
    );
  });
});

describe("classifyWord (real Swedish rules)", () => {
  const rules = createSwedishWordClassificationRules();

  it("accepts an ordinary word", () => {
    expect(classifyWord("SKOG", rules).status).toBe("DICTIONARY_WORD");
  });

  it("forbids a personal name that has no other dictionary sense", () => {
    const result = classifyWord("AARON", rules);
    expect(result.status).toBe("FORBIDDEN_WORD");
    expect(result.reason).toBe("PROPER_OR_PLACE_NAME");
  });

  it("forbids a real abbreviation", () => {
    const result = classifyWord("BBC", rules);
    expect(result.status).toBe("FORBIDDEN_WORD");
    expect(result.reason).toBe("ABBREVIATION");
  });

  it("allows a country that is proper-noun-only in the raw dictionary data", () => {
    // KIRIBATI is tagged as a proper noun in SALDO with no other sense, so this specifically
    // exercises the country allow-list overriding the general proper-noun exclusion.
    expect(classifyWord("KIRIBATI", rules).status).toBe("DICTIONARY_WORD");
    expect(classifyWord("NORGE", rules).status).toBe("DICTIONARY_WORD");
    expect(classifyWord("SVERIGE", rules).status).toBe("DICTIONARY_WORD");
  });

  it("allows all twelve months and seven weekdays", () => {
    const months = [
      "JANUARI",
      "FEBRUARI",
      "MARS",
      "APRIL",
      "MAJ",
      "JUNI",
      "JULI",
      "AUGUSTI",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DECEMBER",
    ];
    const weekdays = [
      "MÅNDAG",
      "TISDAG",
      "ONSDAG",
      "TORSDAG",
      "FREDAG",
      "LÖRDAG",
      "SÖNDAG",
    ];
    for (const month of months) {
      expect(classifyWord(month, rules).status).not.toBe("FORBIDDEN_WORD");
    }
    for (const weekday of weekdays) {
      expect(classifyWord(weekday, rules).status).not.toBe("FORBIDDEN_WORD");
    }
  });

  it("forbids one-letter words", () => {
    const result = classifyWord("A", rules);
    expect(result).toEqual({
      word: "A",
      normalizedWord: "A",
      status: "FORBIDDEN_WORD",
      reason: "ONE_LETTER_WORD",
    });
  });

  it("classifies an invented nonsense word as unknown", () => {
    expect(classifyWord("GRÖMP", rules).status).toBe("UNKNOWN_WORD");
  });
});
