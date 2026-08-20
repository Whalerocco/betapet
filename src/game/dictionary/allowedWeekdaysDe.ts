/**
 * German equivalent of allowedWeekdays.ts: weekdays are explicitly allowed (dictionary.md
 * section 14). Includes both "SAMSTAG" and "SONNABEND" for Saturday — both are standard,
 * regionally common German terms for the same day, not a translation error.
 */
export const ALLOWED_WEEKDAYS_DE: ReadonlySet<string> = new Set([
  "MONTAG",
  "DIENSTAG",
  "MITTWOCH",
  "DONNERSTAG",
  "FREITAG",
  "SAMSTAG",
  "SONNABEND",
  "SONNTAG",
]);
