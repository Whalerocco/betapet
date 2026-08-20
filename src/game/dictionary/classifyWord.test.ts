import { describe, expect, it } from "vitest";
import { classifyWord, type WordClassificationRules } from "./classifyWord";
import { createDictionary } from "./dictionary";
import { createEnglishWordClassificationRules } from "./englishWordClassificationRules";
import { createFrenchWordClassificationRules } from "./frenchWordClassificationRules";
import { createGermanWordClassificationRules } from "./germanWordClassificationRules";
import { createSpanishWordClassificationRules } from "./spanishWordClassificationRules";
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

  it("classifies a proper-noun-only word as unknown, not forbidden (DEC-007)", () => {
    const result = classifyWord("Aaron", syntheticRules());
    expect(result).toEqual({
      word: "Aaron",
      normalizedWord: "AARON",
      status: "UNKNOWN_WORD",
    });
  });

  it("classifies an abbreviation-only word as unknown, not forbidden (DEC-007)", () => {
    const result = classifyWord("BBC", syntheticRules());
    expect(result).toEqual({
      word: "BBC",
      normalizedWord: "BBC",
      status: "UNKNOWN_WORD",
    });
  });

  it("classifies a proper-noun-only word already in the accepted vocabulary as accepted, not unknown again", () => {
    const acceptedVocabulary = new Set(["AARON"]);
    const result = classifyWord("Aaron", syntheticRules(), acceptedVocabulary);
    expect(result).toEqual({
      word: "Aaron",
      normalizedWord: "AARON",
      status: "ACCEPTED_IN_GAME",
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

  it("classifies a personal name with no other dictionary sense as unknown, not forbidden (DEC-007)", () => {
    const result = classifyWord("AARON", rules);
    expect(result.status).toBe("UNKNOWN_WORD");
    expect(result.reason).toBeUndefined();
  });

  it("classifies a real abbreviation as unknown, not forbidden (DEC-007)", () => {
    const result = classifyWord("BBC", rules);
    expect(result.status).toBe("UNKNOWN_WORD");
  });

  it("classifies TV and STOCKHOLM as unknown (an abbreviation and a place name respectively)", () => {
    // Regression coverage: an earlier version of the preprocessing script paired partOfSpeech
    // with the whole SALDO entry instead of the specific FormRepresentation spelling variant,
    // which silently missed both of these (see src/data/dictionary/SOURCE-sv.md). Per DEC-007
    // these no longer block the move outright — they're proposable like any unknown word.
    const tv = classifyWord("TV", rules);
    expect(tv.status).toBe("UNKNOWN_WORD");

    const stockholm = classifyWord("STOCKHOLM", rules);
    expect(stockholm.status).toBe("UNKNOWN_WORD");
  });

  it("allows IT, which also has a genuine non-abbreviation dictionary sense", () => {
    // "IT" is tagged as an abbreviation (nna) in SALDO, but is also the definite form of the
    // letter "I" (an ordinary nn sense) — a word with any ordinary sense is not excluded.
    expect(classifyWord("IT", rules).status).toBe("DICTIONARY_WORD");
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

describe("classifyWord (real German rules)", () => {
  const rules = createGermanWordClassificationRules();

  it("accepts an ordinary word", () => {
    expect(classifyWord("HAUS", rules).status).toBe("DICTIONARY_WORD");
  });

  it("accepts a word containing ß in its uppercase SS form", () => {
    expect(classifyWord("STRASSE", rules).status).toBe("DICTIONARY_WORD");
  });

  it("classifies a city/place name as unknown, not forbidden (excluded by the source's own curation policy, not by a proper-noun-only tag)", () => {
    const result = classifyWord("BERLIN", rules);
    expect(result.status).toBe("UNKNOWN_WORD");
    expect(result.reason).toBeUndefined();
  });

  it("allows the country Deutschland as an ordinary dictionary word", () => {
    expect(classifyWord("DEUTSCHLAND", rules).status).toBe("DICTIONARY_WORD");
  });

  it("allows all twelve months and both Saturday spellings among the seven weekdays", () => {
    const months = [
      "JANUAR",
      "FEBRUAR",
      "MÄRZ",
      "APRIL",
      "MAI",
      "JUNI",
      "JULI",
      "AUGUST",
      "SEPTEMBER",
      "OKTOBER",
      "NOVEMBER",
      "DEZEMBER",
    ];
    const weekdays = [
      "MONTAG",
      "DIENSTAG",
      "MITTWOCH",
      "DONNERSTAG",
      "FREITAG",
      "SAMSTAG",
      "SONNABEND",
      "SONNTAG",
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
    expect(classifyWord("GRÖMPFEL", rules).status).toBe("UNKNOWN_WORD");
  });
});

describe("classifyWord (real English rules)", () => {
  const rules = createEnglishWordClassificationRules();

  it("accepts an ordinary word", () => {
    expect(classifyWord("HOUSE", rules).status).toBe("DICTIONARY_WORD");
  });

  it("classifies a month, weekday, and country name as unknown, not forbidden (SOURCE-en.md: ENABLE excludes proper nouns entirely, including months/weekdays which are capitalized in English)", () => {
    expect(classifyWord("JANUARY", rules).status).toBe("UNKNOWN_WORD");
    expect(classifyWord("MONDAY", rules).status).toBe("UNKNOWN_WORD");
    const result = classifyWord("SWEDEN", rules);
    expect(result.status).toBe("UNKNOWN_WORD");
    expect(result.reason).toBeUndefined();
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
    expect(classifyWord("GROMPFEL", rules).status).toBe("UNKNOWN_WORD");
  });
});

describe("classifyWord (real French rules)", () => {
  const rules = createFrenchWordClassificationRules();

  it("accepts an ordinary word", () => {
    expect(classifyWord("MAISON", rules).status).toBe("DICTIONARY_WORD");
  });

  it("accepts a word containing an accented letter", () => {
    expect(classifyWord("ÉCOLE", rules).status).toBe("DICTIONARY_WORD");
  });

  it("classifies a country name as unknown, not forbidden (SOURCE-fr.md: Lexique383 mostly omits country names entirely)", () => {
    const result = classifyWord("FRANCE", rules);
    expect(result.status).toBe("UNKNOWN_WORD");
    expect(result.reason).toBeUndefined();
  });

  it("allows all twelve months and seven weekdays", () => {
    const months = [
      "JANVIER",
      "FÉVRIER",
      "MARS",
      "AVRIL",
      "MAI",
      "JUIN",
      "JUILLET",
      "AOÛT",
      "SEPTEMBRE",
      "OCTOBRE",
      "NOVEMBRE",
      "DÉCEMBRE",
    ];
    const weekdays = [
      "LUNDI",
      "MARDI",
      "MERCREDI",
      "JEUDI",
      "VENDREDI",
      "SAMEDI",
      "DIMANCHE",
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
    expect(classifyWord("GRÖMPFEL", rules).status).toBe("UNKNOWN_WORD");
  });
});

describe("classifyWord (real Spanish rules)", () => {
  const rules = createSpanishWordClassificationRules();

  it("accepts an ordinary word", () => {
    expect(classifyWord("CASA", rules).status).toBe("DICTIONARY_WORD");
  });

  it("classifies a personal/place name with no other dictionary sense as unknown, not forbidden", () => {
    const result = classifyWord("AARHUS", rules);
    expect(result.status).toBe("UNKNOWN_WORD");
    expect(result.reason).toBeUndefined();
  });

  it("classifies a real abbreviation as unknown, not forbidden", () => {
    expect(classifyWord("ADN", rules).status).toBe("UNKNOWN_WORD");
  });

  it("allows a country that is proper-noun-only in the raw dictionary data", () => {
    // Unlike French/English, Spanish country names generally are dictionary entries (tagged
    // proper-noun-only), so this genuinely exercises the allow-list overriding the exclusion,
    // the same as Swedish's KIRIBATI/NORGE/SVERIGE test.
    expect(classifyWord("ESPAÑA", rules).status).toBe("DICTIONARY_WORD");
    expect(classifyWord("FRANCIA", rules).status).toBe("DICTIONARY_WORD");
  });

  it("allows all twelve months and seven weekdays", () => {
    const months = [
      "ENERO",
      "FEBRERO",
      "MARZO",
      "ABRIL",
      "MAYO",
      "JUNIO",
      "JULIO",
      "AGOSTO",
      "SEPTIEMBRE",
      "OCTUBRE",
      "NOVIEMBRE",
      "DICIEMBRE",
    ];
    const weekdays = [
      "LUNES",
      "MARTES",
      "MIÉRCOLES",
      "JUEVES",
      "VIERNES",
      "SÁBADO",
      "DOMINGO",
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
    expect(classifyWord("GRÖMPFEL", rules).status).toBe("UNKNOWN_WORD");
  });
});
