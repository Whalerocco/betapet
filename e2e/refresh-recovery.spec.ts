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

// roadmap.md Milestone 3.4 / tasks.md T22.4: refreshing mid-game never destroys progress or
// exposes a rack outside a privacy-safe handoff (ui-design.md section 38).

test("refresh during a normal pending move resumes behind a handoff screen with tiles intact", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const currentPlayer = await getCurrentPlayerName(page);
  const rackLetters = await getRackLetters(page);
  await placeWordAtCentre(page, [rackLetters[0], rackLetters[1]]);
  await expect(page.locator('[data-coordinate="7,7"]')).toContainText(
    rackLetters[0],
  );

  await page.reload();
  await page.getByRole("button", { name: "Fortsätt spel" }).click();

  // A refresh always lands behind a resume handoff, never straight back into the rack view.
  await expect(page.getByText("Spelet är redo att fortsätta.")).toBeVisible();
  await continueHandoff(page);

  await expect(page.getByText(`Din tur: ${currentPlayer}`)).toBeVisible();
  await expect(page.locator('[data-coordinate="7,7"]')).toContainText(
    rackLetters[0],
  );
  await expect(page.locator('[data-coordinate="7,8"]')).toContainText(
    rackLetters[1],
  );
});

test("refresh while awaiting opponent review resumes behind a handoff addressed to the reviewer", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const proposer = await getCurrentPlayerName(page);
  const reviewer = otherPlayerName(proposer);

  const rackLetters = await getRackLetters(page);
  const pick = findTwoLetterWord(rackLetters, ["UNKNOWN_WORD"]);
  test.skip(!pick, "No unknown two-letter combination available this rack.");
  if (!pick) return;

  await placeWordAtCentre(page, pick.letters);
  await submitMove(page);
  await page
    .getByRole("dialog", { name: "Okänt ord" })
    .getByRole("button", { name: "Spela ändå" })
    .click();

  await page.reload();
  await page.getByRole("button", { name: "Fortsätt spel" }).click();

  await expect(page.getByText("Spelet är redo att fortsätta.")).toBeVisible();
  await expect(page.getByText(`Lämna enheten till ${reviewer}.`)).toBeVisible();
  await continueHandoff(page);

  await expect(page.getByText(`vill spela "${pick.word}"`)).toBeVisible();
});

test("refresh after a rejection resumes behind a handoff addressed to the original proposer", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const proposer = await getCurrentPlayerName(page);

  const rackLetters = await getRackLetters(page);
  const pick = findTwoLetterWord(rackLetters, ["UNKNOWN_WORD"]);
  test.skip(!pick, "No unknown two-letter combination available this rack.");
  if (!pick) return;

  await placeWordAtCentre(page, pick.letters);
  await submitMove(page);
  await page
    .getByRole("dialog", { name: "Okänt ord" })
    .getByRole("button", { name: "Spela ändå" })
    .click();
  await continueHandoff(page);
  await page.getByRole("button", { name: "Neka" }).click();

  await page.reload();
  await page.getByRole("button", { name: "Fortsätt spel" }).click();

  await expect(page.getByText("Spelet är redo att fortsätta.")).toBeVisible();
  await expect(page.getByText(`Lämna enheten till ${proposer}.`)).toBeVisible();
  await continueHandoff(page);

  await expect(page.getByText(`Din tur: ${proposer}`)).toBeVisible();
  await expect(page.locator('[data-coordinate="7,7"]')).toContainText(
    pick.word[0],
  );
});
