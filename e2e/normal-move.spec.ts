import { expect, test } from "@playwright/test";
import {
  continueHandoff,
  findTwoLetterWord,
  getCurrentPlayerName,
  getRackLetters,
  otherPlayerName,
  placeWordAtCentre,
  startNewGame,
  submitMove,
} from "./helpers";

// roadmap.md Milestone 4.3 / tasks.md T22.1: create game -> start turn -> play a valid
// dictionary-word move -> commit -> handoff -> next player begins.
test("a dictionary-valid move commits directly and hands off to the next player", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const firstPlayer = await getCurrentPlayerName(page);
  const secondPlayer = otherPlayerName(firstPlayer);

  const rackLetters = await getRackLetters(page);
  const pick = findTwoLetterWord(rackLetters, ["DICTIONARY_WORD"]);
  test.skip(
    !pick,
    `No two-letter Swedish dictionary word could be formed from this rack: ${rackLetters.join(", ")}`,
  );
  if (!pick) return;

  await placeWordAtCentre(page, pick.letters);
  await submitMove(page);

  // A dictionary word never opens the unknown-word dialog; it goes straight to handoff.
  await expect(page.getByRole("dialog", { name: "Okänt ord" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText(`Lämna över enheten till ${secondPlayer}.`),
  ).toBeVisible();

  await continueHandoff(page);
  await expect(page.getByText(`Din tur: ${secondPlayer}`)).toBeVisible();

  // The word the previous player played is now part of the committed board.
  const boardCell = page.locator('[data-coordinate="7,7"]');
  await expect(boardCell).toContainText(pick.word[0]);
});
