import type { WordClassificationRules } from "./classifyWord";
import { ALLOWED_ABBREVIATIONS_FR } from "./allowedAbbreviationsFr";
import { ALLOWED_COUNTRIES_FR } from "./allowedCountriesFr";
import { ALLOWED_MONTHS_FR } from "./allowedMonthsFr";
import { ALLOWED_WEEKDAYS_FR } from "./allowedWeekdaysFr";
import { createFrenchDictionary } from "./frenchDictionary";

/**
 * Like German, the French source carries no part-of-speech tagging to derive
 * proper-noun/abbreviation exclusions from (SOURCE-fr.md) — Lexique383 is a common-vocabulary
 * lexicon with no proper-noun category at all, so both sets start empty here.
 */
export function createFrenchWordClassificationRules(): WordClassificationRules {
  return {
    dictionary: createFrenchDictionary(),
    properNounOnly: new Set(),
    abbreviationOnly: new Set(),
    allowedCountries: ALLOWED_COUNTRIES_FR,
    allowedMonths: ALLOWED_MONTHS_FR,
    allowedWeekdays: ALLOWED_WEEKDAYS_FR,
    allowedAbbreviations: ALLOWED_ABBREVIATIONS_FR,
  };
}
