import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BlankLetterPicker } from "./BlankLetterPicker";

describe("BlankLetterPicker", () => {
  it("supports the full Swedish alphabet and reports the chosen letter", async () => {
    const onSelect = vi.fn();
    render(
      <BlankLetterPicker
        label="Välj bokstav"
        alphabet={["A", "B", "Å", "Ä", "Ö"]}
        onSelect={onSelect}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Välj bokstav"), "Ö");

    expect(onSelect).toHaveBeenCalledWith("Ö");
  });

  it("reflects an already-chosen letter as the selected value", () => {
    render(
      <BlankLetterPicker
        label="Välj bokstav"
        alphabet={["A", "B", "C"]}
        value="B"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Välj bokstav")).toHaveValue("B");
  });
});
