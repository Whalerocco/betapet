import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { SocialGraph } from "../../application/online/friendsApi";

import { FriendsScreen } from "./FriendsScreen";

/**
 * The friends screen (T28.1-T28.3). Like the other online screens it decides nothing: it reports
 * what was clicked and shows what it was given, so these tests are about what a user can see and
 * reach rather than about what happens next.
 */

const EMPTY: SocialGraph = {
  handle: "august",
  friends: [],
  incoming: [],
  outgoing: [],
};

function renderScreen(graph: Partial<SocialGraph> = {}) {
  const handlers = {
    onSendRequest: vi.fn(),
    onAccept: vi.fn(),
    onDecline: vi.fn(),
    onStartMatch: vi.fn(),
    onBack: vi.fn(),
  };
  render(<FriendsScreen graph={{ ...EMPTY, ...graph }} {...handlers} />);
  return handlers;
}

const anna = {
  userId: "user-anna",
  name: "Anna",
  handle: "anna",
  requestId: "request-1",
  sentAt: "2026-09-10T08:00:00.000Z",
  since: "2026-09-10T08:00:00.000Z",
};

describe("FriendsScreen", () => {
  it("shows the user's own handle, which is what they read out to a friend", () => {
    renderScreen();

    expect(screen.getByText("@august")).toBeInTheDocument();
  });

  it("sends a friend request for the handle that was typed", async () => {
    const { onSendRequest } = renderScreen();

    await userEvent.type(screen.getByLabelText("Vänkod"), "@Anna");
    await userEvent.click(
      screen.getByRole("button", { name: "Skicka förfrågan" }),
    );

    // As typed: the server normalizes it, so the screen has no opinion (DEC-027).
    expect(onSendRequest).toHaveBeenCalledWith("@Anna");
  });

  it("offers an incoming request to be answered either way", async () => {
    const { onAccept, onDecline } = renderScreen({ incoming: [anna] });

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("@anna")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Godkänn" }));
    expect(onAccept).toHaveBeenCalledWith("request-1");

    await userEvent.click(screen.getByRole("button", { name: "Neka" }));
    expect(onDecline).toHaveBeenCalledWith("request-1");
  });

  it("shows a sent request as waiting, with nothing to press", () => {
    renderScreen({ outgoing: [anna] });

    expect(screen.getByText("Väntar på svar")).toBeInTheDocument();
    // Only the sender's own "Skicka förfrågan" and "Till matcher" remain.
    expect(
      screen.queryByRole("button", { name: "Godkänn" }),
    ).not.toBeInTheDocument();
  });

  it("starts a match with a friend (T28.3)", async () => {
    const { onStartMatch } = renderScreen({ friends: [anna] });

    await userEvent.click(screen.getByRole("button", { name: "Ny match" }));

    // By id: the friend list holds it, and the interface never needs the friend's email.
    expect(onStartMatch).toHaveBeenCalledWith("user-anna");
  });

  it("says so when there are no friends yet", () => {
    renderScreen();

    expect(
      screen.getByText("Du har inga vänner än. Be om deras vänkod."),
    ).toBeInTheDocument();
  });

  it("shows a failure as an alert and a success as a status", () => {
    const handlers = {
      onSendRequest: vi.fn(),
      onAccept: vi.fn(),
      onDecline: vi.fn(),
      onStartMatch: vi.fn(),
      onBack: vi.fn(),
    };

    const { unmount } = render(
      <FriendsScreen
        graph={EMPTY}
        {...handlers}
        notice="Förfrågan skickad till Anna."
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Förfrågan skickad till Anna.",
    );
    unmount();

    render(
      <FriendsScreen
        graph={EMPTY}
        {...handlers}
        error="Ingen spelare med den vänkoden."
        notice="Förfrågan skickad till Anna."
      />,
    );
    // A failure replaces the notice rather than sitting beside it: the notice is now stale.
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ingen spelare med den vänkoden.",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("stops every action while a request is in flight", () => {
    render(
      <FriendsScreen
        graph={{ ...EMPTY, friends: [anna], incoming: [anna] }}
        onSendRequest={vi.fn()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        onStartMatch={vi.fn()}
        onBack={vi.fn()}
        busy
      />,
    );

    for (const name of ["Skicka förfrågan", "Godkänn", "Neka", "Ny match"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
  });

  it("goes back to the match list", async () => {
    const { onBack } = renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Till matcher" }));

    expect(onBack).toHaveBeenCalled();
  });
});
