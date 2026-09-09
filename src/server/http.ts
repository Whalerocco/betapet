import type { MatchViewResult } from "./matchActions";

/**
 * How an action's outcome becomes an HTTP response.
 *
 * The mapping is deliberate about one thing: a match a user does not play in and a match that
 * does not exist are both 404. `online-multiplayer.md` section 38 says an id is not
 * authorization, and a 403 would confirm that the match is real.
 */
export function jsonResponse(body: unknown, status: number): Response {
  return Response.json(body, { status });
}

export const UNAUTHENTICATED = () =>
  jsonResponse({ error: "UNAUTHENTICATED" }, 401);

export const BAD_REQUEST = () => jsonResponse({ error: "BAD_REQUEST" }, 400);

export function matchResponse(result: MatchViewResult): Response {
  switch (result.outcome) {
    case "OK":
      return jsonResponse(result, 200);
    case "NOT_FOUND":
      return jsonResponse({ error: "NOT_FOUND" }, 404);
    case "WRONG_MATCH_STATUS":
      return jsonResponse(
        { error: "WRONG_MATCH_STATUS", status: result.status },
        409,
      );
    case "STALE_REVISION":
      // The client is not wrong, only behind: refetch and decide again (section 31).
      return jsonResponse(
        { error: "STALE_REVISION", currentRevision: result.currentRevision },
        409,
      );
    case "RULE_REJECTED":
      // The engine refused the move. The state is untouched.
      return jsonResponse({ error: "RULE_REJECTED", ...result.error }, 422);
    case "INVALID_STATE":
      return jsonResponse({ error: "INVALID_STATE" }, 500);
  }
}
