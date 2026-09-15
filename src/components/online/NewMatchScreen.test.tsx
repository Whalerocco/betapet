import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NewMatchScreen, type NewMatchOpponent } from "./NewMatchScreen";

/**
 * Choosing the rules for an online match (T28.4). The same screen serves both ways in, so most of
 * these are about what it sends rather than about what it looks like.
 */

const FRIEND: NewMatchOpponent = {
  kind: "FRIEND",
  userId: "user-anna",
  name: "Anna",
  handle: "anna",
};

function renderScreen(
  opponent: NewMatchOpponent = { kind: "CHOOSE" },
  props = {},
) {
  const handlers = { onCreate: vi.fn(), onCancel: vi.fn() };
  render(<NewMatchScreen opponent={opponent} {...handlers} {...props} />);
  return handlers;
}

describe("NewMatchScreen", () => {
  it("sends the standard rules when nothing is changed", async () => {
    const { onCreate } = renderScreen();

    await userEvent.type(
      screen.getByRole("combobox", { name: "Motståndare" }),
      "anna@example.com",
    );
    await userEvent.click(screen.getByRole("button", { name: "Bjud in" }));

    expect(onCreate).toHaveBeenCalledWith({
      opponent: { kind: "EMAIL", email: "anna@example.com" },
      rackSize: 7,
      modifiers: [],
      polyglotLanguages: [],
      wildLanguages: [],
    });
  });

  it("sends the rack size and modifiers that were chosen", async () => {
    const { onCreate } = renderScreen();

    await userEvent.type(
      screen.getByRole("combobox", { name: "Motståndare" }),
      "anna@example.com",
    );
    await userEvent.click(screen.getByRole("radio", { name: /^8 brickor/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Kryssläge/ }));
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Ersättningsläge/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Bjud in" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        rackSize: 8,
        modifiers: ["CRISSCROSS", "REPLACE"],
      }),
    );
  });

  it("sends the languages a multi-language mode needs", async () => {
    const { onCreate } = renderScreen(FRIEND);

    await userEvent.click(
      screen.getByRole("checkbox", { name: /Flerspråksläge/ }),
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Engelska" }));
    await userEvent.click(screen.getByRole("button", { name: "Bjud in" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        modifiers: ["POLYGLOT"],
        // Swedish is always included, and the order is ALL_LANGUAGE_CODES — which is also Wild's
        // rotation order, so it is part of the rules rather than the order they were clicked in.
        polyglotLanguages: ["sv", "en"],
      }),
    );
  });

  it("refuses a multi-language mode with no second language", async () => {
    const { onCreate } = renderScreen(FRIEND);

    await userEvent.click(
      screen.getByRole("checkbox", { name: /Flerspråksläge/ }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Bjud in" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Välj minst ett språk utöver svenska för flerspråksläge.",
    );
  });

  it("names the friend instead of asking for an address", () => {
    renderScreen(FRIEND);

    expect(screen.getByText("Anna")).toBeInTheDocument();
    expect(screen.getByText("@anna")).toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Motståndare" }),
    ).not.toBeInTheDocument();
  });

  it("sends no address for a friend, who is already named by id", async () => {
    const { onCreate } = renderScreen(FRIEND);

    await userEvent.click(screen.getByRole("button", { name: "Bjud in" }));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ opponent: undefined }),
    );
  });

  it("goes back without inviting", async () => {
    const { onCancel, onCreate } = renderScreen();

    await userEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("shows a failure the server reported", () => {
    render(
      <NewMatchScreen
        opponent={FRIEND}
        onCreate={vi.fn()}
        onCancel={vi.fn()}
        error="Ingen spelare med den e-postadressen."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ingen spelare med den e-postadressen.",
    );
  });
});
