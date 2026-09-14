import { jsonResponse, UNAUTHENTICATED } from "@/server/http";
import { markMatchSeen } from "@/server/notifications";
import { currentUser } from "@/server/session";

/**
 * Records that this user has looked at the match as it currently stands (T30.1).
 *
 * A separate call rather than a side effect of reading the match: a GET that writes would mark a
 * match seen every time the open-match poll fires, and would be a write nobody asked for.
 *
 * It carries no revision. The server reads the one the row holds, so a client cannot claim to
 * have seen a state that never existed, and there is nothing to guard against a stale write —
 * unlike a turn action, seeing an older state is simply seeing less.
 *
 * A match the user does not play in is 404, the same answer every other read gives, so an id
 * cannot be used to discover that a match exists (section 38).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const { matchId } = await context.params;
  const marked = await markMatchSeen(matchId, user.id);

  return marked
    ? jsonResponse({ seen: true }, 200)
    : jsonResponse({ error: "NOT_FOUND" }, 404);
}
