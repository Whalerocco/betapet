import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("renders the Betapet heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Betapet" }),
    ).toBeInTheDocument();
  });
});
