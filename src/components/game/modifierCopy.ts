import type { LanguageCode } from "../../game/model/language";
import type { ModifierId } from "../../game/model/modifiers";

import { LANGUAGE_NAMES } from "./languageNames";

/**
 * Swedish setup/display copy for each modifier (game-modifiers.md section 4). Kept here rather
 * than in the engine, per CLAUDE.md's rule that presentation strings stay out of the game layer.
 * Shared between GameSetup.tsx (choosing modifiers) and the in-game active-modifiers indicator
 * (ScoreBoard.tsx via GameScreen.tsx), so the two never drift out of sync.
 */
export const MODIFIER_COPY: Readonly<
  Record<ModifierId, { readonly label: string; readonly description: string }>
> = {
  CRISSCROSS: {
    label: "Kryssläge",
    description:
      "Tillåter att en drags nya brickor bildar ett sammanhängande mönster i flera riktningar, till exempel ett T eller ett plustecken, inte bara en rak linje.",
  },
  REPLACE: {
    label: "Ersättningsläge",
    description:
      "Tillåter att en ny bricka läggs ovanpå en redan spelad bricka. Den bortplockade brickan går till den spelande spelarens brickhållare.",
  },
  ILLEGAL: {
    label: "Olagligt läge",
    description:
      "Bara ord som inte finns i ordlistan får spelas. Motståndaren måste fortfarande godkänna varje drag.",
  },
  POLYGLOT: {
    label: "Flerspråksläge",
    description:
      "Ett ord godkänns om det finns i ordlistan för något av de valda språken. Svenska ingår alltid — välj minst ett språk till.",
  },
  WILD: {
    label: "Roterande språkläge",
    description:
      "Vilket språks ordlista som gäller växlar till nästa valda språk efter varje fullständig runda (båda spelarna har spelat en gång). Svenska ingår alltid — välj minst ett språk till.",
  },
};

/** The rules a match is played by, as the match API carries them. */
export interface MatchRulesSummaryInput {
  readonly rackSize: number;
  readonly modifiers: readonly string[];
  readonly polyglotLanguages?: readonly string[];
  readonly wildLanguages?: readonly string[];
}

/**
 * One line describing a match's rules, for an invitation that has to be understood before it is
 * answered (T28.4, DEC-029).
 *
 * Polyglot and Wild name their languages, because which languages are in play is the rule, not a
 * detail of it. An unknown modifier id is shown as itself rather than dropped: a match created by
 * a newer version should not look like an ordinary game.
 */
export function describeMatchRules(rules: MatchRulesSummaryInput): string {
  const parts = [`${rules.rackSize} brickor`];

  for (const id of rules.modifiers) {
    const label = MODIFIER_COPY[id as ModifierId]?.label ?? id;
    const languages =
      id === "POLYGLOT"
        ? rules.polyglotLanguages
        : id === "WILD"
          ? rules.wildLanguages
          : undefined;

    parts.push(
      languages && languages.length > 0
        ? `${label} (${languages
            .map((code) => LANGUAGE_NAMES[code as LanguageCode] ?? code)
            .join(", ")})`
        : label,
    );
  }

  return parts.length === 1
    ? `${parts[0]} · Standardregler`
    : parts.join(" · ");
}
