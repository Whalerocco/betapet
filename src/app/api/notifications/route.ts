import { jsonResponse, UNAUTHENTICATED } from "@/server/http";
import { countByType, listNotificationsForUser } from "@/server/notifications";
import { currentUser } from "@/server/session";

/**
 * What needs the signed-in user's attention (T30.1; `online-multiplayer.md` section 41).
 *
 * The counts come back with the list rather than from an endpoint of their own, because the match
 * list's badges and the notifications screen must not be able to disagree about what is waiting —
 * one derivation, read two ways.
 */
export async function GET(request: Request) {
  const user = await currentUser(request.headers);
  if (!user) return UNAUTHENTICATED();

  const notifications = await listNotificationsForUser(user.id);

  return jsonResponse(
    { notifications, counts: countByType(notifications) },
    200,
  );
}
