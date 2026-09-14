import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Notification } from "../../application/online/notificationsApi";

import { NotificationsScreen } from "./NotificationsScreen";

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n-1",
    type: "YOUR_TURN",
    otherUserName: "Anna",
    matchId: "match-1",
    words: [],
    occurredAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

function renderScreen(notifications: readonly Notification[], props = {}) {
  const handlers = {
    onOpenMatch: vi.fn(),
    onShowFriends: vi.fn(),
    onBack: vi.fn(),
  };
  render(
    <NotificationsScreen
      notifications={notifications}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe("NotificationsScreen", () => {
  it("says so plainly when nothing is waiting", () => {
    renderScreen([]);

    expect(screen.getByText("Inget väntar på dig just nu.")).toBeVisible();
  });

  it("writes each notification out as a sentence", () => {
    renderScreen([
      notification({ id: "a" }),
      notification({
        id: "b",
        type: "MOVE_REJECTED",
        otherUserName: "Erik",
        words: ["BLUNK"],
      }),
    ]);

    expect(screen.getByText("Din tur mot Anna.")).toBeVisible();
    expect(
      screen.getByText("Erik nekade ditt ord BLUNK. Det är din tur igen."),
    ).toBeVisible();
  });

  it("opens the match a notification is about", async () => {
    const handlers = renderScreen([notification({ matchId: "match-7" })]);

    await userEvent.click(screen.getByRole("button", { name: "Spela" }));

    expect(handlers.onOpenMatch).toHaveBeenCalledWith("match-7");
  });

  /*
   * A friend request is not answered here. It belongs to the friends screen, which is where
   * accepting and declining already live (T28.2) — a second place to answer one would be a second
   * place to keep right.
   */
  it("sends a friend request to the friends screen rather than answering it", async () => {
    const handlers = renderScreen([
      notification({
        type: "FRIEND_REQUEST",
        otherUserHandle: "anna",
        matchId: undefined,
        requestId: "request-1",
      }),
    ]);

    await userEvent.click(screen.getByRole("button", { name: "Till vänner" }));

    expect(handlers.onShowFriends).toHaveBeenCalled();
    expect(handlers.onOpenMatch).not.toHaveBeenCalled();
  });

  it("does not offer its actions while a request is in flight", () => {
    renderScreen([notification()], { busy: true });

    expect(screen.getByRole("button", { name: "Spela" })).toBeDisabled();
  });

  it("reports a failure where a screen reader will announce it", () => {
    renderScreen([], { error: "Något gick fel." });

    expect(screen.getByRole("alert")).toHaveTextContent("Något gick fel.");
  });
});
