import type { WordClassificationRules } from "./classifyWord";
import { ALLOWED_ABBREVIATIONS_DE } from "./allowedAbbreviationsDe";
import { ALLOWED_COUNTRIES_DE } from "./allowedCountriesDe";
import { ALLOWED_MONTHS_DE } from "./allowedMonthsDe";
import { ALLOWED_WEEKDAYS_DE } from "./allowedWeekdaysDe";
import { createGermanDictionary } from "./germanDictionary";

/**
 * Unlike Swedish, the German source carries no part-of-speech tagging to derive
 * proper-noun/abbreviation exclusions from (SOURCE-de.md) — the source's own curation policy
 * already excludes those categories, so both sets start empty here, the same starting point
 * allowedAbbreviations.ts already used for Swedish's manual exceptions.
 */
export function createGermanWordClassificationRules(): WordClassificationRules {
  return {
    dictionary: createGermanDictionary(),
    properNounOnly: new Set(),
    abbreviationOnly: new Set(),
    allowedCountries: ALLOWED_COUNTRIES_DE,
    allowedMonths: ALLOWED_MONTHS_DE,
    allowedWeekdays: ALLOWED_WEEKDAYS_DE,
    allowedAbbreviations: ALLOWED_ABBREVIATIONS_DE,
  };
}
