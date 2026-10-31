import type { BattleResult, EngineBey } from "@/types/battle";
import { simulateBattle } from "./battleEngine";

/**
 * Knockout-bracket helper (groundwork for a future Tournament mode — no UI yet).
 * Each match is an ordinary seeded battle, so whole tournaments are replayable.
 */
export interface TournamentRound {
  matches: { beys: [EngineBey, EngineBey]; result: BattleResult }[];
}

export function simulateTournament(entrants: EngineBey[], seed: string): { rounds: TournamentRound[]; champion: EngineBey } {
  const size = entrants.length;
  if (size < 2 || (size & (size - 1)) !== 0) throw new Error("Tournament size must be a power of two (4, 8, 16…)");
  const rounds: TournamentRound[] = [];
  let alive = entrants;
  while (alive.length > 1) {
    const round: TournamentRound = { matches: [] };
    const next: EngineBey[] = [];
    for (let i = 0; i < alive.length; i += 2) {
      const beys: [EngineBey, EngineBey] = [alive[i], alive[i + 1]];
      const result = simulateBattle({ beys, seed: `${seed}:r${rounds.length}:m${i / 2}` });
      round.matches.push({ beys, result });
      next.push(beys[result.winnerIndex]);
    }
    rounds.push(round);
    alive = next;
  }
  return { rounds, champion: alive[0] };
}
