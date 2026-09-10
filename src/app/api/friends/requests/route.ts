import { sendFriendRequest } from "@/server/friends";
import { BAD_REQUEST, jsonResponse, UNAUTHENTICATED } from "@/server/http";
import { parseFriendRequest } from "@/server/requests";
import { currentUser } from "@/server/session";

/**
 * Sends a friend request to the owner of a handle (T28.1, T28.2).
 *
 * Resolving the handle and sending the request are one step on purpose: there is no endpoint that
 * answers "who owns this handle", so nothing here can be used to walk the user list (DEC-027).
 */
export async function POST(request: Request) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const body = parseFriendRequest(await request.json().catch(() => undefined));
  if (!body) return BAD_REQUEST();

  const result = await sendFriendRequest({
    userId: user.id,
    handle: body.handle,
  });

  switch (result.outcome) {
    case "OK":
      return jsonResponse(
        { status: result.status, addressee: result.addressee },
        201,
      );
    case "USER_NOT_FOUND":
      return jsonResponse({ error: "USER_NOT_FOUND" }, 404);
    case "CANNOT_FRIEND_SELF":
      return jsonResponse({ error: "CANNOT_FRIEND_SELF" }, 400);
    case "ALREADY_FRIENDS":
      return jsonResponse({ error: "ALREADY_FRIENDS" }, 409);
    case "ALREADY_REQUESTED":
      return jsonResponse({ error: "ALREADY_REQUESTED" }, 409);
  }
}
