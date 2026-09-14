import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { Tile } from "./Tile";

/**
 * What a tile announces itself as (`known-bugs.md` item 12).
 *
 * `aria-pressed` used to be on every tile rendered as a button, so a screen reader described a
 * pending board tile and a Replace-mode target — both of which do something once and are done —
 * as two-state controls that were "not pressed". These pin the rule that replaced it: passing
 * `selected` is what declares a tile a toggle, and nothing else does.
 */
describe("Tile accessibility", () => {
  it("marks a rack tile as the toggle it is", () => {
    render(
      <Tile
        letter="B"
        points={3}
        variant="rack"
        selected={false}
        onClick={vi.fn()}
        ariaLabel="Bricka B"
      />,
    );

    expect(screen.getByRole("button", { name: "Bricka B" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports a selected rack tile as pressed", () => {
    render(
      <Tile
        letter="B"
        points={3}
        variant="rack"
        selected
        onClick={vi.fn()}
        ariaLabel="Bricka B"
      />,
    );

    expect(screen.getByRole("button", { name: "Bricka B" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("leaves aria-pressed off a pending board tile, which is an action", () => {
    render(
      <Tile
        letter="B"
        points={3}
        variant="pending"
        onClick={vi.fn()}
        ariaLabel="Pending bricka B, tryck för att redigera"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Pending bricka B, tryck för att redigera",
      }),
    ).not.toHaveAttribute("aria-pressed");
  });

  it("leaves aria-pressed off a Replace-mode target, which is also an action", () => {
    render(
      <Tile
        letter="B"
        points={3}
        variant="committed"
        onClick={vi.fn()}
        ariaLabel="Ersätt bricka B"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ersätt bricka B" }),
    ).not.toHaveAttribute("aria-pressed");
  });

  /*
   * A tile with nothing to click is not a control at all, so it must not be announced as one —
   * it is the letter it shows, and the drag preview uses it with `aria-hidden` on top of that.
   */
  it("is not a button when it has no click", () => {
    render(<Tile letter="B" points={3} variant="committed" ariaLabel="B" />);

    expect(screen.queryByRole("button")).toBeNull();
  });
});
