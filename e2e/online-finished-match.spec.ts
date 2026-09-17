import { expect, test, type Page } from "@playwright/test";

import { createGame } from "../src/game/engine/createGame";
import type { GameState } from "../src/game/model/game";
import { addHistoryEvent, createGameHistory } from "../src/game/model/history";
import { createHistoryEventId } from "../src/game/model/ids";
import { toPlayerGameView } from "../src/game/view/playerGameView";

/**
 * The finished online match, in a real browser (`known-bugs.md` items 18-19).
 *
 * The online screens are otherwise out of reach of this suite: they need an account and a
 * database. The server's own responses are stubbed instead — the client is what is under test
 * here, and the shapes come from the real engine through the real `toPlayerGameView`, so a stub
 * cannot quietly contain something the server would never send.
 */

const MATCH_ID = "m1";

function finishedSnapshot() {
  const base = createGame({
    playerOneName: "August",
    playerTwoName: "Anna",
    rackSize: 7,
  });
  const [me, them] = base.players;

  // A real game's worth of history, which is what made the capped list a problem in play.
  let history = createGameHistory();
  for (let sequence = 0; sequence < 14; sequence += 1) {
    history = addHistoryEvent(history, {
      id: createHistoryEventId(),
      sequence,
      type: "WORD_MOVE_COMMITTED",
      playerId: sequence % 2 === 0 ? me.id : them.id,
      payload: {
        placedTiles: [],
        words: [`ORD${sequence}`],
        scoreAwarded: 10 + sequence,
        usedUnknownWordApproval: false,
      },
    });
  }

  const state = {
    ...base,
    history,
    status: "FINISHED",
    turnState: { type: "FINISHED" },
    result: {
      endReason: "CONSECUTIVE_PASSES",
      finalScores: { [me.id]: 210, [them.id]: 180 },
      remainingRackDeductions: { [me.id]: 4, [them.id]: 9 },
      winnerPlayerIds: [me.id],
    },
  } as GameState;

  return {
    matchId: MATCH_ID,
    revision: 9,
    status: "FINISHED",
    configuration: { rackSize: 7, modifiers: [] },
    opponent: { name: "Anna", handle: "anna" },
    view: toPlayerGameView(state, me.id),
  };
}

async function stubServer(page: Page) {
  const snapshot = finishedSnapshot();

  await page.route("**/api/auth/**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "s1",
          userId: "u1",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
        user: {
          id: "u1",
          name: "August",
          email: "august@example.com",
          emailVerified: true,
        },
      },
    }),
  );
  await page.route("**/api/notifications*", (route) =>
    route.fulfill({
      json: {
        notifications: [],
        counts: {
          YOUR_TURN: 0,
          MOVE_REJECTED: 0,
          AWAITING_YOUR_REVIEW: 0,
          MATCH_INVITATION: 0,
          MATCH_FINISHED: 0,
          FRIEND_REQUEST: 0,
        },
      },
    }),
  );
  await page.route("**/api/friends*", (route) =>
    route.fulfill({ json: { friends: [], incoming: [], outgoing: [] } }),
  );
  await page.route(`**/api/matches/${MATCH_ID}**`, (route) =>
    route.fulfill({ json: snapshot }),
  );
  await page.route("**/api/matches", (route) =>
    route.fulfill({
      json: {
        matches: [
          {
            id: MATCH_ID,
            category: "FINISHED",
            opponentName: "Anna",
            configuration: { rackSize: 7, modifiers: [] },
            revision: 9,
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
}

async function openFinishedMatch(page: Page) {
  await stubServer(page);
  await page.goto("/online");
  await page.getByText("Anna").click();
  await expect(
    page.getByRole("heading", { name: "Spelet är slut" }),
  ).toBeVisible();
}

test.describe("finished online match", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });

  /**
   * A finger drag, dispatched through CDP so the browser treats it as a real touch and scrolls
   * what it would scroll for a player. Chromium only — which is the engine Android runs, and
   * where this was reported.
   */
  async function swipeUp(page: Page, x: number, y: number, distance: number) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let step = 1; step <= 12; step += 1) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - (distance * step) / 12 }],
      });
      await page.waitForTimeout(8);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await page.waitForTimeout(300);
  }

  /*
   * Reported in play: the finished screen could not be scrolled. The history sits below the fold
   * and had a scroller of its own, so a drag that landed in it — which is most of the screen once
   * you have scrolled down to read it — moved the list and not the page.
   */
  test("scrolls the page from a drag that lands in the history", async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== "chromium", "touch dispatch needs CDP");
    await openFinishedMatch(page);

    const history = page.getByText("Historik");
    await history.scrollIntoViewIfNeeded();
    const box = (await history.boundingBox())!;
    const before = await page.evaluate(() => window.scrollY);

    await swipeUp(page, box.x + box.width / 2, box.y + 60, 250);

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    // And the end of the page is reachable, which is where the actions are.
    await expect(page.getByRole("button", { name: "Tillbaka" })).toBeVisible();
  });

  test("offers a rematch against the same opponent, and a way back", async ({
    page,
  }) => {
    await openFinishedMatch(page);

    await page.getByRole("button", { name: "Revansch" }).click();

    // Match creation, with the opponent already chosen and only the rules left to confirm.
    await expect(page.getByRole("heading", { name: "Ny match" })).toBeVisible();
    await expect(page.getByText("@anna")).toBeVisible();
    await expect(
      page.getByRole("combobox", { name: "Motståndare" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Avbryt" }).click();
    await expect(page.getByText("Mina matcher")).toBeVisible();
  });

  test("goes back to the match list from Tillbaka", async ({ page }) => {
    await openFinishedMatch(page);

    await page.getByRole("button", { name: "Tillbaka" }).click();

    await expect(page.getByText("Mina matcher")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Spelet är slut" }),
    ).toHaveCount(0);
  });
});
