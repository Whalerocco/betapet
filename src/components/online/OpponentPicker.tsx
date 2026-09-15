"use client";

import { useId, useMemo, useState } from "react";

import type { Friend } from "../../application/online/friendsApi";

import styles from "./OpponentPicker.module.css";

/** How a typed opponent is named to the server, once the text has been read. */
export type TypedOpponent =
  | { readonly kind: "EMAIL"; readonly email: string }
  | { readonly kind: "HANDLE"; readonly handle: string };

/**
 * What the player typed, as a way of naming somebody.
 *
 * An address and a handle are told apart by the `@` that is left after a leading one is dropped:
 * `@anna` and `anna` are handles, `anna@example.com` is an address. A handle is written with a
 * leading `@` everywhere it is shown (DEC-027), so a player copying one out of the friends screen
 * types the form this has to accept.
 */
export function readTypedOpponent(text: string): TypedOpponent | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;

  const withoutLeadingAt = trimmed.replace(/^@+/, "");
  if (!withoutLeadingAt) return undefined;

  return withoutLeadingAt.includes("@")
    ? { kind: "EMAIL", email: withoutLeadingAt }
    : { kind: "HANDLE", handle: withoutLeadingAt.toLowerCase() };
}

/** Friends whose name or handle contains what has been typed, ignoring case and a leading `@`. */
export function matchingFriends(
  friends: readonly Friend[],
  query: string,
): readonly Friend[] {
  const needle = query.trim().replace(/^@+/, "").toLowerCase();
  if (!needle) return friends;

  return friends.filter(
    (friend) =>
      friend.name.toLowerCase().includes(needle) ||
      friend.handle.toLowerCase().includes(needle),
  );
}

export interface OpponentPickerProps {
  readonly friends: readonly Friend[];
  /** The text in the field, owned by the caller so it can be read on submit. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  /**
   * The friend chosen from the list, if one was. Cleared by typing, because the text stops
   * describing them the moment it is edited.
   */
  readonly selectedFriend?: Friend;
  readonly onSelectFriend: (friend: Friend | undefined) => void;
  readonly disabled?: boolean;
}

/**
 * Choosing who to play against (T32.1).
 *
 * One field does three jobs, because they are the same job from the player's side: pick a friend
 * from a list, or type a handle, or type an email address. Before this, the match list could only
 * invite by address — so a friend's `@vänkod`, the thing the whole handle model exists for
 * (DEC-027), was the one way of naming somebody that did not work here.
 *
 * The friend list is filtered in the browser, from the social graph the screen already has. That
 * is deliberate and not a shortcut: there is no user-search endpoint and DEC-027 means there not
 * to be one, so the only names that can be searched are the ones this player already has. A
 * handle for somebody who is not a friend still works — it is simply typed rather than found,
 * which is exactly how a handle is meant to travel.
 */
export function OpponentPicker({
  friends,
  value,
  onChange,
  selectedFriend,
  onSelectFriend,
  disabled,
}: OpponentPickerProps) {
  const [showList, setShowList] = useState(false);
  const listId = useId();
  const inputId = useId();

  const matches = useMemo(
    () => matchingFriends(friends, value),
    [friends, value],
  );

  // The list is for finding a friend; once one is chosen the field says who, and reopening it is
  // a deliberate act rather than something that happens under the player.
  const listVisible = showList && !selectedFriend && friends.length > 0;

  function choose(friend: Friend) {
    onSelectFriend(friend);
    onChange(`@${friend.handle}`);
    setShowList(false);
  }

  return (
    <div className={styles.picker}>
      <label className={styles.label} htmlFor={inputId}>
        Motståndare
      </label>
      <p className={styles.hint} id={`${inputId}-hint`}>
        Välj en vän, eller skriv en vänkod eller e-postadress.
      </p>

      <div className={styles.field}>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          role="combobox"
          aria-expanded={listVisible}
          aria-controls={listId}
          aria-describedby={`${inputId}-hint`}
          autoComplete="off"
          placeholder="@vänkod eller e-post"
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.value);
            // Editing the text stops it standing for the friend it used to name.
            onSelectFriend(undefined);
            setShowList(true);
          }}
          onFocus={() => setShowList(true)}
          required
        />
        {friends.length > 0 && (
          <button
            type="button"
            className={styles.toggle}
            aria-label={listVisible ? "Dölj vänner" : "Visa vänner"}
            aria-expanded={listVisible}
            disabled={disabled}
            onClick={() => {
              if (selectedFriend) onSelectFriend(undefined);
              setShowList((open) => !open);
            }}
          >
            <span aria-hidden="true">▾</span>
          </button>
        )}
      </div>

      {listVisible && (
        <ul className={styles.list} id={listId}>
          {matches.length === 0 ? (
            <li className={styles.empty}>
              Ingen vän matchar. Skriv hela vänkoden eller e-postadressen.
            </li>
          ) : (
            matches.map((friend) => (
              <li key={friend.userId}>
                <button
                  type="button"
                  className={styles.option}
                  onClick={() => choose(friend)}
                >
                  <span className={styles.name}>{friend.name}</span>
                  <span className={styles.handle}>@{friend.handle}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {selectedFriend && (
        <p className={styles.chosen} role="status">
          Mot <strong>{selectedFriend.name}</strong>{" "}
          <span className={styles.handle}>@{selectedFriend.handle}</span>
        </p>
      )}
    </div>
  );
}
