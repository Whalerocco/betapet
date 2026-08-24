import { expect, test, type Page } from "@playwright/test";
import { getRackLetters, startSeededGame } from "./helpers";

// A phone-sized viewport: the case the zoom exists for (ui-design.md sections 41-42), where the
// whole 15x15 board only fits at roughly 22px per cell.
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

/** Two-finger gestures need raw touch input; Playwright's own API only taps. */
async function pinch(
  page: Page,
  centre: { x: number; y: number },
  fromSpread: number,
  toSpread: number,
): Promise<void> {
  const client = await page.context().newCDPSession(page);
  const at = (spread: number) => [
    { x: centre.x - spread / 2, y: centre.y, id: 0 },
    { x: centre.x + spread / 2, y: centre.y, id: 1 },
  ];
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: at(fromSpread),
  });
  const steps = 6;
  for (let step = 1; step <= steps; step++) {
    const spread = fromSpread + ((toSpread - fromSpread) * step) / steps;
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: at(spread),
    });
    await page.waitForTimeout(30);
  }
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(200);
}

async function startGame(page: Page): Promise<void> {
  await startSeededGame(page);
}

test.describe("two-finger pinch", () => {
  // Synthesising a pinch needs the Chrome DevTools Protocol, which only Chromium exposes. The
  // zoom itself is plain CSS and JS — see the drift test below, which covers both engines.
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "pinch gestures need CDP",
  );

  test("pinching the board zooms the board without touching the rest of the page", async ({
    page,
  }) => {
    await startGame(page);

    const cell = page.locator('[data-coordinate="7,7"]');
    const rackTile = page.locator('[aria-label="Din hand"] button').first();
    const cellBefore = (await cell.boundingBox())!;
    const rackBefore = (await rackTile.boundingBox())!;

    await pinch(
      page,
      {
        x: cellBefore.x + cellBefore.width / 2,
        y: cellBefore.y + cellBefore.height / 2,
      },
      60,
      120,
    );

    const cellAfter = (await cell.boundingBox())!;
    const rackAfter = (await rackTile.boundingBox())!;

    // The board's tiles grew...
    expect(cellAfter.width).toBeGreaterThan(cellBefore.width * 1.8);
    // ...while the rack, and the page itself, stayed exactly as they were.
    expect(rackAfter.width).toBeCloseTo(rackBefore.width, 1);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);

    // The square the fingers were centred on is still under them, give or take the board's border.
    const drift = Math.hypot(
      cellAfter.x + cellAfter.width / 2 - (cellBefore.x + cellBefore.width / 2),
      cellAfter.y +
        cellAfter.height / 2 -
        (cellBefore.y + cellBefore.height / 2),
    );
    expect(drift).toBeLessThan(8);
  });

  test("a zoomed board can be panned and still places tiles on the right square", async ({
    page,
  }) => {
    await startGame(page);

    const centre = page.locator('[data-coordinate="7,7"]');
    const centreBefore = (await centre.boundingBox())!;
    await pinch(
      page,
      {
        x: centreBefore.x + centreBefore.width / 2,
        y: centreBefore.y + centreBefore.height / 2,
      },
      60,
      140,
    );

    // Drag across the board with one finger: that pans rather than placing anything.
    const viewport = page.locator('[class*="viewport"]').first();
    const box = (await viewport.boundingBox())!;
    const scrollBefore = await viewport.evaluate((el) => el.scrollLeft);
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2, {
      steps: 10,
    });
    await page.mouse.up();
    const scrollAfter = await viewport.evaluate((el) => el.scrollLeft);
    expect(scrollAfter).toBeGreaterThan(scrollBefore);

    // Hit-testing still lands on the intended square while zoomed and panned, because zoom scales
    // real layout rather than painting a transform over it.
    const letter = (await getRackLetters(page)).find((l) =>
      /^[A-ZÅÄÖ]$/.test(l),
    )!;
    await page
      .locator('[aria-label="Din hand"] button', {
        hasText: new RegExp(`^${letter}\\d*$`),
      })
      .first()
      .tap();
    await centre.scrollIntoViewIfNeeded();
    await centre.tap();

    await expect(
      centre.getByLabel(`Pending bricka ${letter}, tryck för att redigera`),
    ).toBeVisible();
  });

  test("the board can be returned to fit-to-width", async ({ page }) => {
    await startGame(page);

    const cell = page.locator('[data-coordinate="7,7"]');
    const before = (await cell.boundingBox())!;
    await pinch(
      page,
      { x: before.x + before.width / 2, y: before.y + before.height / 2 },
      60,
      120,
    );
    expect((await cell.boundingBox())!.width).toBeGreaterThan(before.width);

    await page.getByRole("button", { name: "Visa hela brädet" }).tap();

    const reset = (await cell.boundingBox())!;
    expect(reset.width).toBeCloseTo(before.width, 1);
    await expect(
      page.getByRole("button", { name: "Visa hela brädet" }),
    ).toHaveCount(0);
  });
});

/**
 * Zooming keeps the board under the fingers, checked in every engine.
 *
 * This drives the same code a pinch does, through ctrl+wheel, which needs no CDP. It exists
 * because the two diverged: a scroll container rounds the offset it is given in WebKit but not in
 * Chromium, and recomputing each step from the value read back threw away a fraction of a pixel
 * every time. Over a pinch's many steps the board crept visibly away from the fingers on iPhone
 * while looking fine in Chromium — so the guard has to be the accumulation, not one step.
 */
test("zooming keeps the point under the cursor, however many steps it takes", async ({
  page,
}) => {
  await startSeededGame(page);

  const cell = page.locator('[data-coordinate="4,4"]');
  const before = (await cell.boundingBox())!;
  const x = before.x + before.width / 2;
  const y = before.y + before.height / 2;

  // The same total zoom split over many small steps, which is what a real pinch produces.
  const steps = 40;
  for (let step = 0; step < steps; step++) {
    await page.evaluate(
      ([px, py, delta]) => {
        document.elementFromPoint(px, py)!.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: delta,
            ctrlKey: true,
            clientX: px,
            clientY: py,
            bubbles: true,
            cancelable: true,
          }),
        );
      },
      [x, y, -160 / steps],
    );
  }

  const after = (await cell.boundingBox())!;
  expect(after.width).toBeGreaterThan(before.width * 1.5);

  const drift = Math.hypot(
    after.x + after.width / 2 - x,
    after.y + after.height / 2 - y,
  );
  expect(drift).toBeLessThan(4);
});

