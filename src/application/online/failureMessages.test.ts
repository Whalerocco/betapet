import { describe, expect, it } from "vitest";

import { describeAuthFailure, describeFailure } from "./failureMessages";

/**
 * The wording layer (`architecture.md` section 25). These are worth testing for one reason: a
 * message that confidently names the wrong cause sends somebody looking for a problem they do not
 * have, which is exactly what happened when every sign-up failure claimed the email or handle was
 * taken (`known-bugs.md`).
 */

describe("describeAuthFailure", () => {
  it("names a handle that breaks the rules, and gives the rules", () => {
    expect(describeAuthFailure("SIGN_UP", "INVALID_HANDLE")).toContain("3-20");
  });

  it("does not blame a taken email when a field was missing", () => {
    const message = describeAuthFailure("SIGN_UP", "MISSING_FIELD");

    expect(message).toContain("Ladda om sidan");
    expect(message).not.toContain("E-post");
  });

  it("distinguishes a taken email from a taken handle", () => {
    expect(describeAuthFailure("SIGN_UP", "USER_ALREADY_EXISTS")).toBe(
      "E-postadressen har redan ett konto.",
    );
    // The write was refused, and the handle is the only other unique column a caller can collide
    // with, so it is reported as the likely cause rather than as an unexplained failure.
    expect(describeAuthFailure("SIGN_UP", "FAILED_TO_CREATE_USER")).toContain(
      "Vänkoden",
    );
  });

  it("reports a password the server refused as a password problem", () => {
    expect(describeAuthFailure("SIGN_UP", "PASSWORD_TOO_SHORT")).toContain(
      "8 tecken",
    );
  });

  it("claims no cause at all for a code it does not know", () => {
    const signUp = describeAuthFailure("SIGN_UP", "SOMETHING_NEW");
    const signIn = describeAuthFailure("SIGN_IN", undefined);

    expect(signUp).toBe("Kontot kunde inte skapas. Försök igen.");
    expect(signIn).toBe("Det gick inte att logga in. Försök igen.");
    for (const message of [signUp, signIn]) {
      expect(message).not.toContain("tagen");
      expect(message).not.toContain("redan");
    }
  });

  it("still says the plain thing when credentials are wrong", () => {
    expect(describeAuthFailure("SIGN_IN", "INVALID_EMAIL_OR_PASSWORD")).toBe(
      "Fel e-post eller lösenord.",
    );
  });
});

describe("describeFailure", () => {
  it("explains a stale revision as the opponent having been quicker", () => {
    expect(
      describeFailure({ error: "STALE_REVISION", currentRevision: 7 }),
    ).toContain("Motståndaren hann före");
  });

  it("has wording for every friends failure", () => {
    const failures = [
      "USER_NOT_FOUND",
      "CANNOT_FRIEND_SELF",
      "ALREADY_FRIENDS",
      "ALREADY_REQUESTED",
    ] as const;

    for (const error of failures) {
      expect(describeFailure({ error })).not.toBe("");
    }
  });
});
