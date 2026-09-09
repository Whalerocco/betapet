import { jsonResponse, matchResponse, UNAUTHENTICATED } from "@/server/http";
import { declineInvitation } from "@/server/matchActions";
import { currentUser } from "@/server/session";

/** Declines an invitation, which cancels the match (`online-multiplayer.md` sections 13 and 15). */
export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const { matchId } = await context.params;
  const result = await declineInvitation(user, matchId);

  return result.outcome === "OK"
    ? jsonResponse({ status: "CANCELLED" }, 200)
    : matchResponse(result);
}
