"use client";

import { useState, type FormEvent } from "react";

import styles from "./SignInScreen.module.css";

export type SignInMode = "SIGN_IN" | "SIGN_UP";

export interface SignInScreenProps {
  readonly onSubmit: (values: {
    mode: SignInMode;
    email: string;
    password: string;
    name: string;
  }) => void;
  readonly pending?: boolean;
  readonly error?: string;
}

/**
 * Signing in and signing up, which are the same form with one extra field
 * (`online-multiplayer.md` section 10: ask for as little as identifying an opponent needs).
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

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ mode, email, password, name });
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
