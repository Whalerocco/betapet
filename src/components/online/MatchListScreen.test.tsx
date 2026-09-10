import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MatchListEntry } from "../../application/online/matchApi";

import { MatchListScreen } from "./MatchListScreen";

function entry(overrides: Partial<MatchListEntry> = {}): MatchListEntry {
  return {
    id: "match-1",
    category: "YOUR_TURN",
    opponentName: "Anna",
    revision: 3,
    updatedAt: "2026-09-09T10:00:00.000Z",
    ...overrides,
  };
}

function renderList(matches: readonly MatchListEntry[], props = {}) {
  const handlers = {
    onOpen: vi.fn(),
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    onCreate: vi.fn(),
    onShowFriends: vi.fn(),
    onSignOut: vi.fn(),
  };
  render(
    <MatchListScreen
      playerName="August"
      matches={matches}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("MatchListScreen", () => {
  it("shows only the sections that have matches, most urgent first", () => {
    renderList([
      entry({ id: "a", category: "WAITING_FOR_OPPONENT" }),
      entry({ id: "b", category: "AWAITING_YOUR_REVIEW" }),
      entry({ id: "c", category: "YOUR_TURN" }),
    ]);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent);

    expect(headings).toEqual([
      "Ny match",
      "Din tur",
      "Ord att granska",
      "Väntar på motståndaren",
    ]);
    expect(screen.queryByText("Avslutade")).not.toBeInTheDocument();
  });

  it("offers accept and decline on an invitation rather than opening it", async () => {
    const handlers = renderList([
      entry({ id: "inv", category: "INVITATION_RECEIVED" }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Acceptera" }));
    expect(handlers.onAccept).toHaveBeenCalledWith("inv");

    await userEvent.click(screen.getByRole("button", { name: "Neka" }));
    expect(handlers.onDecline).toHaveBeenCalledWith("inv");
  });

  it("opens a match that has a game behind it", async () => {
    const handlers = renderList([entry({ id: "live" })]);

    await userEvent.click(screen.getByRole("button", { name: "Anna" }));

    expect(handlers.onOpen).toHaveBeenCalledWith("live");
  });

  /* An invitation nobody has answered has no game to show yet. */
  it("does not offer to open an invitation it sent", () => {
    renderList([entry({ id: "sent", category: "INVITATION_SENT" })]);

    expect(screen.getByRole("button", { name: "Anna" })).toBeDisabled();
  });

  it("invites an opponent by email", async () => {
    const handlers = renderList([]);

    await userEvent.type(
      screen.getByLabelText("Motståndarens e-post"),
      "anna@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Bjud in" }));

    expect(handlers.onCreate).toHaveBeenCalledWith("anna@example.com");
  });

  it("says so when there is nothing to play", () => {
    renderList([]);

    expect(screen.getByText("Du har inga matcher än.")).toBeInTheDocument();
  });

  /* The other way to start a match, once there are friends to start one with (T28.3). */
  it("opens the friends screen", async () => {
    const handlers = renderList([]);

    await userEvent.click(screen.getByRole("button", { name: "Vänner" }));

    expect(handlers.onShowFriends).toHaveBeenCalled();
  });
});
