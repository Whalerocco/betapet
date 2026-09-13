"use client";

import type { Coordinate } from "../../game/model/coordinate";
import type { TileId } from "../../game/model/ids";
import type { PlayerGameView } from "../../game/view/playerGameView";

/**
 * The interface's view of the server's domain actions (`online-multiplayer.md` section 36).
 *
 * Components never call `fetch` themselves: they call these, and get back either a result or a
 * named failure. Keeping that here means one place understands the wire format, and one place
 * decides what a 409 means in Swedish.
 *
 * No call sends a player id. The server derives it from the session (DEC-024), so the interface
 * has nothing to get wrong.
 */

export type MatchListCategory =
  | "YOUR_TURN"
  | "AWAITING_YOUR_REVIEW"
  | "WAITING_FOR_OPPONENT"
  | "FINISHED"
  | "INVITATION_RECEIVED"
  | "INVITATION_SENT"
  | "CANCELLED";

/** The rules a match is played by, as the API carries them. */
export interface MatchRules {
  readonly rackSize: number;
  readonly modifiers: readonly string[];
  /** Only meaningful when `modifiers` contains "POLYGLOT". */
  readonly polyglotLanguages?: readonly string[];
  /** Ordered rotation; only meaningful when `modifiers` contains "WILD". */
  readonly wildLanguages?: readonly string[];
}

export interface MatchListEntry {
  readonly id: string;
  readonly category: MatchListCategory;
  readonly opponentName: string;
  /** What the match is played by, so an invitation can be read before it is answered (T28.4). */
  readonly configuration: MatchRules;
  readonly revision: number;
  readonly updatedAt: string;
}

export interface MatchSnapshot {
  readonly matchId: string;
  readonly revision: number;
  readonly status: string;
  /** The rules the match is played by, which the game view itself does not carry. */
  readonly configuration: MatchRules;
  readonly view: PlayerGameView;
}

/** Everything that can come back other than success, as something the interface can act on. */
export type ApiFailure =
  | { readonly error: "UNAUTHENTICATED" }
  | { readonly error: "NOT_FOUND" }
  | { readonly error: "OPPONENT_NOT_FOUND" }
  | { readonly error: "CANNOT_PLAY_ALONE" }
  | { readonly error: "INVALID_CONFIGURATION" }
  // The friends endpoints (T28.1-T28.2).
  | { readonly error: "USER_NOT_FOUND" }
  | { readonly error: "CANNOT_FRIEND_SELF" }
  | { readonly error: "ALREADY_FRIENDS" }
  | { readonly error: "ALREADY_REQUESTED" }
  | { readonly error: "WRONG_MATCH_STATUS"; readonly status?: string }
  | { readonly error: "STALE_REVISION"; readonly currentRevision: number }
  | {
      readonly error: "RULE_REJECTED";
      readonly code?: string;
      readonly messageKey?: string;
    }
  | { readonly error: "NETWORK" }
  | { readonly error: "UNKNOWN" };

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly failure: ApiFailure };

/** Exported so `friendsApi` sends and reads requests the same way, rather than its own way. */
export async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
  } catch {
    return { ok: false, failure: { error: "NETWORK" } };
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (response.ok) return { ok: true, value: body as T };

  const failure =
    body && typeof body === "object" && "error" in body
      ? (body as ApiFailure)
      : ({ error: "UNKNOWN" } as const);

  return { ok: false, failure };
}

export function listMatches(): Promise<
  ApiResult<{ matches: readonly MatchListEntry[] }>
> {
  return request("/api/matches");
}

/** Invites somebody who is not a friend; knowing their address is what makes it possible. */
export function createMatch(
  opponentEmail: string,
  configuration: MatchRules,
): Promise<ApiResult<{ matchId: string }>> {
  return request("/api/matches", {
    method: "POST",
    body: JSON.stringify({ opponentEmail, configuration }),
  });
}

/**
 * Invites a friend, named by the id the friend list already holds (T28.3).
 *
 * The server accepts an id only from an accepted friend, so this is not a way to invite an
 * arbitrary account.
 */
export function createMatchWithFriend(
  opponentUserId: string,
  configuration: MatchRules,
): Promise<ApiResult<{ matchId: string }>> {
  return request("/api/matches", {
    method: "POST",
    body: JSON.stringify({ opponentUserId, configuration }),
  });
}

export function acceptInvitation(
  matchId: string,
): Promise<ApiResult<MatchSnapshot>> {
  return request(`/api/matches/${matchId}/accept`, { method: "POST" });
}

export function declineInvitation(
  matchId: string,
): Promise<ApiResult<{ status: string }>> {
  return request(`/api/matches/${matchId}/decline`, { method: "POST" });
}

export function fetchMatch(matchId: string): Promise<ApiResult<MatchSnapshot>> {
  return request(`/api/matches/${matchId}`);
}

/** What a player may ask the server to do; placements are sent whole, never as a diff. */
export type TurnAction =
  | { readonly type: "PASS" }
  | { readonly type: "EXCHANGE_TILES"; readonly tileIds: readonly TileId[] }
  | {
      readonly type: "SUBMIT_MOVE";
      readonly placements: readonly {
        readonly tileId: TileId;
        readonly coordinate: Coordinate;
        readonly representedLetter?: string;
      }[];
    }
  | { readonly type: "CONFIRM_PROPOSAL" }
  | { readonly type: "CANCEL_PROPOSAL" }
  | { readonly type: "ACCEPT_PROPOSED_MOVE" }
  | { readonly type: "REJECT_PROPOSED_MOVE" };

export function sendTurnAction(
  matchId: string,
  expectedRevision: number,
  action: TurnAction,
): Promise<ApiResult<MatchSnapshot>> {
  return request(`/api/matches/${matchId}/actions`, {
    method: "POST",
    body: JSON.stringify({ expectedRevision, action }),
  });
}
