import { expect, test, type Page } from "@playwright/test";

import { createGame } from "../src/game/engine/createGame";
import type { GameState } from "../src/game/model/game";
import { toPlayerGameView } from "../src/game/view/playerGameView";

/**
 * Dragging tiles in an online match, in a real browser (`known-bugs.md` item 21).
 *
 * The unit tests stub `document.elementFromPoint` and the tiles' geometry, because jsdom has
 * neither — which is exactly the part a drag depends on. This drives the gesture against real
 * layout instead: where the pointer actually is, what is actually under it, and which gap in the
 * rack a tile is actually let go of in.
 *
 * The match is stubbed at the network edge, as in `online-finished-match.spec.ts`: the online
 * screens need an account and a database, while the client is what is under test, and the shapes
 * come from the real engine through the real `toPlayerGameView`.
 */

const MATCH_ID = "m1";

function activeSnapshot() {
  const base = createGame({
    playerOneName: "August",
    playerTwoName: "Anna",
    rackSize: 7,
  });
  const me = base.players[0];
  const state: GameState = {
    ...base,
    currentPlayerId: me.id,
    turnState: { type: "PLAYER_TURN", playerId: me.id },
  };

  return {
    matchId: MATCH_ID,
    revision: 3,
    status: "ACTIVE",
    configuration: { rackSize: 7, modifiers: [] },
    opponent: { name: "Anna", handle: "anna" },
    view: toPlayerGameView(state, me.id),
  };
}

async function stubServer(page: Page) {
  const snapshot = activeSnapshot();

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
  await page.route("**/api/matches/*/chat*", (route) =>
    route.fulfill({ json: { messages: [], maxLength: 500 } }),
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
            category: "YOUR_TURN",
            opponentName: "Anna",
            configuration: { rackSize: 7, modifiers: [] },
            revision: 3,
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }),
  );
}

async function openMatch(page: Page) {
  await stubServer(page);
  await page.goto("/online");
  await page.getByText("Anna").first().click();
  await expect(page.getByRole("group", { name: "Din hand" })).toBeVisible();
}

/** The ids of the tiles in the hand, left to right, as the rack itself reports them. */
async function rackTileIds(page: Page) {
  return page
    .locator("[data-rack-dropzone] [data-rack-tile-id]")
    .evaluateAll((elements) =>
      elements.map((element) => (element as HTMLElement).dataset.rackTileId!),
    );
}

/** A pointer drag from the centre of one element to a point, moved in steps so it is a drag. */
async function dragTo(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(
      from.x + ((to.x - from.x) * step) / 8,
      from.y + ((to.y - from.y) * step) / 8,
    );
  }
  await page.mouse.up();
}

async function centreOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("dragging tiles in an online match", () => {
  test("drags a tile from the hand onto the board", async ({ page }) => {
    await openMatch(page);
    const [first] = await rackTileIds(page);

    const from = await centreOf(page, `[data-rack-tile-id="${first}"]`);
    const to = await centreOf(page, '[data-coordinate="7,7"]');
    await dragTo(page, from, to);

    await expect(
      page.locator('[data-coordinate="7,7"] button'),
    ).toHaveAttribute("aria-label", /^Pending bricka /);
    expect(await rackTileIds(page)).not.toContain(first);
  });

  test("drags a tile on the board back into the hand", async ({ page }) => {
    await openMatch(page);
    const [first] = await rackTileIds(page);

    const rackTile = await centreOf(page, `[data-rack-tile-id="${first}"]`);
    await dragTo(
      page,
      rackTile,
      await centreOf(page, '[data-coordinate="7,7"]'),
    );
    expect(await rackTileIds(page)).not.toContain(first);

    // Measured again: the placement is on the board now, and so is the score badge.
    await dragTo(
      page,
      await centreOf(page, '[data-coordinate="7,7"] button'),
      await centreOf(page, "[data-rack-dropzone]"),
    );

    expect(await rackTileIds(page)).toContain(first);
    await expect(page.locator('[data-coordinate="7,7"] button')).toHaveCount(0);
  });

  test("drags a tile to another place in the hand", async ({ page }) => {
    await openMatch(page);
    const before = await rackTileIds(page);

    // Past the middle of the third tile, so the dragged one lands between the third and fourth.
    const from = await centreOf(page, `[data-rack-tile-id="${before[0]}"]`);
    const third = await centreOf(page, `[data-rack-tile-id="${before[3]}"]`);
    await dragTo(page, from, { x: third.x + 2, y: third.y });

    expect(await rackTileIds(page)).toEqual([
      before[1],
      before[2],
      before[3],
      before[0],
      ...before.slice(4),
    ]);
  });
});
