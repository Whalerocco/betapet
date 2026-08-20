import type { WordClassificationRules } from "../../game/dictionary/classifyWord";
import type { LanguageCode } from "../../game/model/language";

/**
 * Resolves one language's classification rules via a dynamic `import()`, so that Next.js/webpack
 * code-splits each language's dictionary (multi-MB JSON, see docs/decisions.md DEC-011) into its
 * own chunk, fetched only when a game actually selects Polyglot or Wild mode with that language
 * — rather than every player's bundle eagerly including all five languages' dictionaries
 * (~39 MB combined) regardless of whether they're ever used. The base/UI language ("sv") stays
 * eagerly loaded elsewhere (src/app/page.tsx), since every game needs it.
 */
export async function loadLanguageClassificationRules(
  code: LanguageCode,
): Promise<WordClassificationRules> {
  switch (code) {
    case "sv": {
      const { createSwedishWordClassificationRules } = await import(
        "../../game/dictionary/swedishWordClassificationRules"
      );
      return createSwedishWordClassificationRules();
    }
    case "de": {
      const { createGermanWordClassificationRules } = await import(
        "../../game/dictionary/germanWordClassificationRules"
      );
      return createGermanWordClassificationRules();
    }
    case "fr": {
      const { createFrenchWordClassificationRules } = await import(
        "../../game/dictionary/frenchWordClassificationRules"
      );
      return createFrenchWordClassificationRules();
    }
    case "en": {
      const { createEnglishWordClassificationRules } = await import(
        "../../game/dictionary/englishWordClassificationRules"
      );
      return createEnglishWordClassificationRules();
    }
    case "es": {
      const { createSpanishWordClassificationRules } = await import(
        "../../game/dictionary/spanishWordClassificationRules"
      );
      return createSpanishWordClassificationRules();
    }
  }
}

/** Resolves every code's rules in parallel, preserving order (Wild mode needs order preserved). */
export async function loadLanguageClassificationRulesFor(
  codes: readonly LanguageCode[],
): Promise<readonly WordClassificationRules[]> {
  return Promise.all(codes.map(loadLanguageClassificationRules));
}
