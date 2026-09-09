import { BAD_REQUEST, matchResponse, UNAUTHENTICATED } from "@/server/http";
import { performTurn } from "@/server/matchActions";
import { parseTurnAction } from "@/server/requests";
import { currentUser } from "@/server/session";

/**
 * One turn action — pass, exchange, or a finished placement to submit.
 *
 * The body carries the revision the client believes it is acting on, and never a player id: which
 * player the caller is comes from the session and the match's seats (`src/server/matchActions.ts`).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const body: unknown = await request.json().catch(() => undefined);
  if (typeof body !== "object" || body === null) return BAD_REQUEST();

  const expectedRevision = (body as { expectedRevision?: unknown })
    .expectedRevision;
  if (!Number.isInteger(expectedRevision)) return BAD_REQUEST();

  const action = parseTurnAction((body as { action?: unknown }).action);
  if (!action) return BAD_REQUEST();

  const { matchId } = await context.params;
  return matchResponse(
    await performTurn({
      user,
      matchId,
      expectedRevision: expectedRevision as number,
      action,
    }),
  );
}
