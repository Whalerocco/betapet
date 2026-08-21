import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  continueHandoff,
  findTwoLetterWord,
  getRackLetters,
  placeWordAtCentre,
  startNewGame,
  submitMove,
} from "./helpers";

/**
 * Pointer-drags one element onto another, the way `useTileDrag` expects: press, cross the 6px
 * movement threshold, then release over the target. Playwright is what makes this meaningful —
 * `GameScreen`'s drop resolution reads `document.elementFromPoint`, which needs real layout, so
 * a jsdom test could only assert against a stubbed hit test.
 */
async function dragOnto(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag source or target is not visible.");

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2 + 12,
    from.y + from.height / 2 + 12,
    { steps: 4 },
  );
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 8,
  });
  await page.mouse.up();
}

/** How many tiles showing `letter` are in the current player's rack right now. */
async function countInRack(page: Page, letter: string): Promise<number> {
  const letters = await getRackLetters(page);
  return letters.filter((rackLetter) => rackLetter === letter).length;
}

function rackTile(page: Page, letter: string): Locator {
  return page
    .locator('[aria-label="Din hand"] button', {
      hasText: new RegExp(`^${letter}\\d*$`),
    })
    .first();
}

// A drag needs its source and target on screen at the same time, and the 15x15 board plus the
// rack is taller than the default 720px viewport — measuring a box that sits below the fold
// yields coordinates the mouse can never reach.
test.use({ viewport: { width: 1280, height: 1400 } });

// known-bugs.md Replace 1: replacing a tile is only reachable by dragging — `MOVE_TILE` has no
// click-flow equivalent, and a cell holding a committed tile is not a placement button. Both
// drag paths carry the modifier through `dispatchGameAction`'s `allowReplace` option
// (gameController.ts), which no engine test can cover: the engine was already correct when
// dragging a *pending* tile onto an occupied cell silently did nothing.
test("Replace mode: a tile can be dragged onto a committed tile, from the rack and from the board", async ({
  page,
}) => {
  await startNewGame(page, { modifierLabels: ["Ersättningsläge"] });
  await continueHandoff(page);
  // The badge only renders on the game screen itself, past the opening handoff.
  await expect(page.getByText("Ersättningsläge")).toBeVisible();

  const firstRack = await getRackLetters(page);
  const pick = findTwoLetterWord(firstRack, ["DICTIONARY_WORD"]);
  test.skip(
    !pick,
    `No two-letter Swedish dictionary word could be formed from this rack: ${firstRack.join(", ")}`,
  );
  if (!pick) return;

  await placeWordAtCentre(page, pick.letters);
  await submitMove(page);
  await continueHandoff(page);

  const centre = page.locator('[data-coordinate="7,7"]');
  const nextCell = page.locator('[data-coordinate="7,8"]');
  const [centreLetter, nextLetter] = pick.letters;

  // DEC-015: a replacement has to change the cell's letter, so the replacing tile must differ
  // from both committed letters (it visits both cells below).
  const secondRack = await getRackLetters(page);
  const replacement = secondRack.find(
    (letter) =>
      /^[A-ZÅÄÖ]$/.test(letter) &&
      letter !== centreLetter &&
      letter !== nextLetter,
  );
  test.skip(
    !replacement,
    `This rack has no letter that differs from both committed letters: ${secondRack.join(", ")}`,
  );
  if (!replacement) return;

  const centreLettersInRackBefore = await countInRack(page, centreLetter);
  const nextLettersInRackBefore = await countInRack(page, nextLetter);

  // PLACE_TILE onto an occupied cell: drag a rack tile onto the opponent's committed tile.
  await dragOnto(page, rackTile(page, replacement), centre);

  await expect(
    centre.getByLabel(`Pending bricka ${replacement}, tryck för att redigera`),
  ).toBeVisible();
  // The displaced tile goes to the replacing player's rack, not back to whoever played it
  // (DEC-008).
  expect(await countInRack(page, centreLetter)).toBe(
    centreLettersInRackBefore + 1,
  );

  // MOVE_TILE onto a different occupied cell: drag the tile that is now pending on the centre
  // over to the second committed tile. Its first displacement must be reversed as it leaves.
  await dragOnto(
    page,
    page.getByLabel(`Pending bricka ${replacement}, tryck för att redigera`),
    nextCell,
  );

  await expect(
    nextCell.getByLabel(
      `Pending bricka ${replacement}, tryck för att redigera`,
    ),
  ).toBeVisible();
  await expect(centre).toContainText(centreLetter);
  expect(await countInRack(page, centreLetter)).toBe(centreLettersInRackBefore);
  expect(await countInRack(page, nextLetter)).toBe(nextLettersInRackBefore + 1);
});
