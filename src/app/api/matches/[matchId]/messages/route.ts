import {
  listMessagesForUser,
  sendMessage,
  MAX_MESSAGE_LENGTH,
} from "@/server/chat";
import { BAD_REQUEST, jsonResponse, UNAUTHENTICATED } from "@/server/http";
import { parseChatMessage } from "@/server/requests";
import { currentUser } from "@/server/session";

/**
 * A match's conversation (T29.1; `online-multiplayer.md` sections 39-40).
 *
 * Both verbs answer 404 for a match the caller does not play in, which is the same answer a match
 * that does not exist gets: an id is not authorization, and a 403 would confirm the match is real
 * (section 38).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const { matchId } = await context.params;
  const messages = await listMessagesForUser(matchId, user.id);

  return messages
    ? jsonResponse({ messages, maxLength: MAX_MESSAGE_LENGTH }, 200)
    : jsonResponse({ error: "NOT_FOUND" }, 404);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const body = parseChatMessage(await request.json().catch(() => undefined));
  if (!body) return BAD_REQUEST();

  const { matchId } = await context.params;
  const result = await sendMessage({
    matchId,
    senderUserId: user.id,
    text: body.text,
  });

  switch (result.outcome) {
    case "OK":
      return jsonResponse({ message: result.message }, 201);
    case "NOT_FOUND":
      return jsonResponse({ error: "NOT_FOUND" }, 404);
    case "EMPTY_MESSAGE":
      return jsonResponse({ error: "EMPTY_MESSAGE" }, 422);
    case "MESSAGE_TOO_LONG":
      return jsonResponse(
        { error: "MESSAGE_TOO_LONG", maxLength: result.maxLength },
        422,
      );
  }
}
