import { respondToFriendRequest } from "@/server/friends";
import { jsonResponse, UNAUTHENTICATED } from "@/server/http";
import { currentUser } from "@/server/session";

/**
 * DECLINEs a friend request (T28.2).
 *
 * A request addressed to somebody else is a 404 rather than a 403, for the reason
 * `online-multiplayer.md` section 38 gives: anything else would confirm that it exists.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const { requestId } = await params;
  const result = await respondToFriendRequest({
    userId: user.id,
    requestId,
    response: "DECLINE",
  });

  return result.outcome === "OK"
    ? jsonResponse({ status: result.status }, 200)
    : jsonResponse({ error: "NOT_FOUND" }, 404);
}
