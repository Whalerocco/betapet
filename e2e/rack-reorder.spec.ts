import { expect, test, type Locator, type Page } from "@playwright/test";
import { continueHandoff, getRackLetters, startNewGame } from "./helpers";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

/** Presses a tile, crosses useTileDrag's movement threshold, and releases at `to`. */
async function dragTo(
  page: Page,
  source: Locator,
  to: { x: number; y: number },
): Promise<void> {
  const from = (await source.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from.x + from.width / 2 + 12,
    from.y + from.height / 2 + 12,
    { steps: 4 },
  );
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}

function rackTile(page: Page, letter: string): Locator {
  return page
    .locator('[aria-label="Din hand"] button', {
      hasText: new RegExp(`^${letter}\\d*$`),
    })
    .first();
}

// Rearranging the rack needs real layout: the drop position is worked out from where the tiles
// actually are on screen, which jsdom cannot answer.
test("dragging a rack tile drops it between the two tiles it landed between", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const before = await getRackLetters(page);
  const moved = before[0];
  // Aim at the gap between the third and fourth tiles.
  const third = (await rackTile(page, before[2]).boundingBox())!;
  const fourth = (await rackTile(page, before[3]).boundingBox())!;

  await dragTo(page, rackTile(page, moved), {
    x: (third.x + third.width + fourth.x) / 2,
    y: third.y + third.height / 2,
  });

  const after = await getRackLetters(page);
  // The dragged tile left the front and landed in the gap it was dropped into; the tiles it
  // passed slid up, and the hand still holds exactly the same letters.
  expect(after).not.toEqual(before);
  expect([...after].sort()).toEqual([...before].sort());
  expect(after.indexOf(moved)).toBeGreaterThan(0);
  expect(after.slice(0, 2)).toEqual(before.slice(1, 3));
});

test("dragging a rack tile onto the board still places it", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const letter = (await getRackLetters(page)).find((l) =>
    /^[A-ZÅÄÖ]$/.test(l),
  )!;
  const centre = (await page.locator('[data-coordinate="7,7"]').boundingBox())!;

  await dragTo(page, rackTile(page, letter), {
    x: centre.x + centre.width / 2,
    y: centre.y + centre.height / 2,
  });

  await expect(
    page
      .locator('[data-coordinate="7,7"]')
      .getByLabel(`Pending bricka ${letter}, tryck för att redigera`),
  ).toBeVisible();
});
