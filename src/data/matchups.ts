import type { BeyType } from "@/types/beyblade";
import matchupConfig from "@data/battles/matchups.json";

export interface MatchupModifier {
  /** Scales collision strength delivered to the target. */
  impact: number;
  /** Scales the push applied to the target. */
  knockback: number;
  /** Scales spin loss inflicted on the target. */
  spinDrain: number;
}

export type TypeMatchupTable = Record<BeyType, Record<BeyType, MatchupModifier>>;

export const typeMatchups = matchupConfig.modifiers as TypeMatchupTable;
export const matchupDescription = matchupConfig.description;
