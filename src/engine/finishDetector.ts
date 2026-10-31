import type { BeyIndex, FinishType } from "@/types/battle";
import { SIM_CONFIG } from "./config";
import type { BeyParams, BeyState, WallContact } from "./physics";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Chance a hit turns the target's ratchet one click toward bursting. */
export function calculateBurstProbability(strength: number, params: BeyParams, state: BeyState) {
  const { minStrength } = SIM_CONFIG.burst;
  if (strength < minStrength) return 0;
  return Math.min(0.6, (strength - minStrength) * (1.15 - params.burstResistance) * (1.35 - state.spin) * 0.6);
}

/** Chance a Bey hitting the wall inside a pocket window clears the lip and leaves the stadium. */
export function calculateKnockoutProbability(contact: WallContact, params: BeyParams) {
  if (!contact.pocket) return 0;
  const lip = SIM_CONFIG.stadium.pocketLip * (0.9 + params.mass * 0.1 + params.defense * 0.12);
  return clamp01((contact.outwardSpeed - lip) / (lip * 0.5));
}

export interface FinishDecision {
  loser: BeyIndex;
  finishType: FinishType;
}

/** Spin-based finish: the first Bey to stop spinning loses. */
export function determineFinish(states: [BeyState, BeyState]): FinishDecision | null {
  const [a, b] = states;
  const aStopped = a.spin <= SIM_CONFIG.spin.stopThreshold;
  const bStopped = b.spin <= SIM_CONFIG.spin.stopThreshold;
  if (!aStopped && !bStopped) return null;
  if (aStopped && bStopped) return { loser: a.spin <= b.spin ? 0 : 1, finishType: "SURVIVOR" };
  return { loser: aStopped ? 0 : 1, finishType: "SURVIVOR" };
}
