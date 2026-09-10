"use client";

import { request, type ApiResult } from "./matchApi";

/**
 * The interface's view of the friends endpoints (T28.1-T28.3).
 *
 * A friend is a user id, a display name and a handle, and deliberately nothing more: the interface
 * is never told an email address, because it has no use for one and section 10 keeps the profile
 * to what identifying an opponent needs.
 */

export interface FriendSummary {
  readonly userId: string;
  readonly name: string;
  readonly handle: string;
}

export interface Friend extends FriendSummary {
  /** When the friendship was accepted, as an ISO string. */
  readonly since: string;
}

export interface FriendRequest extends FriendSummary {
  readonly requestId: string;
  readonly sentAt: string;
}

export interface SocialGraph {
  /** The signed-in user's own handle, which this screen is where they read off. */
  readonly handle: string;
  readonly friends: readonly Friend[];
  readonly incoming: readonly FriendRequest[];
  readonly outgoing: readonly FriendRequest[];
}

export function fetchSocialGraph(): Promise<ApiResult<SocialGraph>> {
  return request("/api/friends");
}

/**
 * Sends a friend request to a handle.
 *
 * The handle is sent as typed; the server normalizes it, so `@Anna` and `anna` are the same
 * request and only one place decides what a handle is (DEC-027).
 */
export function sendFriendRequest(
  handle: string,
): Promise<ApiResult<{ status: string; addressee: FriendSummary }>> {
  return request("/api/friends/requests", {
    method: "POST",
    body: JSON.stringify({ handle }),
  });
}

export function acceptFriendRequest(
  requestId: string,
): Promise<ApiResult<{ status: string }>> {
  return request(`/api/friends/requests/${requestId}/accept`, {
    method: "POST",
  });
}

export function declineFriendRequest(
  requestId: string,
): Promise<ApiResult<{ status: string }>> {
  return request(`/api/friends/requests/${requestId}/decline`, {
    method: "POST",
  });
}
