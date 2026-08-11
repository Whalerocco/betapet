import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewGameConfirmation } from "./NewGameConfirmation";

describe("NewGameConfirmation", () => {
  it("calls onCancel and onConfirm from their respective buttons", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<NewGameConfirmation onCancel={onCancel} onConfirm={onConfirm} />);

    expect(
      screen.getByText("Det finns redan ett pågående spel."),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await userEvent.click(screen.getByRole("button", { name: "Starta nytt" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
