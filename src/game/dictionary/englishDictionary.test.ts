import { describe, expect, it } from "vitest";
import { createEnglishDictionary } from "./englishDictionary";

describe("createEnglishDictionary", () => {
  const dictionary = createEnglishDictionary();

  it("recognizes normal English words", () => {
    expect(dictionary.isWord("HOUSE")).toBe(true);
    expect(dictionary.isWord("DOG")).toBe(true);
    expect(dictionary.isWord("CAT")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(dictionary.isWord("house")).toBe(true);
    expect(dictionary.isWord("House")).toBe(true);
    expect(dictionary.isWord("HOUSE")).toBe(true);
  });

  it("recognizes ordinary grammatical forms", () => {
    expect(dictionary.isWord("RUN")).toBe(true);
    expect(dictionary.isWord("RUNNING")).toBe(true);
    expect(dictionary.isWord("RUNS")).toBe(true);
  });

  it("does not recognize months, weekdays, or country names, since ENABLE excludes proper nouns entirely", () => {
    expect(dictionary.isWord("JANUARY")).toBe(false);
    expect(dictionary.isWord("MONDAY")).toBe(false);
    expect(dictionary.isWord("SWEDEN")).toBe(false);
  });

  it("does not recognize a well-known city name", () => {
    expect(dictionary.isWord("LONDON")).toBe(false);
  });

  it("does not recognize an invented nonsense word", () => {
    expect(dictionary.isWord("GROMPFEL")).toBe(false);
  });

  it("does not recognize multi-word phrases or hyphenated compounds", () => {
    expect(dictionary.isWord("well-known")).toBe(false);
    expect(dictionary.isWord("ice cream")).toBe(false);
  });
});
