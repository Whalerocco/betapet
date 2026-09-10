import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * The social graph against a real database (T28.1-T28.3, DEC-028).
 *
 * Two of the guarantees here are Postgres's rather than the application's — one row per pair
 * whichever direction it was created in, and a check that nobody can befriend themselves — so
 * these run against the configured database and are skipped when there is none, exactly as
 * `matches.test.ts` does. Each test starts from an empty `friendship` table for its three users.
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // Nothing to load; DATABASE_URL may already be in the environment, or the suite will skip.
}

const configured = Boolean(process.env.DATABASE_URL);

describe.skipIf(!configured)("friends", () => {
  let friends: typeof import("./friends");
  let db: typeof import("./db/client").db;
  let schema: typeof import("./db/schema");
  let drizzle: typeof import("drizzle-orm");

  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 10);
  const august = {
    id: `test-user-august-${suffix}`,
    name: "August",
    handle: `august${suffix}`,
  };
  const anna = {
    id: `test-user-anna-${suffix}`,
    name: "Anna",
    handle: `anna${suffix}`,
  };
  const stranger = {
    id: `test-user-stranger-${suffix}`,
    name: "Stranger",
    handle: `stranger${suffix}`,
  };
  const everyone = [august, anna, stranger];

  beforeAll(async () => {
    friends = await import("./friends");
    db = (await import("./db/client")).db;
    schema = await import("./db/schema");
    drizzle = await import("drizzle-orm");

    await db.insert(schema.user).values(
      everyone.map((person) => ({
        id: person.id,
        name: person.name,
        email: `${person.handle}@example.invalid`,
        emailVerified: false,
        handle: person.handle,
      })),
    );
  });

  afterAll(async () => {
    if (!configured) return;
    // Deleting the users cascades to every friendship they appear in.
    await db.delete(schema.user).where(
      drizzle.inArray(
        schema.user.id,
        everyone.map((person) => person.id),
      ),
    );
  });

  beforeEach(async () => {
    await db.delete(schema.friendship).where(
      drizzle.inArray(
        schema.friendship.requesterUserId,
        everyone.map((person) => person.id),
      ),
    );
  });

  /** A pending request from August to Anna, and its id. */
  async function pendingRequest() {
    const sent = await friends.sendFriendRequest({
      userId: august.id,
      handle: anna.handle,
    });
    if (sent.outcome !== "OK") throw new Error(sent.outcome);

    const { incoming } = await friends.listSocialGraph(anna.id);
    return incoming[0].requestId;
  }

  describe("finding somebody by handle", () => {
    it("sends a request to the owner of the handle", async () => {
      const result = await friends.sendFriendRequest({
        userId: august.id,
        handle: anna.handle,
      });

      expect(result).toEqual({
        outcome: "OK",
        status: "PENDING",
        addressee: { userId: anna.id, name: anna.name, handle: anna.handle },
      });
    });

    it("reports a handle nobody owns without saying more", async () => {
      const result = await friends.sendFriendRequest({
        userId: august.id,
        handle: `nobody${suffix}`,
      });

      expect(result).toEqual({ outcome: "USER_NOT_FOUND" });
    });

    it("refuses a request to oneself", async () => {
      const result = await friends.sendFriendRequest({
        userId: august.id,
        handle: august.handle,
      });

      expect(result).toEqual({ outcome: "CANNOT_FRIEND_SELF" });
    });

    it("refuses a second request to the same person", async () => {
      await pendingRequest();

      const again = await friends.sendFriendRequest({
        userId: august.id,
        handle: anna.handle,
      });

      expect(again).toEqual({ outcome: "ALREADY_REQUESTED" });
    });

    it("refuses a request to somebody who is already a friend", async () => {
      const requestId = await pendingRequest();
      await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "ACCEPT",
      });

      const again = await friends.sendFriendRequest({
        userId: august.id,
        handle: anna.handle,
      });

      expect(again).toEqual({ outcome: "ALREADY_FRIENDS" });
    });

    it("treats a request that crosses one coming the other way as an acceptance", async () => {
      // Otherwise both would sit waiting for the other to answer (DEC-028).
      await pendingRequest();

      const crossing = await friends.sendFriendRequest({
        userId: anna.id,
        handle: august.handle,
      });

      expect(crossing).toMatchObject({ outcome: "OK", status: "ACCEPTED" });
      expect(await friends.areFriends(august.id, anna.id)).toBe(true);

      const { incoming, outgoing } = await friends.listSocialGraph(anna.id);
      expect(incoming).toHaveLength(0);
      expect(outgoing).toHaveLength(0);
    });

    it("keeps one row per pair, whichever direction the requests went", async () => {
      // The unique index orders the pair, so this is the database's guarantee, not the code's.
      await pendingRequest();
      await friends.sendFriendRequest({
        userId: anna.id,
        handle: august.handle,
      });

      const rows = await db
        .select({ id: schema.friendship.id })
        .from(schema.friendship)
        .where(
          drizzle.inArray(schema.friendship.requesterUserId, [
            august.id,
            anna.id,
          ]),
        );

      expect(rows).toHaveLength(1);
    });
  });

  describe("answering a request", () => {
    it("accepts, and both sides then see a friend rather than a request", async () => {
      const requestId = await pendingRequest();

      const result = await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "ACCEPT",
      });

      expect(result).toEqual({ outcome: "OK", status: "ACCEPTED" });

      for (const person of [august, anna]) {
        const graph = await friends.listSocialGraph(person.id);
        expect(graph.friends).toHaveLength(1);
        expect(graph.incoming).toHaveLength(0);
        expect(graph.outgoing).toHaveLength(0);
      }
    });

    it("declines, and the request stops being pending for either side", async () => {
      const requestId = await pendingRequest();

      const result = await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "DECLINE",
      });

      expect(result).toEqual({ outcome: "OK", status: "DECLINED" });
      expect(await friends.areFriends(august.id, anna.id)).toBe(false);

      const requester = await friends.listSocialGraph(august.id);
      expect(requester.outgoing).toHaveLength(0);
      expect(requester.friends).toHaveLength(0);
    });

    it("lets a declined pair try again later, reusing the row", async () => {
      const requestId = await pendingRequest();
      await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "DECLINE",
      });

      const again = await friends.sendFriendRequest({
        userId: anna.id,
        handle: august.handle,
      });

      expect(again).toMatchObject({ outcome: "OK", status: "PENDING" });
      const graph = await friends.listSocialGraph(august.id);
      // Now addressed to August, since Anna is the one asking this time.
      expect(graph.incoming).toHaveLength(1);
    });

    it("refuses to let the requester accept their own request", async () => {
      const requestId = await pendingRequest();

      const result = await friends.respondToFriendRequest({
        userId: august.id,
        requestId,
        response: "ACCEPT",
      });

      expect(result).toEqual({ outcome: "NOT_FOUND" });
      expect(await friends.areFriends(august.id, anna.id)).toBe(false);
    });

    it("hides a request addressed to somebody else behind the same answer", async () => {
      const requestId = await pendingRequest();

      const result = await friends.respondToFriendRequest({
        userId: stranger.id,
        requestId,
        response: "ACCEPT",
      });

      // A 404 rather than a 403: anything else would confirm the request exists (section 38).
      expect(result).toEqual({ outcome: "NOT_FOUND" });
    });

    it("cannot answer the same request twice", async () => {
      const requestId = await pendingRequest();
      await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "ACCEPT",
      });

      const again = await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "DECLINE",
      });

      expect(again).toEqual({ outcome: "NOT_FOUND" });
      expect(await friends.areFriends(august.id, anna.id)).toBe(true);
    });
  });

  describe("the social list", () => {
    it("puts a request in incoming for one side and outgoing for the other", async () => {
      await pendingRequest();

      const sender = await friends.listSocialGraph(august.id);
      const receiver = await friends.listSocialGraph(anna.id);

      expect(sender.outgoing).toHaveLength(1);
      expect(sender.outgoing[0]).toMatchObject({ handle: anna.handle });
      expect(sender.incoming).toHaveLength(0);

      expect(receiver.incoming).toHaveLength(1);
      expect(receiver.incoming[0]).toMatchObject({ handle: august.handle });
      expect(receiver.outgoing).toHaveLength(0);
    });

    it("shows nothing of a friendship the user is not part of", async () => {
      const requestId = await pendingRequest();
      await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "ACCEPT",
      });

      expect(await friends.listSocialGraph(stranger.id)).toEqual({
        friends: [],
        incoming: [],
        outgoing: [],
      });
    });

    it("orders friends by name", async () => {
      for (const person of [anna, stranger]) {
        const sent = await friends.sendFriendRequest({
          userId: august.id,
          handle: person.handle,
        });
        if (sent.outcome !== "OK") throw new Error(sent.outcome);

        const { incoming } = await friends.listSocialGraph(person.id);
        await friends.respondToFriendRequest({
          userId: person.id,
          requestId: incoming[0].requestId,
          response: "ACCEPT",
        });
      }

      const { friends: list } = await friends.listSocialGraph(august.id);

      expect(list.map((entry) => entry.name)).toEqual(["Anna", "Stranger"]);
    });
  });

  describe("whether two users are friends", () => {
    it("is false while a request is only pending", async () => {
      await pendingRequest();

      expect(await friends.areFriends(august.id, anna.id)).toBe(false);
    });

    it("is true in both directions once accepted", async () => {
      const requestId = await pendingRequest();
      await friends.respondToFriendRequest({
        userId: anna.id,
        requestId,
        response: "ACCEPT",
      });

      expect(await friends.areFriends(august.id, anna.id)).toBe(true);
      expect(await friends.areFriends(anna.id, august.id)).toBe(true);
    });
  });

  it("refuses a self-friendship at the database level", async () => {
    // The check constraint, not the application: no code path should be able to write this row.
    await expect(
      db.insert(schema.friendship).values({
        requesterUserId: august.id,
        addresseeUserId: august.id,
      }),
    ).rejects.toThrow();
  });
});
