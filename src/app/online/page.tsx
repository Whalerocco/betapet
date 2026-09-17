"use client";

import { useCallback, useEffect, useState } from "react";

import {
  signIn,
  signOut,
  signUp,
  useSession,
} from "../../application/auth/authClient";
import {
  fetchMessages,
  sendMessage,
  type ChatMessages,
} from "../../application/online/chatApi";
import {
  describeAuthFailure,
  describeFailure,
} from "../../application/online/failureMessages";
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchSocialGraph,
  sendFriendRequest,
  type SocialGraph,
} from "../../application/online/friendsApi";
import {
  acceptInvitation,
  createMatch,
  createMatchWithFriend,
  createMatchWithHandle,
  declineInvitation,
  fetchMatch,
  listMatches,
  sendTurnAction,
  type ApiResult,
  type MatchListEntry,
  type MatchSnapshot,
  type TurnAction,
} from "../../application/online/matchApi";
import {
  fetchNotifications,
  markMatchSeen,
  NO_NOTIFICATIONS,
  type NotificationFeed,
} from "../../application/online/notificationsApi";
import { FriendsScreen } from "../../components/online/FriendsScreen";
import { MatchListScreen } from "../../components/online/MatchListScreen";
import {
  NewMatchScreen,
  type NewMatchOpponent,
  type NewMatchValues,
} from "../../components/online/NewMatchScreen";
import { OnlineGameScreen } from "../../components/online/OnlineGameScreen";
import { SignInScreen } from "../../components/online/SignInScreen";

/** How often an open match asks the server whether anything happened (DEC-020: polling). */
const POLL_INTERVAL_MS = 15_000;

/**
 * How often the match list asks what is waiting (T30.1).
 *
 * Slower than an open match, because the two answer different questions. An open match is being
 * watched move by move; the list is what somebody has left open in a tab, where a badge arriving
 * half a minute late costs nothing and a request every fifteen seconds is noise.
 */
const NOTIFICATION_POLL_INTERVAL_MS = 60_000;

