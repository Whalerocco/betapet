import { matchResponse, UNAUTHENTICATED } from "@/server/http";
import { acceptInvitation } from "@/server/matchActions";
import { currentUser } from "@/server/session";

/** Accepts an invitation, which is what starts the game (`online-multiplayer.md` section 13). */
export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const { matchId } = await context.params;
  return matchResponse(await acceptInvitation(user, matchId));
}
