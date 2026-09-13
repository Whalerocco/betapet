import { expect, test } from "@playwright/test";

import { startSeededGame } from "./helpers";

/**
 * `known-bugs.md` item 8: tile text kept its proportions on iOS and lost them on Android, because
 * Chrome there enforces a *minimum font size* that floors a small computed `font-size`. On a phone
 * a board cell is about 22px, so the letter's intended 9px and the point value's intended 4px were
 * both floored to the same 12px — the point value came out as large as the letter.
 *
 * The browser is therefore launched the way the bug was reproduced, with that floor turned on. The
 * flag is Blink's, so the WebKit run simply sees an ordinary browser — which is the other half of
 * what these assert. An earlier fix for this bug was correct in Chromium and rendered `scale(0)`
 * in an older WebKit, making every glyph on the board vanish, so each expectation below also
 * insists the text has a size at all.
 */
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  launchOptions: { args: ["--blink-settings=minimumFontSize=12"] },
});

/** The design's own ratios, from `Tile.module.css`. */
const LETTER_RATIO = 0.42;
const POINTS_RATIO = 0.2;
const CAPTION_RATIO = 0.22;

test("a tile's point value stays smaller than its letter, even where small text is floored", async ({
  page,
}) => {
  await startSeededGame(page);

  const tile = page
    .getByRole("group", { name: "Din hand" })
    .locator("button")
    .first();
  const letter = await tile.locator("span").first().boundingBox();
  const points = await tile.locator("span").nth(1).boundingBox();

  expect(letter, "the letter is drawn at all").not.toBeNull();
  expect(points, "the point value is drawn at all").not.toBeNull();
  expect(letter!.height).toBeGreaterThan(0);
  expect(points!.height).toBeGreaterThan(0);

  // The whole defect in one number: floored, both were 12px and this ratio was 1.
  expect(points!.height / letter!.height).toBeCloseTo(
    POINTS_RATIO / LETTER_RATIO,
    1,
  );
});

test("tile text is proportional to the tile it is on", async ({ page }) => {
  await startSeededGame(page);

  const tile = page
    .getByRole("group", { name: "Din hand" })
    .locator("button")
    .first();
  const box = await tile.boundingBox();
  const letter = await tile.locator("span").first().boundingBox();

  expect(letter!.height).toBeCloseTo(box!.height * LETTER_RATIO, 0);
});

test("a board caption is drawn below the minimum font size the browser enforces", async ({
  page,
}) => {
  await startSeededGame(page);

  // A 22px cell wants a ~4.8px caption. Floored, it was 12px — wider than the square it labels.
  const caption = page.locator('[data-coordinate="0,0"] span').first();
  const cell = page.locator('[data-coordinate="0,0"]');

  const captionBox = await caption.boundingBox();
  const cellBox = await cell.boundingBox();

  expect(captionBox!.height).toBeGreaterThan(0);
  expect(captionBox!.height).toBeCloseTo(cellBox!.height * CAPTION_RATIO, 0);
  expect(captionBox!.height).toBeLessThan(12);
});
