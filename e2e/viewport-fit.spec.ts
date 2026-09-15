import { expect, test, type Page } from "@playwright/test";
import { continueHandoff, passTurn, startNewGame } from "./helpers";

/**
 * A mobile browser shows and hides its address bar in response to *document* scrolling, and each
 * toggle resizes the viewport and shifts the layout — including out from under a finger mid-drag.
 * No API turns that off, so the playing view is pinned to the visible height and scrolls inside
 * itself instead. These tests hold that property, which is invisible until it breaks.
 */
async function startGame(page: Page): Promise<void> {
  await startNewGame(page);
  await continueHandoff(page);
}

function documentScrolls(page: Page) {
  return page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
}

test.describe("playing view", () => {
  test.use({
    viewport: { width: 390, height: 700 },
    isMobile: true,
    hasTouch: true,
  });

  test("fits the viewport, so the document never scrolls", async ({ page }) => {
    await startGame(page);

    expect(await documentScrolls(page)).toBe(false);

    // Everything needed to take a turn is on screen, not merely un-scrollable.
    const height = page.viewportSize()!.height;
    for (const name of ["Spela", "Rensa", "Byt brickor", "Passa"]) {
      const box = (await page
        .getByRole("button", { name, exact: true })
        .boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
    const rack = (await page.locator('[aria-label="Din hand"]').boundingBox())!;
    expect(rack.y + rack.height).toBeLessThanOrEqual(height);
  });

  /*
   * The history drawer is the one thing that lifts the pinning, and the trade is deliberate: the
   * pinning protects a tile drag from the address bar, and a player reading the history is not
   * dragging. The game-over screen makes the same trade below, for the same reason.
   *
   * On a phone the drawer therefore starts closed, or the view would be un-pinned for most
   * players most of the time — which would give back the protection entirely.
   */
  test("starts closed on a phone, so the view is pinned while playing", async ({
    page,
  }) => {
    await startGame(page);

    await expect(page.locator("details")).not.toHaveAttribute("open", "");
    expect(await documentScrolls(page)).toBe(false);
  });

  test("lets the page scroll while the history drawer is open, and pins it again after", async ({
    page,
  }) => {
    await startGame(page);
    // A few entries, so the open drawer has something to run past the fold with. Three passes,
    // not more: a fourth would end the game (`game-rules.md`: players * 2 consecutive passes).
    for (let i = 0; i < 3; i++) {
      await passTurn(page);
      await continueHandoff(page);
    }

    await page.getByText("Historik").click();
    await expect(page.locator("details")).toHaveAttribute("open", "");

    // The whole drawer can be reached, which is the point of lifting the pinning. Scrolling the
    // *document* is what does it — the scroller a phone handles most reliably.
    //
    // Measured in the page with getBoundingClientRect, which is viewport-relative; Playwright's
    // own boundingBox is not, once the document has been scrolled.
    // Polled: the pinning is lifted on React's re-render, so a scroll attempted in the same tick
    // as the toggle would find a document that still cannot scroll.
    await expect
      .poll(() =>
        page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          const details = document.querySelector("details")!;
          return (
            details.getBoundingClientRect().bottom <= window.innerHeight + 1
          );
        }),
      )
      .toBe(true);

    // Closing it puts the protection back.
    await page.getByText("Historik").click();
    await expect(page.locator("details")).not.toHaveAttribute("open", "");
    // Polled rather than read once: the pinning returns on React's re-render, not on the toggle.
    await expect.poll(() => documentScrolls(page)).toBe(false);
  });

  test("still fits on a small phone, with the overflow reachable inside the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await startGame(page);

    expect(await documentScrolls(page)).toBe(false);

    // The history ends up below the fold at this size, so the layout itself has to scroll — the
    // alternative would be content nobody can reach.
    const layout = page.locator('[class*="layout"]').first();
    expect(
      await layout.evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);

    await layout.evaluate((el) => el.scrollBy(0, 200));
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const history = (await page.getByText("Historik").boundingBox())!;
    expect(history.y).toBeLessThan(640);
  });
});

test.describe("game-over view", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  // The review screen is deliberately not pinned: it is long, nothing is dragged on it, and the
  // address bar moving while reading the final position costs nothing.
  test("scrolls normally", async ({ page }) => {
    await startGame(page);
    await page.getByRole("button", { name: "Avsluta spel" }).click();
    await page
      .getByRole("dialog", { name: "Bekräfta att avsluta spelet" })
      .getByRole("button", { name: "Avsluta spel" })
      .click();

    await expect(
      page.getByRole("heading", { name: "Spelet är slut" }),
    ).toBeVisible();
    expect(await documentScrolls(page)).toBe(true);
  });
});
