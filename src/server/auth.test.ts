import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * These tests are about the shape of the authentication setup, not about talking to a database.
 * They run in the `server` project's Node environment, so a stray browser dependency in server
 * code fails here rather than in production (`vitest.config.mts`).
 *
 * Nothing here issues a query, so no database is needed — which is itself one of the things
 * being asserted.
 */

/*
 * Both modules memoize on `globalThis` so that `next dev`'s hot reloads reuse one instance. That
 * memo outlives `vi.resetModules()`, so a test would otherwise inherit whatever an earlier one
 * built.
 */
const globalMemos = globalThis as typeof globalThis & {
  betapetDb?: unknown;
  betapetAuth?: unknown;
};

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  delete globalMemos.betapetDb;
  delete globalMemos.betapetAuth;
});

async function configuredAuth() {
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://user:password@example.invalid/betapet",
  );
  const { getAuth } = await import("./auth");
  return getAuth();
}

describe("authentication configuration", () => {
  it("offers email and password sign-in", async () => {
    const auth = await configuredAuth();

    expect(auth.options.emailAndPassword?.enabled).toBe(true);
  });

  it("does not require email verification while no mail can be sent", async () => {
    const auth = await configuredAuth();

    // Requiring verification without a configured sender would lock every new account out.
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(false);
  });

  it("stores credentials through the database adapter rather than in memory", async () => {
    const auth = await configuredAuth();

    expect(auth.options.database).toBeDefined();
  });

  it("exposes the endpoints the online phase needs", async () => {
    const auth = await configuredAuth();

    expect(auth.api.signUpEmail).toBeTypeOf("function");
    expect(auth.api.signInEmail).toBeTypeOf("function");
    expect(auth.api.getSession).toBeTypeOf("function");
    expect(auth.api.signOut).toBeTypeOf("function");
  });

  it("reuses one instance rather than rebuilding it per call", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://user:password@example.invalid/betapet",
    );
    const { getAuth } = await import("./auth");

    expect(getAuth()).toBe(getAuth());
  });
});

describe("the mounted route", () => {
  it("serves Better Auth over GET and POST", async () => {
    const route = await import("@/app/api/auth/[...all]/route");

    expect(route.GET).toBeTypeOf("function");
    expect(route.POST).toBeTypeOf("function");
  });

  /*
   * `next build` evaluates every route module while collecting page data. If importing this one
   * reached the database, no build could succeed without a configured database — including the
   * hot-seat `playtest` build, which needs none.
   */
  it("can be imported with no database configured", async () => {
    vi.stubEnv("DATABASE_URL", undefined);

    await expect(
      import("@/app/api/auth/[...all]/route"),
    ).resolves.toBeDefined();
  });
});

describe("a missing connection string", () => {
  it("is reported where the database is first used, and says what to do", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const { db } = await import("./db/client");

    expect(() => db.select()).toThrowError(/DATABASE_URL is not set/);
  });
});
