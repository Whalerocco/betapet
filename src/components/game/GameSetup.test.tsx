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
    });
  });
});
