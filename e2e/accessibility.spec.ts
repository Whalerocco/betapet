import { expect, test } from "@playwright/test";

import { continueHandoff, startSeededGame, submitMove } from "./helpers";

/*
 * The evidence behind "Core accessibility requirements work" on the Version 1 checklist
 * (`tasks.md` section 44), against Milestone 4.2's exit criterion: core gameplay is usable
 * without a mouse, and important state is not communicated only through colour.
 *
 * Nothing here clicks. Playwright's `press` focuses the element and sends the key, which is what
 * a keyboard user does; a control that only responds to a click fails these.
 */

test("a whole move can be played without a mouse", async ({ page }) => {
  const { otherPlayer, pick } = await startSeededGame(page, {
    requireWord: ["DICTIONARY_WORD"],
  });
  const [first, second] = pick!.letters;

  const rackTile = (letter: string) =>
    page
      .locator('[aria-label="Din hand"] button', {
        hasText: new RegExp(`^${letter}\\d*$`),
      })
      .first();

  // Select a tile with the keyboard, and confirm the rack says so in a way a screen reader reads.
  await rackTile(first).press("Enter");
  await expect(rackTile(first)).toHaveAttribute("aria-pressed", "true");

  // The centre square is a real button once a tile is selected, so Enter places onto it.
  await page.locator('[data-coordinate="7,7"]').press("Enter");
  await rackTile(second).press("Enter");
  await page.locator('[data-coordinate="7,8"]').press("Enter");

  await submitMove(page);

  await expect(
    page.getByText(`Lämna över enheten till ${otherPlayer}.`),
  ).toBeVisible();
  await continueHandoff(page);
  await expect(page.getByText(`Din tur: ${otherPlayer}`)).toBeVisible();
});

/*
 * `known-bugs.md` item 12: `aria-pressed` was on every tile rendered as a button, so a pending
 * board tile was announced as a two-state control that was "not pressed". A rack tile really does
 * toggle; a pending tile does something once and is done.
 */
test("only the tiles that toggle are announced as toggles", async ({
  page,
}) => {
  const { pick } = await startSeededGame(page, {
    requireWord: ["DICTIONARY_WORD"],
  });
  const [first] = pick!.letters;

  const rackTile = page
    .locator('[aria-label="Din hand"] button', {
      hasText: new RegExp(`^${first}\\d*$`),
    })
    .first();

  await expect(rackTile).toHaveAttribute("aria-pressed", "false");
  await rackTile.press("Enter");
  await expect(rackTile).toHaveAttribute("aria-pressed", "true");

  await page.locator('[data-coordinate="7,7"]').press("Enter");

  const pendingTile = page.locator(
    '[data-coordinate="7,7"] button[aria-label^="Pending bricka"]',
  );
  await expect(pendingTile).toBeVisible();
  // The tile is a button that does something, and must not claim a pressed state it has not got.
  expect(await pendingTile.getAttribute("aria-pressed")).toBeNull();
});

/*
 * `ui-design.md` section 43: colour is not the only indicator of multiplier type, and section 45
 * requires the full meaning to be available even where the square draws a compact abbreviation
 * ("2O", "★"). The accessible name is where that full meaning lives.
 */
test("a multiplier square says what it is, not only what colour it is", async ({
  page,
}) => {
  await startSeededGame(page);

  /*
   * The long forms `multiplierLabel.ts` defines. It knows more kinds than this board uses —
   * ×4 and minus squares, and a distinct start square, belong to a configuration Version 1 does
   * not ship (DEC-009: the standard Scrabble board, whose centre is an ordinary double-word
   * square). So the assertion is that every label is one of the known long forms, and that each
   * kind the board actually has is among them.
   */
  const FULL_LABELS = [
    "Dubbel bokstavspoäng",
    "Tredubbel bokstavspoäng",
    "Fyrdubbel bokstavspoäng",
    "Minus dubbel bokstavspoäng",
    "Dubbelt ordvärde",
    "Tredubbelt ordvärde",
    "Fyrdubbelt ordvärde",
    "Startruta",
  ];

  const labels = await page
    .locator('[aria-label="Spelplan"] [data-coordinate][aria-label]')
    .evaluateAll((cells) =>
      cells.map((cell) => cell.getAttribute("aria-label") ?? ""),
    );

  expect(labels.length).toBeGreaterThan(0);
  for (const label of labels) expect(FULL_LABELS).toContain(label);

  expect([...new Set(labels)].sort()).toEqual([
    "Dubbel bokstavspoäng",
    "Dubbelt ordvärde",
    "Tredubbel bokstavspoäng",
    "Tredubbelt ordvärde",
  ]);

  // The abbreviation is drawn and the long form is announced, which is what section 45 asks for:
  // a compact label on the board is fine as long as the accessible name carries the meaning.
  const centre = page.locator('[data-coordinate="7,7"]');
  await expect(centre).toHaveAttribute("aria-label", "Dubbelt ordvärde");
  await expect(centre).toContainText("2O");
});

/* The board and the hand are named regions, so they can be found rather than hunted for. */
test("the board and the hand have accessible names", async ({ page }) => {
  await startSeededGame(page);

  await expect(page.locator('[aria-label="Spelplan"]')).toBeVisible();
  await expect(page.locator('[aria-label="Din hand"]')).toBeVisible();
});
