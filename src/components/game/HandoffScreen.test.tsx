import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HandoffScreen } from "./HandoffScreen";

describe("HandoffScreen", () => {
  it("shows only the message and continue button, nothing about the game", () => {
    render(
      <HandoffScreen
        message="Lämna över enheten till Anna."
        continueLabel="Fortsätt"
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Lämna över enheten till Anna."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Fortsätt" }),
    ).toBeInTheDocument();
  });

  it("calls onContinue when the button is pressed", async () => {
    const onContinue = vi.fn();
    render(
      <HandoffScreen
        message="Läggningen godkändes. Nu är det Annas tur."
        continueLabel="Börja tur"
        onContinue={onContinue}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Börja tur" }));

    expect(onContinue).toHaveBeenCalledOnce();
  });
});
