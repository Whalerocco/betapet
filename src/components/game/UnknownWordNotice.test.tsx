import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnknownWordNotice } from "./UnknownWordNotice";

describe("UnknownWordNotice", () => {
  it("lists every unknown word and the score preview", () => {
    render(
      <UnknownWordNotice
        words={["GRÖMP", "RX"]}
        scorePreview={18}
        onEdit={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      screen.getByText('"GRÖMP", "RX" finns inte i ordlistan.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText("18 poäng om läggningen godkänns."),
    ).toBeInTheDocument();
  });

  it("calls onEdit for Ändra and onConfirm for Spela ändå", async () => {
    const onEdit = vi.fn();
    const onConfirm = vi.fn();
    render(
      <UnknownWordNotice
        words={["GRÖMP"]}
        scorePreview={5}
        onEdit={onEdit}
        onConfirm={onConfirm}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Ändra" }));
    await userEvent.click(screen.getByRole("button", { name: "Spela ändå" }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
