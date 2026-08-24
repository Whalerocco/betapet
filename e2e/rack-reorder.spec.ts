import { expect, test, type Locator, type Page } from "@playwright/test";
import { getRackLetters, startSeededGame } from "./helpers";

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

/**
 * By position rather than by letter: a rack can hold the same letter twice, and "the first tile
 * showing an A" is not necessarily the one a test means to move.
 */
function rackTileAt(page: Page, index: number): Locator {
  return page.locator('[aria-label="Din hand"] button').nth(index);
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
  const { rackLetters: before } = await startSeededGame(page);

  // Dropped well inside the left half of the fourth tile, not on the seam between two tiles: a
  // seam is exactly where a pixel either way changes the answer, which is what made this flaky.
  const target = (await rackTileAt(page, 3).boundingBox())!;
  await dragTo(page, rackTileAt(page, 0), {
    x: target.x + target.width * 0.25,
    y: target.y + target.height / 2,
  });

  // The first tile lifts out and goes back in ahead of the tile it was dropped on, so the two it
  // passed shift down one place and everything after it is untouched.
  const after = await getRackLetters(page);
  expect(after).toEqual([before[1], before[2], before[0], ...before.slice(3)]);
});

test("dropping past the last tile puts it at the end", async ({ page }) => {
  const { rackLetters: before } = await startSeededGame(page);

  const last = (await rackTileAt(page, before.length - 1).boundingBox())!;
  await dragTo(page, rackTileAt(page, 0), {
    x: last.x + last.width - 2,
    y: last.y + last.height / 2,
  });

  expect(await getRackLetters(page)).toEqual([...before.slice(1), before[0]]);
});

test("dragging a rack tile onto the board still places it", async ({
  page,
}) => {
  const { rackLetters } = await startSeededGame(page);

  const letter = rackLetters.find((l) => /^[A-ZÅÄÖ]$/.test(l))!;
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
