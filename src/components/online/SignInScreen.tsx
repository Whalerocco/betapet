"use client";

import { useState, type FormEvent } from "react";

import styles from "./SignInScreen.module.css";

export type SignInMode = "SIGN_IN" | "SIGN_UP";

const HANDLE_HINT_ID = "sign-up-handle-hint";

export interface SignInScreenProps {
  readonly onSubmit: (values: {
    mode: SignInMode;
    email: string;
    password: string;
    name: string;
    handle: string;
  }) => void;
  readonly pending?: boolean;
  readonly error?: string;
}

/**
 * Signing in and signing up, which are the same form with two extra fields
 * (`online-multiplayer.md` section 10: ask for as little as identifying an opponent needs).
 *
 * A new account picks a handle as well as a name (DEC-027): the name is what opponents read, the
 * handle is what they type to find you. The rules are stated next to the field rather than
 * enforced by it, so a rejected handle is explained by the server's answer instead of a field that
 * silently refuses keystrokes.
 *
 * The component holds only what is typed and hands it upwards; it never talks to Better Auth
 * itself, so it can be tested without a server and the page stays the one place that knows how
 * a session is established.
 */
export function SignInScreen({ onSubmit, pending, error }: SignInScreenProps) {
  const [mode, setMode] = useState<SignInMode>("SIGN_IN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ mode, email, password, name, handle });
  }

  return (
    <div className={styles.screen}>
      <h1>Betapet online</h1>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "SIGN_IN"}
          className={`${styles.tab} ${mode === "SIGN_IN" ? styles.tabActive : ""}`}
          onClick={() => setMode("SIGN_IN")}
        >
          Logga in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "SIGN_UP"}
          className={`${styles.tab} ${mode === "SIGN_UP" ? styles.tabActive : ""}`}
          onClick={() => setMode("SIGN_UP")}
        >
          Skapa konto
        </button>
      </div>

      <form className={styles.screen} onSubmit={submit}>
        {mode === "SIGN_UP" && (
          <>
            <label className={styles.field}>
              Namn
              <input
                className={styles.input}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="nickname"
                required
              />
            </label>

            <label className={styles.field}>
              Vänkod
              <input
                className={styles.input}
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                autoComplete="username"
                aria-describedby={HANDLE_HINT_ID}
                required
              />
            </label>
            {/* Outside the label, so the label names the field and the hint describes it. */}
            <p className={styles.hint} id={HANDLE_HINT_ID}>
              Den här koden ger du till dina vänner så att de hittar dig. 3-20
              tecken: a-z, 0-9 och _, och den måste börja med en bokstav.
            </p>
          </>
        )}

        <label className={styles.field}>
          E-post
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className={styles.field}>
          Lösenord
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={
              mode === "SIGN_UP" ? "new-password" : "current-password"
            }
            required
          />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button className={styles.submit} type="submit" disabled={pending}>
          {mode === "SIGN_IN" ? "Logga in" : "Skapa konto"}
        </button>
      </form>
    </div>
  );
}
