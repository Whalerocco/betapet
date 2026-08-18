import { expect, test } from "@playwright/test";
import {
  continueHandoff,
  findTwoLetterWord,
  getCurrentPlayerName,
  getRackLetters,
  placeWordAtCentre,
  startNewGame,
  submitMove,
} from "./helpers";

// roadmap.md Milestone 4.3 / tasks.md T22.3: unknown move -> proposer confirms -> opponent
// rejects -> handoff back -> original pending tiles restored -> proposer can edit them.
test("a rejected unknown word returns editable pending tiles to the proposer, awarding nothing", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const proposer = await getCurrentPlayerName(page);

  const rackLetters = await getRackLetters(page);
  const pick = findTwoLetterWord(rackLetters, ["UNKNOWN_WORD"]);
  test.skip(
    !pick,
    `No two-letter non-dictionary combination could be formed from this rack: ${rackLetters.join(", ")}`,
  );
  if (!pick) return;

  await placeWordAtCentre(page, pick.letters);
  await submitMove(page);
  await page
    .getByRole("dialog", { name: "Okänt ord" })
    .getByRole("button", { name: "Spela ändå" })
    .click();
  await continueHandoff(page);

  await expect(page.getByText(`vill spela "${pick.word}"`)).toBeVisible();
  await page.getByRole("button", { name: "Neka" }).click();

  await expect(page.getByText("Läggningen nekades.")).toBeVisible();
  await continueHandoff(page);

  // Back with the proposer: still their turn, no points awarded, and the tiles they placed are
  // still on the board as an editable pending move (game-rules.md section 18).
  await expect(page.getByText(`Din tur: ${proposer}`)).toBeVisible();
  await expect(page.getByText(`${proposer}: 0`)).toBeVisible();
  await expect(page.locator('[data-coordinate="7,7"]')).toContainText(
    pick.word[0],
  );
  await expect(page.locator('[data-coordinate="7,8"]')).toContainText(
    pick.word[1],
  );

  // The pending tiles are editable: removing one returns it to the rack.
  await page.locator('[data-coordinate="7,7"]').getByRole("button").click();
  await expect(page.locator('[data-coordinate="7,7"]')).not.toContainText(
    pick.word[0],
  );
  // The rack may already have held another tile with the same letter, so this only checks that
  // at least one such tile is present, not that it's uniquely identifiable by letter alone.
  await expect(
    page
      .locator('[aria-label="Din hand"]')
      .getByText(pick.letters[0], { exact: true })
      .first(),
  ).toBeVisible();
});
