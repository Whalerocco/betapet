import { matchResponse, UNAUTHENTICATED } from "@/server/http";
import { matchViewFor } from "@/server/matchActions";
import { currentUser } from "@/server/session";

/** One match, as this player may see it (`online-multiplayer.md` sections 16-17). */
export async function GET(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const { matchId } = await context.params;
  return matchResponse(await matchViewFor(user, matchId));
}
