"use client";

import { request, type ApiResult } from "./matchApi";

/**
 * The interface's view of a match's chat (T29.1).
 *
 * Chat deliberately does not travel with the match. It is a separate endpoint because it is
 * separate storage (`online-multiplayer.md` section 39), and keeping the two apart on the wire as
 * well means a message can never arrive as part of a state transition — nor a failure to fetch
 * one stop a game from being played.
 */

export interface ChatMessage {
  readonly id: string;
  readonly matchId: string;
  readonly senderUserId: string;
  readonly senderName: string;
  readonly text: string;
  /** An ISO string on the wire. */
  readonly createdAt: string;
}

export interface ChatMessages {
  readonly messages: readonly ChatMessage[];
  /** The server's limit, so the interface can say what it is rather than guess. */
  readonly maxLength: number;
}

export function fetchMessages(
  matchId: string,
): Promise<ApiResult<ChatMessages>> {
  return request(`/api/matches/${matchId}/messages`);
}

export function sendMessage(
  matchId: string,
  text: string,
): Promise<ApiResult<{ message: ChatMessage }>> {
  return request(`/api/matches/${matchId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}
