"use client";

import { useCallback, useEffect, useState } from "react";

import {
  signIn,
  signOut,
  signUp,
  useSession,
} from "../../application/auth/authClient";
import { describeFailure } from "../../application/online/failureMessages";
import {
  acceptInvitation,
  createMatch,
  declineInvitation,
  fetchMatch,
  listMatches,
  sendTurnAction,
  type ApiResult,
  type MatchListEntry,
  type MatchSnapshot,
  type TurnAction,
} from "../../application/online/matchApi";
import { MatchListScreen } from "../../components/online/MatchListScreen";
import { OnlineGameScreen } from "../../components/online/OnlineGameScreen";
import { SignInScreen } from "../../components/online/SignInScreen";

/** How often an open match asks the server whether anything happened (DEC-020: polling). */
const POLL_INTERVAL_MS = 15_000;

export default function OnlinePage() {
  const { data: session, isPending: sessionPending } = useSession();

  const [matches, setMatches] = useState<readonly MatchListEntry[]>([]);
  const [openMatch, setOpenMatch] = useState<MatchSnapshot | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  /** Unwraps a call, turning a failure into Swedish text rather than throwing. */
  const run = useCallback(async function run<T>(
    call: Promise<ApiResult<T>>,
  ): Promise<T | undefined> {
    setBusy(true);
    setError(undefined);
    const result = await call;
    setBusy(false);

    if (result.ok) return result.value;
    setError(describeFailure(result.failure));
    return undefined;
  }, []);

  const refreshList = useCallback(async () => {
    const result = await listMatches();
    if (result.ok) setMatches(result.value.matches);
  }, []);

  useEffect(() => {
    if (!session) return;

    // The list is fetched in the effect and stored from the promise's callback, so a response
    // that arrives after the page has moved on is discarded rather than applied to a screen that
    // no longer wants it.
    let cancelled = false;
    void listMatches().then((result) => {
      if (!cancelled && result.ok) setMatches(result.value.matches);
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  /*
   * An open match polls, because the opponent may act while it is on screen and nothing pushes
   * (DEC-020). A refresh is silent: it must never replace an error the player has not read, and
   * it must not fight with a request already in flight.
   */
  useEffect(() => {
    if (!openMatch) return;

    let cancelled = false;
    const timer = setInterval(() => {
      void fetchMatch(openMatch.matchId).then((result) => {
        if (!cancelled && result.ok) setOpenMatch(result.value);
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [openMatch]);

  async function handleSignIn(values: {
    mode: "SIGN_IN" | "SIGN_UP";
    email: string;
    password: string;
    name: string;
  }) {
    setBusy(true);
    setError(undefined);

    const result =
      values.mode === "SIGN_IN"
        ? await signIn.email({ email: values.email, password: values.password })
        : await signUp.email({
            email: values.email,
            password: values.password,
            name: values.name,
          });

    setBusy(false);
    if (result.error) {
      setError(
        values.mode === "SIGN_IN"
          ? "Fel e-post eller lösenord."
          : "Kontot kunde inte skapas. Är e-postadressen redan använd?",
      );
    }
  }

  if (sessionPending) return <p>Laddar…</p>;

  if (!session) {
    return (
      <SignInScreen
        onSubmit={(values) => void handleSignIn(values)}
        pending={busy}
        error={error}
      />
    );
  }

  if (openMatch) {
    return (
      <OnlineGameScreen
        snapshot={openMatch}
        busy={busy}
        error={error}
        onAction={(action: TurnAction) => {
          void (async () => {
            const next = await run(
              sendTurnAction(openMatch.matchId, openMatch.revision, action),
            );
            if (next) setOpenMatch(next);
            else {
              // A stale revision or a refused move both mean the same thing to the screen: what
              // it is showing may be out of date, so fetch the truth rather than guess.
              const fresh = await fetchMatch(openMatch.matchId);
              if (fresh.ok) setOpenMatch(fresh.value);
            }
          })();
        }}
        onRefresh={() => {
          void (async () => {
            const fresh = await run(fetchMatch(openMatch.matchId));
            if (fresh) setOpenMatch(fresh);
          })();
        }}
        onExit={() => {
          setOpenMatch(undefined);
          setError(undefined);
          void refreshList();
        }}
      />
    );
  }

  return (
    <MatchListScreen
      playerName={session.user.name}
      matches={matches}
      busy={busy}
      error={error}
      onOpen={(matchId) => {
        void (async () => {
          const snapshot = await run(fetchMatch(matchId));
          if (snapshot) setOpenMatch(snapshot);
        })();
      }}
      onAccept={(matchId) => {
        void (async () => {
          const snapshot = await run(acceptInvitation(matchId));
          if (snapshot) setOpenMatch(snapshot);
          await refreshList();
        })();
      }}
      onDecline={(matchId) => {
        void (async () => {
          await run(declineInvitation(matchId));
          await refreshList();
        })();
      }}
      onCreate={(opponentEmail) => {
        void (async () => {
          await run(createMatch(opponentEmail, { rackSize: 7, modifiers: [] }));
          await refreshList();
        })();
      }}
      onSignOut={() => {
        void (async () => {
          await signOut();
          setMatches([]);
          setOpenMatch(undefined);
        })();
      }}
    />
  );
}
