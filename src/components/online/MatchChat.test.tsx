import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ChatMessage } from "../../application/online/chatApi";

import { MatchChat } from "./MatchChat";

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m-1",
    matchId: "match-1",
    senderUserId: "anna",
    senderName: "Anna",
    text: "Hej!",
    createdAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

function renderChat(messages: readonly ChatMessage[], props = {}) {
  const onSend = vi.fn();
  render(
    <MatchChat
      messages={messages}
      viewerUserId="august"
      maxLength={500}
      onSend={onSend}
      {...props}
    />,
  );
  return { onSend };
}

describe("MatchChat", () => {
  it("says so plainly when nothing has been said", () => {
    renderChat([]);

    expect(screen.getByText("Inga meddelanden än.")).toBeVisible();
  });

  it("shows the messages in the order it is given them, each with its sender", () => {
    renderChat([
      message({ id: "a", text: "Hej!" }),
      message({
        id: "b",
        senderUserId: "august",
        senderName: "August",
        text: "Hej själv.",
      }),
      message({ id: "c", text: "Din tur." }),
    ]);

    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "AnnaHej!",
      "AugustHej själv.",
      "AnnaDin tur.",
    ]);
  });

  it("sends what was typed, and clears the field", async () => {
    const { onSend } = renderChat([]);
    const field = screen.getByRole("textbox", {
      name: "Skriv ett meddelande",
    });

    await userEvent.type(field, "Bra drag");
    await userEvent.click(screen.getByRole("button", { name: "Skicka" }));

    expect(onSend).toHaveBeenCalledWith("Bra drag");
    expect(field).toHaveValue("");
  });

  it("will not send a message that is only whitespace", async () => {
    const { onSend } = renderChat([]);

    await userEvent.type(
      screen.getByRole("textbox", { name: "Skriv ett meddelande" }),
      "   ",
    );

    expect(screen.getByRole("button", { name: "Skicka" })).toBeDisabled();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("trims what was typed before sending it", async () => {
    const { onSend } = renderChat([]);

    await userEvent.type(
      screen.getByRole("textbox", { name: "Skriv ett meddelande" }),
      "  Hej!  ",
    );
    await userEvent.click(screen.getByRole("button", { name: "Skicka" }));

    expect(onSend).toHaveBeenCalledWith("Hej!");
  });

  it("stops the field at the server's limit", () => {
    renderChat([], { maxLength: 40 });

    expect(
      screen.getByRole("textbox", { name: "Skriv ett meddelande" }),
    ).toHaveAttribute("maxlength", "40");
  });

  /*
   * `online-multiplayer.md` section 40: user-generated text must be safely rendered. React's
   * escaping is what does it, and this is the test that would fail the day somebody reaches for
   * `dangerouslySetInnerHTML` to make links clickable or to bold something.
   */
  describe("rendering somebody else's text", () => {
    it("shows markup as characters rather than running it", () => {
      renderChat([
        message({ text: '<img src=x onerror="alert(1)"> <b>fet</b>' }),
      ]);

      expect(
        screen.getByText('<img src=x onerror="alert(1)"> <b>fet</b>'),
      ).toBeVisible();
      // Nothing was parsed into elements: the text is text.
      expect(document.querySelector("img")).toBeNull();
      expect(document.querySelector("b")).toBeNull();
    });

    it("does not turn a link into a link", () => {
      renderChat([message({ text: "https://example.invalid/x" })]);

      expect(screen.getByText("https://example.invalid/x")).toBeVisible();
      expect(document.querySelector("a")).toBeNull();
    });
  });

  it("does not offer to send while a request is in flight", async () => {
    renderChat([], { busy: true });

    await userEvent.type(
      screen.getByRole("textbox", { name: "Skriv ett meddelande" }),
      "Hej",
    );

    expect(screen.getByRole("button", { name: "Skicka" })).toBeDisabled();
  });
});
