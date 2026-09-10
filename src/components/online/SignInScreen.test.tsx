import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SignInScreen } from "./SignInScreen";

describe("SignInScreen", () => {
  it("signs in with an email and a password", async () => {
    const onSubmit = vi.fn();
    render(<SignInScreen onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText("E-post"), "august@example.com");
    await userEvent.type(screen.getByLabelText("Lösenord"), "hemligt-nog");
    await userEvent.click(screen.getByRole("button", { name: "Logga in" }));

    expect(onSubmit).toHaveBeenCalledWith({
      mode: "SIGN_IN",
      email: "august@example.com",
      password: "hemligt-nog",
      name: "",
      handle: "",
    });
  });

  /*
   * A display name and a handle are what a new account needs beyond credentials: the name is what
   * an opponent reads, the handle is what they type to find you (section 10, DEC-027).
   */
  it("asks for a name and a handle only when creating an account", async () => {
    const onSubmit = vi.fn();
    render(<SignInScreen onSubmit={onSubmit} />);

    expect(screen.queryByLabelText("Namn")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Vänkod")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Skapa konto" }));
    await userEvent.type(screen.getByLabelText("Namn"), "August");
    await userEvent.type(screen.getByLabelText("Vänkod"), "august");
    await userEvent.type(screen.getByLabelText("E-post"), "august@example.com");
    await userEvent.type(screen.getByLabelText("Lösenord"), "hemligt-nog");
    await userEvent.click(screen.getByRole("button", { name: "Skapa konto" }));

    expect(onSubmit).toHaveBeenCalledWith({
      mode: "SIGN_UP",
      email: "august@example.com",
      password: "hemligt-nog",
      name: "August",
      handle: "august",
    });
  });

  /*
   * The field passes on what was typed rather than correcting it: the server normalizes `@Anna`
   * to `anna`, and one place deciding what a handle is beats two (DEC-027).
   */
  it("sends the handle as typed, @ and capitals included", async () => {
    const onSubmit = vi.fn();
    render(<SignInScreen onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole("tab", { name: "Skapa konto" }));
    await userEvent.type(screen.getByLabelText("Namn"), "August");
    await userEvent.type(screen.getByLabelText("Vänkod"), "@August");
    await userEvent.type(screen.getByLabelText("E-post"), "august@example.com");
    await userEvent.type(screen.getByLabelText("Lösenord"), "hemligt-nog");
    await userEvent.click(screen.getByRole("button", { name: "Skapa konto" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ handle: "@August" }),
    );
  });

  it("shows what went wrong, and stops a second submission while one is running", () => {
    render(
      <SignInScreen
        onSubmit={vi.fn()}
        error="Fel e-post eller lösenord."
        pending
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Fel e-post eller lösenord.",
    );
    expect(screen.getByRole("button", { name: "Logga in" })).toBeDisabled();
  });
});
