import { describe, expect, it } from "vitest";
import {
  loadLanguageClassificationRules,
  loadLanguageClassificationRulesFor,
} from "./loadLanguageClassificationRules";

// Each language's dictionary is a multi-MB JSON, dynamically imported (that's the whole point —
// see the module doc comment). Under a full, parallel test-suite run this can be slow to
// transform the first time, so each language gets its own generous per-test timeout rather than
// bundling all five into one test that could exceed any single reasonable budget.
const TIMEOUT_MS = 30000;

describe("loadLanguageClassificationRules", () => {
  it(
    "resolves working Swedish classification rules",
    async () => {
      const rules = await loadLanguageClassificationRules("sv");
      expect(rules.dictionary.isWord("SKOG")).toBe(true);
    },
    TIMEOUT_MS,
  );

  it(
    "resolves working German classification rules",
    async () => {
      const rules = await loadLanguageClassificationRules("de");
      expect(rules.dictionary.isWord("HAUS")).toBe(true);
    },
    TIMEOUT_MS,
  );

  it(
    "resolves working French classification rules",
    async () => {
      const rules = await loadLanguageClassificationRules("fr");
      expect(rules.dictionary.isWord("MAISON")).toBe(true);
    },
    TIMEOUT_MS,
  );

  it(
    "resolves working English classification rules",
    async () => {
      const rules = await loadLanguageClassificationRules("en");
      expect(rules.dictionary.isWord("HOUSE")).toBe(true);
    },
    TIMEOUT_MS,
  );

  it(
    "resolves working Spanish classification rules",
    async () => {
      const rules = await loadLanguageClassificationRules("es");
      expect(rules.dictionary.isWord("CASA")).toBe(true);
    },
    TIMEOUT_MS,
  );
});

describe("loadLanguageClassificationRulesFor", () => {
  it(
    "resolves multiple languages, preserving order",
    async () => {
      const [german, french] = await loadLanguageClassificationRulesFor([
        "de",
        "fr",
      ]);
      expect(german.dictionary.isWord("HAUS")).toBe(true);
      expect(german.dictionary.isWord("MAISON")).toBe(false);
      expect(french.dictionary.isWord("MAISON")).toBe(true);
      expect(french.dictionary.isWord("HAUS")).toBe(false);
    },
    TIMEOUT_MS,
  );

  it("resolves an empty list to an empty array", async () => {
    expect(await loadLanguageClassificationRulesFor([])).toEqual([]);
  });
});
