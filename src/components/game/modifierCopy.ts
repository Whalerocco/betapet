import type { ModifierId } from "../../game/model/modifiers";

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
