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
    });
  });

  /* A display name is the one extra thing a new account needs (section 10). */
  it("asks for a name only when creating an account", async () => {
    const onSubmit = vi.fn();
    render(<SignInScreen onSubmit={onSubmit} />);

    expect(screen.queryByLabelText("Namn")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Skapa konto" }));
    await userEvent.type(screen.getByLabelText("Namn"), "August");
    await userEvent.type(screen.getByLabelText("E-post"), "august@example.com");
    await userEvent.type(screen.getByLabelText("Lösenord"), "hemligt-nog");
    await userEvent.click(screen.getByRole("button", { name: "Skapa konto" }));

    expect(onSubmit).toHaveBeenCalledWith({
      mode: "SIGN_UP",
      email: "august@example.com",
      password: "hemligt-nog",
      name: "August",
    });
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
