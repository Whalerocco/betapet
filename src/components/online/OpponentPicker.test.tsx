import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { Friend } from "../../application/online/friendsApi";

import {
  matchingFriends,
  OpponentPicker,
  readTypedOpponent,
} from "./OpponentPicker";

const FRIENDS: readonly Friend[] = [
  { userId: "u-anna", name: "Anna Andersson", handle: "anna", since: "" },
  { userId: "u-erik", name: "Erik Svensson", handle: "erik_s", since: "" },
  { userId: "u-sara", name: "Sara Lind", handle: "lindis", since: "" },
];

/*
 * A handle and an address are told apart by the `@` left after a leading one is dropped. Handles
 * are shown with a leading `@` everywhere (DEC-027), so the form a player copies has to work.
 */
describe("readTypedOpponent", () => {
  it("reads a handle with or without its leading @, and lowercases it", () => {
    expect(readTypedOpponent("@Anna")).toEqual({
      kind: "HANDLE",
      handle: "anna",
    });
    expect(readTypedOpponent("anna")).toEqual({
      kind: "HANDLE",
      handle: "anna",
    });
  });

  it("reads an address as an address", () => {
    expect(readTypedOpponent("  anna@example.com ")).toEqual({
      kind: "EMAIL",
      email: "anna@example.com",
    });
  });

  it("is nothing at all for empty text or a bare @", () => {
    expect(readTypedOpponent("")).toBeUndefined();
    expect(readTypedOpponent("   ")).toBeUndefined();
    expect(readTypedOpponent("@")).toBeUndefined();
  });
});

describe("matchingFriends", () => {
  it("matches on name and on handle, ignoring case and a leading @", () => {
    expect(matchingFriends(FRIENDS, "and").map((f) => f.userId)).toEqual([
      "u-anna",
    ]);
    expect(matchingFriends(FRIENDS, "@ERIK").map((f) => f.userId)).toEqual([
      "u-erik",
    ]);
    expect(matchingFriends(FRIENDS, "lind").map((f) => f.userId)).toEqual([
      "u-sara",
    ]);
  });

  it("offers everybody when nothing has been typed", () => {
    expect(matchingFriends(FRIENDS, "")).toHaveLength(3);
  });
});

function renderPicker(props = {}) {
  const onChange = vi.fn();
  const onSelectFriend = vi.fn();
  const { rerender } = render(
    <OpponentPicker
      friends={FRIENDS}
      value=""
      onChange={onChange}
      onSelectFriend={onSelectFriend}
      {...props}
    />,
  );
  return { onChange, onSelectFriend, rerender };
}

describe("OpponentPicker", () => {
  it("offers the friends, each with the vänkod they are found by", async () => {
    renderPicker();

    await userEvent.click(
      screen.getByRole("combobox", { name: "Motståndare" }),
    );

    expect(
      screen.getByRole("button", { name: /Anna Andersson.*@anna/ }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Erik Svensson.*@erik_s/ }),
    ).toBeVisible();
  });

  it("names the chosen friend in the field, as their vänkod", async () => {
    const { onChange, onSelectFriend } = renderPicker();

    await userEvent.click(
      screen.getByRole("combobox", { name: "Motståndare" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Erik Svensson/ }),
    );

    expect(onSelectFriend).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u-erik" }),
    );
    expect(onChange).toHaveBeenCalledWith("@erik_s");
  });

  it("narrows the list as the player types", async () => {
    renderPicker({ value: "erik" });

    await userEvent.click(
      screen.getByRole("combobox", { name: "Motståndare" }),
    );

    expect(screen.getByRole("button", { name: /Erik Svensson/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Anna Andersson/ })).toBeNull();
  });

  /*
   * A handle for somebody who is not a friend is typed rather than found — there is no user
   * search and DEC-027 means there not to be one — so the empty list must not read as a refusal.
   */
  it("says what to do when no friend matches, rather than looking broken", async () => {
    renderPicker({ value: "nobody-by-that-name" });

    await userEvent.click(
      screen.getByRole("combobox", { name: "Motståndare" }),
    );

    expect(
      screen.getByText(/Skriv hela vänkoden eller e-postadressen/),
    ).toBeVisible();
  });

  it("stops standing for a friend once the text is edited", async () => {
    const { onSelectFriend } = renderPicker({
      value: "@erik_s",
      selectedFriend: FRIENDS[1],
    });

    await userEvent.type(
      screen.getByRole("combobox", { name: "Motståndare" }),
      "x",
    );

    expect(onSelectFriend).toHaveBeenCalledWith(undefined);
  });

  it("offers no list at all to somebody with no friends yet", async () => {
    render(
      <OpponentPicker
        friends={[]}
        value=""
        onChange={vi.fn()}
        onSelectFriend={vi.fn()}
      />,
    );

    await userEvent.click(
      screen.getByRole("combobox", { name: "Motståndare" }),
    );

    expect(screen.queryByRole("button", { name: "Visa vänner" })).toBeNull();
    // The field still works; a handle or an address is typed into it.
    expect(screen.getByRole("combobox", { name: "Motståndare" })).toBeVisible();
  });
});
