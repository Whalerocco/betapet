import type { Page } from "@playwright/test";
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
}

export async function startNewGame(
  page: Page,
  { playerOneName = "Alice", playerTwoName = "Bob" }: StartGameOptions = {},
): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Nytt spel" }).click();
  await page.getByLabel("Spelare 1").fill(playerOneName);
  await page.getByLabel("Spelare 2").fill(playerTwoName);
  await page.getByRole("button", { name: "Starta spel" }).click();
}

/** Passes through whichever handoff screen is currently showing (ui-design.md section 24-25). */
export async function continueHandoff(page: Page): Promise<void> {
  await page.getByRole("button", { name: /^(Fortsätt|Börja tur)$/ }).click();
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
    const match = /^Bricka (.+), \d+ poäng$/.exec(label);
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
  await page.getByRole("dialog", { name: "Bekräfta passning" }).getByRole("button", { name: "Passa" }).click();
}
