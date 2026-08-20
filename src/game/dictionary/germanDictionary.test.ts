import { describe, expect, it } from "vitest";
import { createGermanDictionary } from "./germanDictionary";

describe("createGermanDictionary", () => {
  const dictionary = createGermanDictionary();

  it("recognizes normal German words", () => {
    expect(dictionary.isWord("HAUS")).toBe(true);
    expect(dictionary.isWord("BAUM")).toBe(true);
    expect(dictionary.isWord("HUND")).toBe(true);
    expect(dictionary.isWord("KATZE")).toBe(true);
  });

  it("recognizes words containing Ä, Ö, Ü", () => {
    expect(dictionary.isWord("SCHÖN")).toBe(true);
    expect(dictionary.isWord("GRÜN")).toBe(true);
    expect(dictionary.isWord("ÜBER")).toBe(true);
  });

  it("recognizes ß-derived words in their uppercase SS form", () => {
    // normalizeWord uppercases via standard Unicode case mapping, which turns ß into SS.
    expect(dictionary.isWord("STRASSE")).toBe(true);
    expect(dictionary.isWord("WEISS")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(dictionary.isWord("haus")).toBe(true);
    expect(dictionary.isWord("Haus")).toBe(true);
    expect(dictionary.isWord("HAUS")).toBe(true);
  });

  it("recognizes ordinary grammatical forms", () => {
    expect(dictionary.isWord("GEHEN")).toBe(true); // infinitive
    expect(dictionary.isWord("GING")).toBe(true); // past tense
    expect(dictionary.isWord("LÄUFT")).toBe(true); // present tense, 3rd person
  });

  it("recognizes months and weekdays as ordinary dictionary words", () => {
    expect(dictionary.isWord("JANUAR")).toBe(true);
    expect(dictionary.isWord("MONTAG")).toBe(true);
  });

  it("recognizes the country name Deutschland as an ordinary dictionary word", () => {
    // Whether this is *allowed* by the game's word rules is a separate concern
    // (dictionary.md sections 12-14); this only checks raw dictionary presence.
    expect(dictionary.isWord("DEUTSCHLAND")).toBe(true);
  });

  it("does not recognize city/place names, per the source's own curation policy", () => {
    expect(dictionary.isWord("BERLIN")).toBe(false);
  });

  it("does not recognize an invented nonsense word", () => {
    expect(dictionary.isWord("GRÖMPFEL")).toBe(false);
  });

  it("does not recognize multi-word phrases or hyphenated compounds", () => {
    expect(dictionary.isWord("A-Klasse")).toBe(false);
    expect(dictionary.isWord("A Klasse")).toBe(false);
  });
});
