import { listSocialGraph } from "@/server/friends";
import { jsonResponse, UNAUTHENTICATED } from "@/server/http";
import { currentUser } from "@/server/session";

/**
 * The signed-in user's social graph: friends, requests to answer, requests sent (T28.2).
 *
 * The user's own handle comes with it, because the screen that shows this is also where they read
 * it off to somebody else (DEC-027).
 */
export async function GET(request: Request) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  return jsonResponse(
    { handle: user.handle, ...(await listSocialGraph(user.id)) },
    200,
  );
}
