import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameSetup } from "./GameSetup";

describe("GameSetup", () => {
  it("requires both player names before starting", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ange namn för båda spelarna.",
    );
  });

  it("starts the game with trimmed names and the default rack size", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.type(screen.getByLabelText("Spelare 1"), "  August  ");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).toHaveBeenCalledWith({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
      modifiers: new Set(),
      polyglotLanguages: [],
      wildLanguages: [],
    });
  });

  it("allows selecting a different rack size", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByLabelText(/8 brickor/));
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).toHaveBeenCalledWith({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 8,
      modifiers: new Set(),
      polyglotLanguages: [],
      wildLanguages: [],
    });
  });

  it("allows selecting a gameplay modifier and passes it to onStartGame", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByLabelText(/Olagligt läge/));
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).toHaveBeenCalledWith({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
      modifiers: new Set(["ILLEGAL"]),
      polyglotLanguages: [],
      wildLanguages: [],
    });
  });

  it("allows combining Crisscross and Replace mode", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByLabelText(/Kryssläge/));
    await userEvent.click(screen.getByLabelText(/Ersättningsläge/));
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).toHaveBeenCalledWith({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
      modifiers: new Set(["CRISSCROSS", "REPLACE"]),
      polyglotLanguages: [],
      wildLanguages: [],
    });
  });

  it("requires at least one additional language before starting a Polyglot game", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByLabelText(/Flerspråksläge/));
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Välj minst ett språk utöver svenska för flerspråksläge.",
    );
  });

  it("starts a Polyglot game with Swedish plus the selected additional language", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByLabelText(/Flerspråksläge/));
    await userEvent.click(screen.getByLabelText("Tyska"));
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).toHaveBeenCalledWith({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
      modifiers: new Set(["POLYGLOT"]),
      polyglotLanguages: ["sv", "de"],
      wildLanguages: [],
    });
  });

  it("starts a Wild game with languages in the fixed canonical order regardless of click order", async () => {
    const onStartGame = vi.fn();
    render(<GameSetup onStartGame={onStartGame} />);

    await userEvent.type(screen.getByLabelText("Spelare 1"), "August");
    await userEvent.type(screen.getByLabelText("Spelare 2"), "Anna");
    await userEvent.click(screen.getByLabelText(/Roterande språkläge/));
    // Click Spanish before French — the resulting order should still be canonical (fr before es).
    await userEvent.click(screen.getByLabelText("Spanska"));
    await userEvent.click(screen.getByLabelText("Franska"));
    await userEvent.click(screen.getByRole("button", { name: "Starta spel" }));

    expect(onStartGame).toHaveBeenCalledWith({
      playerOneName: "August",
      playerTwoName: "Anna",
      rackSize: 7,
      modifiers: new Set(["WILD"]),
      polyglotLanguages: [],
      wildLanguages: ["sv", "fr", "es"],
    });
  });

  it("disables Wild while Polyglot is selected, and vice versa", async () => {
    render(<GameSetup onStartGame={vi.fn()} />);

    await userEvent.click(screen.getByLabelText(/Flerspråksläge/));

    expect(screen.getByLabelText(/Roterande språkläge/)).toBeDisabled();
  });
});
