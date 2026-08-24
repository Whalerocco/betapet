import type { Page } from "@playwright/test";
import { createGame } from "../src/game/engine/createGame";
import type { RackSize } from "../src/game/model/gameConfiguration";
import type { ModifierId } from "../src/game/model/modifiers";
import { classifyWord } from "../src/game/dictionary/classifyWord";
import type { WordValidationResult } from "../src/game/model/wordValidationResult";
import { createSwedishWordClassificationRules } from "../src/game/dictionary/swedishWordClassificationRules";

// Loads the real ~885k-word Swedish dictionary once per test file (not once per test) so tests
// can pick a genuinely DICTIONARY_WORD or UNKNOWN_WORD pair from whatever the rack happens to
// contain, instead of guessing against the live UI and risking an accidental commit.
let rules: ReturnType<typeof createSwedishWordClassificationRules> | undefined;
function getRules() {
  rules ??= createSwedishWordClassificationRules();
  return rules;
}

export interface StartGameOptions {
  readonly playerOneName?: string;
  readonly playerTwoName?: string;
  /**
   * Gameplay modifiers to tick at setup, by their on-screen label (`modifierCopy.ts`) — e.g.
   * "Ersättningsläge" for Replace mode. Omitted for a standard game.
   */
  readonly modifierLabels?: readonly string[];
}

export async function startNewGame(
  page: Page,
  {
    playerOneName = "Alice",
    playerTwoName = "Bob",
    modifierLabels = [],
  }: StartGameOptions = {},
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Nytt spel" }).click();
  await page.getByLabel("Spelare 1").fill(playerOneName);
  await page.getByLabel("Spelare 2").fill(playerTwoName);
  for (const label of modifierLabels) {
    // Each checkbox's accessible name is its label followed by the modifier's description
    // (`GameSetup.tsx`), so match on the leading label rather than the full string.
    await page.getByRole("checkbox", { name: new RegExp(`^${label}`) }).check();
  }
  await page.getByRole("button", { name: "Starta spel" }).click();
}

/** Passes through whichever handoff screen is currently showing (ui-design.md section 24-25). */
export async function continueHandoff(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Fortsätt" }).click();
}

/**
 * The starting player is decided by a random tile draw (game-rules.md section 2, DEC-002), not
 * by setup order — "Alice" is not guaranteed to go first. Tests must read whoever's turn it
 * actually is rather than assuming.
 */
export async function getCurrentPlayerName(page: Page): Promise<string> {
  const text = await page.getByText(/^Din tur: /).textContent();
  const name = text?.replace("Din tur:", "").trim();
  if (!name) throw new Error("Could not read the current player's name.");
  return name;
}

export function otherPlayerName(
  currentPlayerName: string,
  { playerOneName = "Alice", playerTwoName = "Bob" }: StartGameOptions = {},
): string {
  return currentPlayerName === playerOneName ? playerTwoName : playerOneName;
}

/** Reads the current player's rack letters in on-screen order, skipping unresolved blanks. */
export async function getRackLetters(page: Page): Promise<string[]> {
  const labels = await page
    .locator('[aria-label="Din hand"] button[aria-label^="Bricka "]')
    .evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute("aria-label") ?? ""),
    );
  return labels.map((label) => {
    // A Replace-mode displaced tile carries a ", ersatt bricka" suffix (Rack.tsx).
    const match = /^Bricka (.+), \d+ poäng(?:, .+)?$/.exec(label);
    if (!match) throw new Error(`Unexpected rack tile aria-label: ${label}`);
    return match[1];
  });
}

export interface WordPick {
  readonly letters: readonly [string, string];
  readonly word: string;
  readonly result: WordValidationResult;
}

/**
 * Finds a two-tile combination from the given rack letters whose formed word classifies as one
 * of `desiredStatuses`, using the real Swedish dictionary rules directly (no browser round-trip,
 * no trial-and-error against the live UI). Every ordered pair is tried so word direction/order
 * matters (e.g. "NE" vs "EN").
 */
