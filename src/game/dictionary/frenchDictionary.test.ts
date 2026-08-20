import { describe, expect, it } from "vitest";
import { createFrenchDictionary } from "./frenchDictionary";

describe("createFrenchDictionary", () => {
  const dictionary = createFrenchDictionary();

  it("recognizes normal French words", () => {
    expect(dictionary.isWord("MAISON")).toBe(true);
    expect(dictionary.isWord("CHAT")).toBe(true);
    expect(dictionary.isWord("CHIEN")).toBe(true);
    expect(dictionary.isWord("GARÇON")).toBe(true);
  });

  it("recognizes words containing accented letters", () => {
    expect(dictionary.isWord("ÊTRE")).toBe(true);
    expect(dictionary.isWord("ÉCOLE")).toBe(true);
    expect(dictionary.isWord("NOËL")).toBe(true);
  });

  it("does not recognize the unaccented form of a word that requires an accent", () => {
    expect(dictionary.isWord("ETRE")).toBe(false);
    expect(dictionary.isWord("ECOLE")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(dictionary.isWord("maison")).toBe(true);
    expect(dictionary.isWord("Maison")).toBe(true);
    expect(dictionary.isWord("MAISON")).toBe(true);
  });

  it("recognizes ordinary grammatical forms (verb conjugations)", () => {
    expect(dictionary.isWord("MANGER")).toBe(true); // infinitive
    expect(dictionary.isWord("MANGEA")).toBe(true); // passé simple
    expect(dictionary.isWord("MANGEAIENT")).toBe(true); // imparfait, 3rd plural
  });

  it("recognizes months and weekdays as ordinary dictionary words", () => {
    expect(dictionary.isWord("JANVIER")).toBe(true);
    expect(dictionary.isWord("LUNDI")).toBe(true);
  });

  it("does not recognize a country name, since Lexique383 is a common-vocabulary lexicon without proper names", () => {
    expect(dictionary.isWord("FRANCE")).toBe(false);
  });

  it("does not recognize an invented nonsense word", () => {
    expect(dictionary.isWord("GRÖMPFEL")).toBe(false);
  });

  it("does not recognize multi-word phrases, hyphenated compounds, or apostrophe'd contractions", () => {
    expect(dictionary.isWord("abat-jour")).toBe(false);
    expect(dictionary.isWord("aujourd'hui")).toBe(false);
    expect(dictionary.isWord("a capella")).toBe(false);
  });
});
