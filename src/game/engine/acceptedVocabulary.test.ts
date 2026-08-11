import { describe, expect, it } from "vitest";
import { classifyWord } from "../dictionary/classifyWord";
import { createSwedishDictionary } from "../dictionary/swedishDictionary";
import { createSwedishWordClassificationRules } from "../dictionary/swedishWordClassificationRules";
import { createTestGame } from "../testing/fixtures";
import {
  acceptedVocabularySet,
  addAcceptedWord,
  isAcceptedInGame,
} from "./acceptedVocabulary";

describe("addAcceptedWord", () => {
  it("adds the normalized word to the game's accepted vocabulary", () => {
    const { state } = createTestGame();
    const updated = addAcceptedWord(state, "grömp");
    expect(updated.acceptedVocabulary).toEqual(["GRÖMP"]);
  });

  it("is a no-op if the word is already accepted", () => {
    const { state } = createTestGame();
    const once = addAcceptedWord(state, "grömp");
    const twice = addAcceptedWord(once, "GRÖMP");
    expect(twice.acceptedVocabulary).toEqual(["GRÖMP"]);
  });

  it("does not mutate the original state", () => {
    const { state } = createTestGame();
    addAcceptedWord(state, "grömp");
    expect(state.acceptedVocabulary).toEqual([]);
  });

  it("makes an accepted word valid later in the same game", () => {
    const { state } = createTestGame();
    const rules = createSwedishWordClassificationRules();

    const before = classifyWord("GRÖMP", rules, acceptedVocabularySet(state));
    expect(before.status).toBe("UNKNOWN_WORD");

    const updated = addAcceptedWord(state, "GRÖMP");
    const after = classifyWord("GRÖMP", rules, acceptedVocabularySet(updated));
    expect(after.status).toBe("ACCEPTED_IN_GAME");
  });

  it("does not modify the global dictionary", () => {
    const { state } = createTestGame();
    addAcceptedWord(state, "GRÖMP");
    const dictionary = createSwedishDictionary();
    expect(dictionary.isWord("GRÖMP")).toBe(false);
  });

  it("does not affect a second, independent game", () => {
    const gameA = createTestGame().state;
    const gameB = createTestGame().state;

    const updatedA = addAcceptedWord(gameA, "GRÖMP");

    expect(updatedA.acceptedVocabulary).toEqual(["GRÖMP"]);
    expect(gameB.acceptedVocabulary).toEqual([]);
  });
});

describe("isAcceptedInGame", () => {
  it("returns false before acceptance", () => {
    const { state } = createTestGame();
    expect(isAcceptedInGame(state, "GRÖMP")).toBe(false);
  });

  it("returns true after acceptance, regardless of input casing", () => {
    const { state } = createTestGame();
    const updated = addAcceptedWord(state, "GRÖMP");
    expect(isAcceptedInGame(updated, "grömp")).toBe(true);
    expect(isAcceptedInGame(updated, "Grömp")).toBe(true);
  });
});
