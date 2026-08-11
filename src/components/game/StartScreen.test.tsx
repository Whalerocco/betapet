import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartScreen } from "./StartScreen";

describe("StartScreen", () => {
  it("calls onStartNewGame when Nytt spel is clicked", async () => {
    const onStartNewGame = vi.fn();
    render(<StartScreen onStartNewGame={onStartNewGame} />);

    await userEvent.click(screen.getByRole("button", { name: "Nytt spel" }));

    expect(onStartNewGame).toHaveBeenCalledOnce();
  });

  it("does not show Fortsätt spel when there is no saved game", () => {
    render(<StartScreen onStartNewGame={vi.fn()} />);

    expect(
      screen.queryByRole("button", { name: "Fortsätt spel" }),
    ).not.toBeInTheDocument();
  });

  it("shows and wires up Fortsätt spel when a saved game is available", async () => {
    const onResumeGame = vi.fn();
    render(
      <StartScreen onStartNewGame={vi.fn()} onResumeGame={onResumeGame} />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Fortsätt spel" }),
    );

    expect(onResumeGame).toHaveBeenCalledOnce();
  });

  it("explains when a saved game could not be restored", () => {
    render(<StartScreen onStartNewGame={vi.fn()} loadError />);

    expect(
      screen.getByText("Det gick inte att återställa det sparade spelet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fortsätt spel" }),
    ).not.toBeInTheDocument();
  });
});
