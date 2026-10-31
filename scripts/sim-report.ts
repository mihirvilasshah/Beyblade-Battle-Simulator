/**
 * Batch-runs the simulation to inspect outcome balance while tuning engine constants or matchups.
 * Usage: npm run sim:report [-- battlesPerPair]
 */
import { repository } from "../src/data/repository";
import { simulateBattle } from "../src/engine/battleEngine";
import type { FinishType } from "../src/types/battle";

async function main() {
  const perPair = Number(process.argv[2] ?? 20);
  const beys = await repository.listBeyblades();
  const finishes: Record<FinishType, number> = { SURVIVOR: 0, KNOCKOUT: 0, BURST: 0, XTREME: 0 };
  const typeWins: Record<string, { wins: number; games: number }> = {};
  const beyWins = new Map<string, { wins: number; games: number }>();
  let totalDuration = 0;
  let collisions = 0;
  let dashes = 0;
  let heavy = 0;
  let selfKo = 0;
  let games = 0;
  const start = performance.now();

  for (let i = 0; i < beys.length; i++) {
    for (let j = i + 1; j < beys.length; j++) {
      for (let k = 0; k < perPair; k++) {
        const r = simulateBattle({ beys: [beys[i], beys[j]], seed: `report-${k}` });
        games += 1;
        finishes[r.finishType] += 1;
        totalDuration += r.duration;
        collisions += r.statistics.collisions;
        dashes += r.statistics.xtremeDashes;
        heavy += r.statistics.heavyHits;
        if (r.selfKnockout) selfKo += 1;
        const pair = [beys[i], beys[j]];
        pair.forEach((b, idx) => {
          const key = b.type === pair[1 - idx].type ? null : `${b.type}>${pair[1 - idx].type}`;
          if (key) {
            typeWins[key] ??= { wins: 0, games: 0 };
            typeWins[key].games += 1;
            if (r.winnerIndex === idx) typeWins[key].wins += 1;
          }
          const w = beyWins.get(b.id) ?? { wins: 0, games: 0 };
          w.games += 1;
          if (r.winnerIndex === idx) w.wins += 1;
          beyWins.set(b.id, w);
        });
      }
    }
  }

  const pct = (n: number) => `${((n / games) * 100).toFixed(1)}%`;
  console.log(`${games} battles in ${((performance.now() - start) / 1000).toFixed(1)}s`);
  console.log("Finishes:", Object.fromEntries(Object.entries(finishes).map(([k, v]) => [k, pct(v)])), "self-KO", pct(selfKo));
  console.log(
    `Avg duration ${(totalDuration / games).toFixed(2)}s | collisions ${(collisions / games).toFixed(1)} | dashes ${(dashes / games).toFixed(1)} | heavy ${(heavy / games).toFixed(1)}`,
  );
  console.log("Type win rates:");
  for (const [k, v] of Object.entries(typeWins).sort()) console.log(`  ${k.padEnd(18)} ${((v.wins / v.games) * 100).toFixed(1)}%`);
  const ranked = [...beyWins.entries()].sort((a, b) => b[1].wins / b[1].games - a[1].wins / a[1].games);
  console.log("Top 5:", ranked.slice(0, 5).map(([id, w]) => `${id} ${((w.wins / w.games) * 100).toFixed(0)}%`).join(", "));
  console.log("Bottom 5:", ranked.slice(-5).map(([id, w]) => `${id} ${((w.wins / w.games) * 100).toFixed(0)}%`).join(", "));
}

main();
