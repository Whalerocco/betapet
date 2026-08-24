import { expect, test } from "@playwright/test";
import {
  continueHandoff,
  placeWordAtCentre,
  startSeededGame,
  submitMove,
} from "./helpers";

// roadmap.md Milestone 4.3 / tasks.md T22.3: unknown move -> proposer confirms -> opponent
// rejects -> handoff back -> original pending tiles restored -> proposer can edit them.
test("a rejected unknown word returns editable pending tiles to the proposer, awarding nothing", async ({
  page,
}) => {
  // Seeded, so the rack always contains a pair that forms a non-dictionary word — the same pair
  // on every run, instead of skipping whenever the draw happens not to offer one.
  const { currentPlayer: proposer, pick } = await startSeededGame(page, {
    requireWord: ["UNKNOWN_WORD"],
  });

  await placeWordAtCentre(page, pick!.letters);
  await submitMove(page);
  await page
    .getByRole("dialog", { name: "Okänt ord" })
    .getByRole("button", { name: "Spela ändå" })
    .click();
  await continueHandoff(page);

  await expect(page.getByText(`vill spela "${pick!.word}"`)).toBeVisible();
  await page.getByRole("button", { name: "Neka" }).click();

  await expect(page.getByText("Läggningen nekades.")).toBeVisible();
  await continueHandoff(page);

  // Back with the proposer: still their turn, no points awarded, and the tiles they placed are
  // still on the board as an editable pending move (game-rules.md section 18).
  await expect(page.getByText(`Din tur: ${proposer}`)).toBeVisible();
  await expect(page.getByText(`${proposer}: 0`)).toBeVisible();
  await expect(page.locator('[data-coordinate="7,7"]')).toContainText(
    pick!.word[0],
  );
  await expect(page.locator('[data-coordinate="7,8"]')).toContainText(
    pick!.word[1],
  );

  // The pending tiles are editable: removing one returns it to the rack. Clicked by the label
  // that exists only while the tile is offering to be picked back up — with a rack tile selected
  // the same tap would swap instead (DEC-017), and this would silently test the wrong thing.
  await page
    .getByLabel(`Pending bricka ${pick!.word[0]}, tryck för att redigera`)
    .first()
    .click();
  await expect(page.locator('[data-coordinate="7,7"]')).not.toContainText(
    pick!.word[0],
  );
  // The rack may already have held another tile with the same letter, so this only checks that
  // at least one such tile is present, not that it's uniquely identifiable by letter alone.
  await expect(
    page
      .locator('[aria-label="Din hand"]')
      .getByText(pick!.letters[0], { exact: true })
      .first(),
  ).toBeVisible();
});
