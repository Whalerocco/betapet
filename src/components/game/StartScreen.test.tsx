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
});
