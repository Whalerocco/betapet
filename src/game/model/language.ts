/**
 * Languages with dictionary/classification-rules support (DEC-010/DEC-011), used to select
 * which languages a Polyglot or Wild mode game validates words against
 * (game-modifiers.md sections 9-10). This is deliberately narrower than a full
 * `LanguageDefinition` (content-model.md section 9) — no board/tile-set/UI-translation data is
 * modeled here, since DEC-010 scoped this slice to dictionaries only. `GameConfiguration.language`
 * remains the single base/UI language field, unaffected by this type.
 */
export type LanguageCode = "sv" | "de" | "fr" | "en" | "es";

export const ALL_LANGUAGE_CODES: readonly LanguageCode[] = [
  "sv",
  "de",
  "fr",
  "en",
  "es",
];
