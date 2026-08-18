import { expect, type Page, test } from "@playwright/test";
import {
  continueHandoff,
  getCurrentPlayerName,
  otherPlayerName,
  passTurn,
  startNewGame,
} from "./helpers";

/** Sum of every rack tile's point value, read directly from the tile aria-labels. */
async function getRackPointsSum(page: Page): Promise<number> {
  const labels = await page
    .locator('[aria-label="Din hand"] button[aria-label^="Bricka "]')
    .evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute("aria-label") ?? ""),
    );
  return labels.reduce((sum, label) => {
    const match = /, (\d+) poäng$/.exec(label);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);
}

// roadmap.md Milestone 4.3 / tasks.md T22.5: drive a deterministic game into an end condition
// and verify final scoring. Four consecutive passes (game-rules.md section 29,
// gameEndCheck.ts) ends a two-player game regardless of what's in either rack, which is the
// only fully rack-independent way to reach an end condition through the UI alone.
test("four consecutive passes end the game with correct final scores", async ({
  page,
}) => {
  await startNewGame(page);
  await continueHandoff(page);

  const firstPlayer = await getCurrentPlayerName(page);
  const secondPlayer = otherPlayerName(firstPlayer);

  await expect(page.getByText(`Din tur: ${firstPlayer}`)).toBeVisible();
  const firstPlayerRackPoints = await getRackPointsSum(page);
  await passTurn(page);
  await continueHandoff(page);

  await expect(page.getByText(`Din tur: ${secondPlayer}`)).toBeVisible();
  const secondPlayerRackPoints = await getRackPointsSum(page);
  await passTurn(page);
  await continueHandoff(page);

  await expect(page.getByText(`Din tur: ${firstPlayer}`)).toBeVisible();
  await passTurn(page);
  await continueHandoff(page);

  await expect(page.getByText(`Din tur: ${secondPlayer}`)).toBeVisible();
  await passTurn(page);

  // No handoff after the fourth pass: the game has ended.
  await expect(
    page.getByRole("heading", { name: "Spelet är slut" }),
  ).toBeVisible();
  await expect(
    page.getByText("Båda spelarna passade i följd."),
  ).toBeVisible();

  // Neither player ever scored anything; final score is just the negated rack deduction.
  await expect(
    page
      .locator("tr", { hasText: firstPlayer })
      .getByText(`${-firstPlayerRackPoints}`, { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .locator("tr", { hasText: secondPlayer })
      .getByText(`${-secondPlayerRackPoints}`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`${firstPlayer}: −${firstPlayerRackPoints}`),
  ).toBeVisible();
  await expect(
    page.getByText(`${secondPlayer}: −${secondPlayerRackPoints}`),
  ).toBeVisible();

  const outcome =
    firstPlayerRackPoints === secondPlayerRackPoints
      ? "Oavgjort."
      : firstPlayerRackPoints < secondPlayerRackPoints
        ? `${firstPlayer} vinner!`
        : `${secondPlayer} vinner!`;
  await expect(page.getByText(outcome)).toBeVisible();

  // The game-over screen offers a clear way to start again.
  await expect(page.getByRole("button", { name: "Nytt spel" })).toBeVisible();
});
