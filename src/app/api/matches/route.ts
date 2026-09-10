import { listMatchesForUser } from "@/server/matches";
import { createMatch } from "@/server/matchActions";
import { BAD_REQUEST, jsonResponse, UNAUTHENTICATED } from "@/server/http";
import { parseCreateMatch } from "@/server/requests";
import { currentUser } from "@/server/session";

/** The signed-in user's matches — the list of `online-multiplayer.md` section 14. */
export async function GET(request: Request) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  return jsonResponse({ matches: await listMatchesForUser(user.id) }, 200);
}

/** Invites an opponent to a new match (section 12); the game starts when they accept. */
export async function POST(request: Request) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const body = parseCreateMatch(await request.json().catch(() => undefined));
  if (!body) return BAD_REQUEST();

  const result = await createMatch({
    user,
    opponent: body.opponent,
    configuration: body.configuration,
  });

  switch (result.outcome) {
    case "OK":
      return jsonResponse({ matchId: result.matchId }, 201);
    case "OPPONENT_NOT_FOUND":
      return jsonResponse({ error: "OPPONENT_NOT_FOUND" }, 404);
    case "CANNOT_PLAY_ALONE":
      return jsonResponse({ error: "CANNOT_PLAY_ALONE" }, 400);
  }
}