export default function OnlinePage() {
  const { data: session, isPending: sessionPending } = useSession();

  const [matches, setMatches] = useState<readonly MatchListEntry[]>([]);
  const [openMatch, setOpenMatch] = useState<MatchSnapshot | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  /** The friends screen, which the match list is the way back from (T28.2). */
  const [friends, setFriends] = useState<SocialGraph | undefined>();
  const [friendsNotice, setFriendsNotice] = useState<string | undefined>();

  /** Who a new match is being set up against, while the rules are chosen (T28.4). */
  const [newMatch, setNewMatch] = useState<NewMatchOpponent | undefined>();

  /** What is waiting on this player: the badges, and the reasons on the rows (T30.1). */
  const [feed, setFeed] = useState<NotificationFeed>(NO_NOTIFICATIONS);

  /** The open match's conversation, fetched beside the match because it is stored beside it. */
  const [chat, setChat] = useState<ChatMessages | undefined>();

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

  const refreshFriends = useCallback(async () => {
    const result = await fetchSocialGraph();
    if (result.ok) setFriends(result.value);
  }, []);

  const refreshFeed = useCallback(async () => {
    const result = await fetchNotifications();
    if (result.ok) setFeed(result.value);
  }, []);

  /*
   * Opening a match is the moment "I have seen this" becomes true, so the seat's marker is
   * advanced here rather than anywhere the player might not reach. Only a finished match needs
   * it — everything else stops being a notification as soon as the player acts — but it is sent
   * for every match, because what the match turns out to be waiting for does not change whether
   * it has been looked at.
   *
   * The marking is not awaited before the screen opens: it is bookkeeping, and a game should not
   * wait on it. The feed is refreshed afterwards so the badge the player just cleared goes away.
   */
  const openMatchById = useCallback(
    async (matchId: string) => {
      const snapshot = await run(fetchMatch(matchId));
      if (!snapshot) return;

      setOpenMatch(snapshot);
      void markMatchSeen(matchId).then(() => refreshFeed());

      // The conversation is fetched separately, and a failure to get it must not stop the match
      // from being played: chat is beside the game, never a condition of it.
      setChat(undefined);
      void fetchMessages(matchId).then((result) => {
        if (result.ok) setChat(result.value);
      });
    },
    [run, refreshFeed],
  );

  useEffect(() => {
    if (!session) return;

    // The list is fetched in the effect and stored from the promise's callback, so a response
    // that arrives after the page has moved on is discarded rather than applied to a screen that
    // no longer wants it.
    let cancelled = false;
    void listMatches().then((result) => {
      if (!cancelled && result.ok) setMatches(result.value.matches);
    });
    void fetchNotifications().then((result) => {
      if (!cancelled && result.ok) setFeed(result.value);
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  /*
   * What is waiting is polled while no match is open (T30.1) — slowly, because the list is what
   * somebody leaves open in a tab. An open match refreshes the same feed on its own faster beat
   * (its "Mina matcher" button is badged with it), so the two never run at once.
   */
  useEffect(() => {
    if (!session || openMatch) return;

    let cancelled = false;
    const timer = setInterval(() => {
      void fetchNotifications().then((result) => {
        if (!cancelled && result.ok) setFeed(result.value);
      });
    }, NOTIFICATION_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [session, openMatch]);

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
      // The same beat brings the conversation, so a message and a move arrive together rather
      // than on two timers drifting past each other.
      void fetchMessages(openMatch.matchId).then((result) => {
        if (!cancelled && result.ok) setChat(result.value);
      });
      // And what is waiting elsewhere, which the way back is now badged with (T30.1).
      void fetchNotifications().then((result) => {
        if (!cancelled && result.ok) setFeed(result.value);
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
    handle: string;
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
            handle: values.handle,
          });

    setBusy(false);
    if (result.error) {
      setError(describeAuthFailure(values.mode, result.error.code));
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
        notifications={feed.notifications}
        onExit={() => {
          setOpenMatch(undefined);
          setChat(undefined);
          setError(undefined);
          void refreshList();
          void refreshFeed();
        }}
        /*
         * `Revansch` on a finished match (T34.2): leave the match and open match creation with
         * the same opponent already chosen. It stops there rather than creating anything — the
         * rules are the inviter's to choose, and a rematch is an ordinary invitation (DEC-029).
         */
        onRematch={(opponent) => {
          setOpenMatch(undefined);
          setChat(undefined);
          setError(undefined);
          setNewMatch({ kind: "HANDLE", ...opponent });
        }}
        chatMessages={chat?.messages}
        chatMaxLength={chat?.maxLength}
        viewerUserId={session.user.id}
        onSendMessage={(text) => {
          void (async () => {
            const sent = await run(sendMessage(openMatch.matchId, text));
            if (!sent) return;

            // Shown at once rather than waiting for the next poll, and reconciled by it: the
            // server's copy is what the list becomes on the following fetch.
            setChat((current) => ({
              maxLength: current?.maxLength ?? text.length,
              messages: [...(current?.messages ?? []), sent.message],
            }));
          })();
        }}
      />
    );
  }

  if (newMatch) {
    return (
      <NewMatchScreen
        opponent={newMatch}
        friends={friends?.friends ?? []}
        busy={busy}
        error={error}
        onCreate={(values: NewMatchValues) => {
          void (async () => {
            const rules = {
              rackSize: values.rackSize,
              modifiers: values.modifiers,
              polyglotLanguages: values.polyglotLanguages,
              wildLanguages: values.wildLanguages,
            };

            /*
             * The ways to name an opponent, with the screen having already decided which
             * (T32.1): a friend chosen before arriving, a friend picked from the list, the
             * opponent of a finished match offering a rematch (T34.2), a handle, or an address.
             * A friend is named by id; the rest resolve server-side.
             */
            const named =
              newMatch.kind === "FRIEND"
                ? ({ kind: "FRIEND", userId: newMatch.userId } as const)
                : newMatch.kind === "HANDLE"
                  ? ({ kind: "HANDLE", handle: newMatch.handle } as const)
                  : values.opponent;

            const created = await run(
              named?.kind === "FRIEND"
                ? createMatchWithFriend(named.userId, rules)
                : named?.kind === "HANDLE"
                  ? createMatchWithHandle(named.handle, rules)
                  : createMatch(named?.email ?? "", rules),
            );

            if (created) {
              // The invitation now lives in the match list, which is where it is answered.
              setNewMatch(undefined);
              setFriends(undefined);
              await refreshList();
            }
          })();
        }}
        onCancel={() => {
          setNewMatch(undefined);
          setError(undefined);
        }}
      />
    );
  }

  if (friends) {
    return (
      <FriendsScreen
        graph={friends}
        busy={busy}
        error={error}
        notice={friendsNotice}
        onSendRequest={(handle) => {
          void (async () => {
            setFriendsNotice(undefined);
            const sent = await run(sendFriendRequest(handle));
            if (sent) {
              setFriendsNotice(
                sent.status === "ACCEPTED"
                  ? `${sent.addressee.name} hade redan skickat en förfrågan till dig. Ni är vänner.`
                  : `Förfrågan skickad till ${sent.addressee.name}.`,
              );
            }
            await refreshFriends();
          })();
        }}
        onAccept={(requestId) => {
          void (async () => {
            setFriendsNotice(undefined);
            await run(acceptFriendRequest(requestId));
            await refreshFriends();
            await refreshFeed();
          })();
        }}
        onDecline={(requestId) => {
          void (async () => {
            setFriendsNotice(undefined);
            await run(declineFriendRequest(requestId));
            await refreshFriends();
            await refreshFeed();
          })();
        }}
        onStartMatch={(friendUserId) => {
          const friend = friends.friends.find(
            (entry) => entry.userId === friendUserId,
          );
          if (!friend) return;

          setFriendsNotice(undefined);
          setError(undefined);
          setNewMatch({
            kind: "FRIEND",
            userId: friend.userId,
            name: friend.name,
            handle: friend.handle,
          });
        }}
        onBack={() => {
          setFriends(undefined);
          setFriendsNotice(undefined);
          setError(undefined);
        }}
      />
    );
  }

  return (
    <MatchListScreen
      playerName={session.user.name}
      matches={matches}
      feed={feed}
      busy={busy}
      error={error}
      onOpen={(matchId) => {
        void openMatchById(matchId);
      }}
      onAccept={(matchId) => {
        void (async () => {
          const snapshot = await run(acceptInvitation(matchId));
          if (snapshot) setOpenMatch(snapshot);
          await refreshList();
          await refreshFeed();
        })();
      }}
      onDecline={(matchId) => {
        void (async () => {
          await run(declineInvitation(matchId));
          await refreshList();
          await refreshFeed();
        })();
      }}
      onNewMatch={() => {
        void (async () => {
          setError(undefined);
          setNewMatch({ kind: "CHOOSE" });
          // The picker offers the player's friends, so the graph has to be here. Fetched rather
          // than required: a failure leaves the list empty and a handle or address still works.
          if (!friends) await refreshFriends();
        })();
      }}
      onShowFriends={() => {
        void (async () => {
          setError(undefined);
          const graph = await run(fetchSocialGraph());
          if (graph) setFriends(graph);
        })();
      }}
      onSignOut={() => {
        void (async () => {
          await signOut();
          setMatches([]);
          setOpenMatch(undefined);
          setFriends(undefined);
          setNewMatch(undefined);
          setFeed(NO_NOTIFICATIONS);
          setChat(undefined);
        })();
      }}
    />
  );
}
