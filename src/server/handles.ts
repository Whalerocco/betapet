/**
 * The handle: how one player names another (DEC-027).
 *
 * `online-multiplayer.md` section 10 keeps the profile to what is needed to find friends and
 * identify opponents, and T28.1 asks that finding somebody not expose personal data. A handle is
 * what satisfies both: it is chosen by its owner, shared deliberately, and carries nothing the
 * owner did not decide to publish — where searching by email would require knowing a private
 * address, and searching by display name would publish the whole user list.
 *
 * The rules exist to make a handle sayable and typable by *another person*, who has heard it
 * aloud or read it in a message:
 *
 * - lowercase only, so it can never be typed wrongly by case;
 * - ASCII letters, digits and underscore, so no keyboard layout can fail to produce it — å, ä
 *   and ö are excluded for that reason, and no other;
 * - a letter first, so a handle can never be mistaken for a numeric id;
 * - 3 to 20 characters.
 *
 * These are string rules, not database rules, and nothing here queries anything: uniqueness is
 * the database's job (a unique index), because only it can decide a race between two people
 * claiming the same handle at once.
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;

const HANDLE_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

/**
 * Puts a handle a person typed into its canonical form, so that `@Anna`, `anna ` and `anna` are
 * one handle rather than three.
 *
 * This does not validate: an unusable handle normalizes to an unusable handle, which
 * `isValidHandle` then rejects. Keeping the two apart means a caller can normalize input before
 * comparing it without having to decide what to do about a bad value at the same time.
 */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function isValidHandle(candidate: string): boolean {
  return HANDLE_PATTERN.test(candidate);
}

/** A normalized handle that is also valid, or `undefined`. */
export function parseHandle(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const normalized = normalizeHandle(raw);
  return isValidHandle(normalized) ? normalized : undefined;
}
