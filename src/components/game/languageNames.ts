import type { LanguageCode } from "../../game/model/language";

/**
 * Swedish display names for each supported language. Kept here rather than in the engine, per
 * CLAUDE.md's rule that presentation strings stay out of the game layer. Shared between
 * GameSetup.tsx (the language pickers) and the in-game active-language indicator
 * (ScoreBoard.tsx via GameScreen.tsx), so the two never drift out of sync.
 */
export const LANGUAGE_NAMES: Readonly<Record<LanguageCode, string>> = {
  sv: "Svenska",
  de: "Tyska",
  fr: "Franska",
  en: "Engelska",
  es: "Spanska",
};
