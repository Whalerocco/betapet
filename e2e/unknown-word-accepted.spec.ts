import { expect, test } from "@playwright/test";
import {
  continueHandoff,
  placeWordAtCentre,
  startSeededGame,
  submitMove,
} from "./helpers";

// roadmap.md Milestone 4.3 / tasks.md T22.2: unknown move -> proposer confirms -> review
// handoff -> opponent accepts -> move commits -> opponent starts their own turn.
test("an unknown word can be proposed, accepted, and commits the move", async ({
  page,
}) => {
  // Seeded so the rack always offers a non-dictionary pair, the same one every run.
  const {
    currentPlayer: proposer,
    otherPlayer: reviewer,
    pick,
  } = await startSeededGame(page, { requireWord: ["UNKNOWN_WORD"] });

  await placeWordAtCentre(page, pick!.letters);
  await submitMove(page);

  const noticeDialog = page.getByRole("dialog", { name: "Okänt ord" });
  await expect(noticeDialog).toBeVisible();
  await expect(noticeDialog).toContainText(pick!.word);
  await noticeDialog.getByRole("button", { name: "Spela ändå" }).click();

  await expect(
    page.getByText(`behöver ta ställning till ${proposer}s läggning`),
  ).toBeVisible();
  await continueHandoff(page);

  await expect(page.getByText(`vill spela "${pick!.word}"`)).toBeVisible();

  /*
   * The reviewer can see the placement they are deciding about, greyed out (`ui-design.md`
   * section 27, reported in play as `known-bugs.md` item 17). Checked in a real browser because
   * the greying is the stylesheet's work: the border is compared against the review token
   * resolved on the page, so the assertion cannot pass on a tile drawn in the ordinary pending
   * colours, nor drift if the palette is retuned.
   */
  const proposed = page
    .getByLabel(`Föreslagen bricka ${pick!.word[0]}, väntar på svar`)
    .first();
  await expect(proposed).toBeVisible();
  await expect(proposed).toHaveText(new RegExp(pick!.word[0]!));
  // Inert: the decision is Godkänn/Neka, not editing the opponent's placement.
  await expect(
    page.getByRole("button", { name: /^Föreslagen bricka/ }),
  ).toHaveCount(0);
  const reviewBorder = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.color = "var(--tile-review-border)";
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    return resolved;
  });
  await expect(proposed).toHaveCSS("border-top-color", reviewBorder);

  await page.getByRole("button", { name: "Godkänn" }).click();

  // Accepting drops straight into the reviewer's own turn (DEC-019) — they are already holding
  // the device, so there is no handoff screen in between.
  await expect(page.getByText(`Din tur: ${reviewer}`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Fortsätt" })).toHaveCount(0);
  await expect(page.locator('[data-coordinate="7,7"]')).toContainText(
    pick!.word[0],
  );
});

// Reusing an accepted word for the remainder of the game is covered at the engine level
// (roadmap.md Milestone 2.3); reproducing it here would need a rack containing the exact
// letters to replay the same word, which isn't controllable through the UI alone.
