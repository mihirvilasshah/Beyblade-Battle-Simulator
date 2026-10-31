import { repository } from "../src/data/repository";
import { simulateBattle } from "../src/engine/battleEngine";

async function main() {
  const beys = await repository.listBeyblades();
  const a = beys.find((b) => b.id === process.argv[2])!;
  const b = beys.find((b) => b.id === process.argv[3])!;
  const n = Number(process.argv[4] ?? 200);
  const finishes: Record<string, number> = {};
  let wins = 0, col = 0, dur = 0, heavy = 0, dashes = 0, self = 0;
  let survivorDur = 0, survivorCol = 0, survivors = 0;
  const colHist: number[] = [];
  for (let k = 0; k < n; k++) {
    const r = simulateBattle({ beys: [a, b], seed: `pair-${k}` });
    const key = `${r.finishType}:${r.names[r.winnerIndex]}`;
    finishes[key] = (finishes[key] ?? 0) + 1;
    if (r.winnerIndex === 0) wins++;
    col += r.statistics.collisions;
    colHist.push(r.statistics.collisions);
    dur += r.duration;
    heavy += r.statistics.heavyHits;
    dashes += r.statistics.xtremeDashes;
    if (r.selfKnockout) self++;
    if (r.finishType === "SURVIVOR") {
      survivorDur += r.duration;
      survivorCol += r.statistics.collisions;
      survivors++;
    }
  }
  console.log(`survivor finishes: avg ${(survivorDur / survivors).toFixed(1)}s, ${(survivorCol / survivors).toFixed(1)} collisions`);
  console.log(`${a.name} win ${(wins / n * 100).toFixed(1)}% | avg dur ${(dur / n).toFixed(1)}s | col ${(col / n).toFixed(1)} | heavy ${(heavy / n).toFixed(1)} | dashes ${(dashes / n).toFixed(1)} | selfKO ${self}`);
  console.log(finishes);
  colHist.sort((x, y) => x - y);
  console.log("collisions p10/p50/p90", colHist[Math.floor(n * 0.1)], colHist[Math.floor(n * 0.5)], colHist[Math.floor(n * 0.9)]);
}
main();
