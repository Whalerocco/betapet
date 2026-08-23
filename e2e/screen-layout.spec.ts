import { expect, test, type Page } from "@playwright/test";
import {
  continueHandoff,
  findTwoLetterWord,
  getRackLetters,
  placeWordAtCentre,
  startNewGame,
  submitMove,
} from "./helpers";

/** Top edge of each major region, for asserting their order down the page. */
async function regionTops(page: Page) {
  const topOf = async (locator: ReturnType<Page["locator"]>) =>
    Math.round((await locator.boundingBox())!.y);
  return {
    board: await topOf(page.locator('[aria-label="Spelplan"]')),
    rack: await topOf(page.locator('[aria-label="Din hand"]')),
    actions: await topOf(page.getByRole("button", { name: "Passa" })),
    history: await topOf(page.getByText("Historik")),
  };
}

test.describe("mobile layout", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  // ui-design.md section 41: board -> rack -> actions -> history drawer. The order matters
  // because history grows with every turn; above the controls it would push "Spela" further down
  // the page the longer the game runs.
  test("stacks history below the action buttons, and keeps them put as history grows", async ({
    page,
  }) => {
    await startNewGame(page);
    await continueHandoff(page);

    const before = await regionTops(page);
    expect(before.board).toBeLessThan(before.rack);
    expect(before.rack).toBeLessThan(before.actions);
    expect(before.actions).toBeLessThan(before.history);

    const pick = findTwoLetterWord(await getRackLetters(page), [
      "DICTIONARY_WORD",
    ]);
    test.skip(!pick, "This rack cannot form a two-letter Swedish word.");
    if (!pick) return;
    await placeWordAtCentre(page, pick.letters);
    await submitMove(page);
    await continueHandoff(page);

    const after = await regionTops(page);
    // The committed move added a history line, and the controls did not move at all.
    expect(after.actions).toBe(before.actions);
    expect(after.history).toBeGreaterThan(after.actions);
  });
});

test.describe("desktop layout", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  // ui-design.md section 7/40: the wide layout keeps history in a side column, so reordering it
  // for mobile must not drag it under the board here.
  test("keeps history in a column beside the board", async ({ page }) => {
    await startNewGame(page);
    await continueHandoff(page);

    const board = (await page
      .locator('[aria-label="Spelplan"]')
      .boundingBox())!;
    const history = (await page.getByText("Historik").boundingBox())!;

    expect(history.x).toBeGreaterThan(board.x + board.width - 5);
    expect(history.y).toBeLessThan(board.y + board.height);
  });
});
