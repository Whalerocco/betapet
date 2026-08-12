import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createGameHistory } from "../../game/model/history";
import { createGameResult } from "../../game/model/gameResult";
import { createPlayerId } from "../../game/model/ids";
import { GameOverScreen } from "./GameOverScreen";

describe("GameOverScreen", () => {
  it("shows final scores, the winner, and rack deductions", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const result = createGameResult(
      { [august]: 312, [anna]: 298 },
      [august],
      { [august]: 4, [anna]: 12 },
      "NO_TILES_AND_NO_MORE_PLAY",
    );

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={result}
        history={createGameHistory()}
        onNewGame={vi.fn()}
      />,
    );

    expect(screen.getByText("312")).toBeInTheDocument();
    expect(screen.getByText("298")).toBeInTheDocument();
    expect(screen.getByText("August vinner!")).toBeInTheDocument();
    expect(screen.getByText("August: −4")).toBeInTheDocument();
    expect(screen.getByText("Anna: −12")).toBeInTheDocument();
  });

  it("announces a tie when there is no single winner", () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const result = createGameResult(
      { [august]: 200, [anna]: 200 },
      [],
      { [august]: 0, [anna]: 0 },
      "CONSECUTIVE_PASSES",
    );

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={result}
        history={createGameHistory()}
        onNewGame={vi.fn()}
      />,
    );

    expect(screen.getByText("Oavgjort.")).toBeInTheDocument();
  });

  it("calls onNewGame when the action button is pressed", async () => {
    const august = createPlayerId();
    const anna = createPlayerId();
    const onNewGame = vi.fn();
    const result = createGameResult(
      { [august]: 10, [anna]: 5 },
      [august],
      { [august]: 0, [anna]: 0 },
      "NO_TILES_AND_NO_MORE_PLAY",
    );

    render(
      <GameOverScreen
        players={[
          { id: august, name: "August" },
          { id: anna, name: "Anna" },
        ]}
        result={result}
        history={createGameHistory()}
        onNewGame={onNewGame}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Nytt spel" }));
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