export function findTwoLetterWord(
  rackLetters: readonly string[],
  desiredStatuses: readonly WordValidationResult["status"][],
): WordPick | undefined {
  const classificationRules = getRules();
  for (let i = 0; i < rackLetters.length; i++) {
    for (let j = 0; j < rackLetters.length; j++) {
      if (i === j) continue;
      const word = rackLetters[i] + rackLetters[j];
      const result = classifyWord(word, classificationRules);
      if (desiredStatuses.includes(result.status)) {
        return { letters: [rackLetters[i], rackLetters[j]], word, result };
      }
    }
  }
  return undefined;
}

/** Clicks the first rack tile matching `letter`, then the given board coordinate ("row,col"). */
export async function placeLetterAt(
  page: Page,
  letter: string,
  coordinate: string,
): Promise<void> {
  await page
    .locator('[aria-label="Din hand"] button', {
      hasText: new RegExp(`^${letter}\\d*$`),
    })
    .first()
    .click();
  await page.locator(`[data-coordinate="${coordinate}"]`).click();
}

/** Places a two-letter word horizontally, starting at the board centre (row 7, column 7). */
export async function placeWordAtCentre(
  page: Page,
  letters: readonly [string, string],
): Promise<void> {
  await placeLetterAt(page, letters[0], "7,7");
  await placeLetterAt(page, letters[1], "7,8");
}

export async function submitMove(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Spela", exact: true }).click();
}

export async function passTurn(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Passa", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Bekräfta passning" })
    .getByRole("button", { name: "Passa" })
    .click();
}

/**
 * A deterministic replacement for Math.random (mulberry32), so a seeded game deals the same tiles
 * on every run.
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeededGame {
  readonly currentPlayer: string;
  readonly otherPlayer: string;
  readonly rackLetters: readonly string[];
  /** Present only when a word was asked for; the seed is chosen so that it always is. */
  readonly pick?: WordPick;
}

const PLAYER_ONE = "Alice";
const PLAYER_TWO = "Bob";

/**
 * Starts a game whose tiles are dealt from a fixed seed, so a test that needs particular letters
 * gets the same ones every run.
 *
 * The game is built here in the test process and written straight into the storage the app reads
 * on load, then resumed through the normal UI. Nothing is added to the application for the sake
 * of testing: `createGame` already accepts a random source, because the engine's own tests need
 * one, and the save format is the app's own.
 *
 * With `requireWord`, seeds are tried until one deals a rack that can form a two-letter word of
 * the wanted kind. That keeps the choice deterministic while letting it re-derive itself if the
 * dictionary or the tile set ever changes — where a hard-coded seed would quietly start skipping.
 */
export async function startSeededGame(
  page: Page,
  options: {
    readonly requireWord?: readonly WordValidationResult["status"][];
    readonly modifiers?: readonly ModifierId[];
    readonly rackSize?: RackSize;
  } = {},
): Promise<SeededGame> {
  const { requireWord, modifiers = [], rackSize = 7 } = options;

  for (let seed = 1; seed <= 500; seed++) {
    const state = createGame({
      playerOneName: PLAYER_ONE,
      playerTwoName: PLAYER_TWO,
      rackSize,
      modifiers: new Set(modifiers),
      randomSource: seededRandom(seed),
    });
    const current = state.players.find((p) => p.id === state.currentPlayerId)!;
    const letters = current.rack.tileIds.map((id) => {
      const tile = state.tiles[id];
      return tile.kind === "LETTER" ? tile.letter : "_";
    });
    const pick = requireWord
      ? findTwoLetterWord(letters, requireWord)
      : undefined;
    if (requireWord && !pick) continue;

    const saved = {
      schemaVersion: 3,
      configurationId: state.configurationId,
      rackSize,
      modifiers,
      polyglotLanguages: [],
      wildLanguages: [],
      savedAt: new Date().toISOString(),
      gameState: state,
    };
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      ["betapet:local-game", JSON.stringify(saved)] as const,
    );
    await page.goto("/");
    await page.getByRole("button", { name: "Fortsätt spel" }).click();
    await continueHandoff(page);

    return {
      currentPlayer: current.name,
      otherPlayer: current.name === PLAYER_ONE ? PLAYER_TWO : PLAYER_ONE,
      rackLetters: letters,
      pick,
    };
  }

  throw new Error(
    `No seed under 500 dealt a rack able to form a ${requireWord?.join("/")} word.`,
  );
}
