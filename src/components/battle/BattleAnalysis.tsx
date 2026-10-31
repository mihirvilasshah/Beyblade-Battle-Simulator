import type { BattleResult } from "@/types/battle";
import { FINISH_LABELS, formatClock, formatPercent, formatSeconds } from "@/utils/formatting";
import { SpinChart } from "@/components/charts/SpinChart";
import { CALLOUTS } from "./BattleOverlays";

const TIMELINE_TYPES = new Set(["LAUNCH", "FIRST_CONTACT", "COLLISION", "DIRECT_HIT", "HEAVY_IMPACT", "XTREME_DASH", "COUNTER", "BURST_FINISH", "KNOCKOUT_FINISH", "XTREME_FINISH", "SURVIVOR_FINISH"]);

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/60 p-3">
      <dt className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-fg-muted">{label}</dt>
      <dd className="mt-1 font-display text-xl font-bold tabular-nums text-fg">{value}</dd>
    </div>
  );
}

export function BattleAnalysis({ result, colors }: { result: BattleResult; colors: [string, string] }) {
  const s = result.statistics;
  const timeline = result.events.filter((e) => TIMELINE_TYPES.has(e.type));
  const spinLoss = s.perBey[0].spinLoss + s.perBey[1].spinLoss;

  return (
    <section id="analysis" aria-labelledby="analysis-title" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Post-battle</p>
          <h2 id="analysis-title" className="font-display text-2xl font-bold uppercase tracking-[0.08em]">
            Battle Analysis
          </h2>
        </div>
        <p className="rounded-md border border-border px-2 py-1 font-mono text-xs text-fg-muted">seed: {result.seed}</p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="panel p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fg-muted">Battle Timeline</h3>
          <ol className="mt-4 max-h-[340px] space-y-1 overflow-y-auto pr-1">
            {timeline.map((e, i) => {
              const cfg = CALLOUTS[e.type];
              const actor = e.actor !== undefined ? result.names[e.actor] : null;
              return (
                <li key={i} className="grid grid-cols-[3.5rem_1fr] items-baseline gap-3 rounded-lg px-2 py-1.5 odd:bg-surface-2/50">
                  <span className="font-mono text-xs tabular-nums text-fg-subtle">{formatClock(e.t)}</span>
                  <span className="text-sm">
                    <span className={e.type === "COLLISION" ? "text-fg-muted" : "font-semibold"} style={{ color: cfg?.color }}>
                      {e.label}
                    </span>
                    {actor && e.type !== "LAUNCH" && (
                      <span className="text-fg-muted">
                        {" "}
                        · <span style={{ color: colors[e.actor!] }}>{actor}</span>
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="panel p-5">
          <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fg-muted">Spin Energy</h3>
          <div className="mt-4">
            <SpinChart result={result} colors={colors} />
          </div>
        </div>
      </div>

      <div className="panel mt-6 p-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-fg-muted">Battle Statistics</h3>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Duration" value={formatSeconds(result.duration)} />
          <Stat label="Finish" value={FINISH_LABELS[result.finishType].replace(" Finish", "")} />
          <Stat label="Collisions" value={s.collisions} />
          <Stat label="Heavy hits" value={s.heavyHits} />
          <Stat label="Direct hits" value={s.directHits} />
          <Stat label="Xtreme Dashes" value={s.xtremeDashes} />
          <Stat label="Counters" value={s.counters} />
          <Stat label="Burst attempts" value={s.burstAttempts} />
          <Stat label="Burst events" value={s.burstEvents} />
          <Stat label="Knockouts" value={s.knockoutEvents} />
          <Stat label="Total spin loss" value={formatPercent(spinLoss / 2)} />
          <Stat label="Self KO" value={result.selfKnockout ? "Yes" : "No"} />
        </dl>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">Per-Beyblade statistics</caption>
            <thead>
              <tr className="border-b border-border text-left font-display text-[0.62rem] uppercase tracking-[0.16em] text-fg-muted">
                <th scope="col" className="py-2 pr-3">Beyblade</th>
                <th scope="col" className="py-2 pr-3">Launch</th>
                <th scope="col" className="py-2 pr-3">Hits landed</th>
                <th scope="col" className="py-2 pr-3">Dashes</th>
                <th scope="col" className="py-2 pr-3">Counters</th>
                <th scope="col" className="py-2 pr-3">Ratchet clicks</th>
                <th scope="col" className="py-2 pr-3">Max momentum</th>
                <th scope="col" className="py-2 pr-3">Spin loss</th>
                <th scope="col" className="py-2">Final spin</th>
              </tr>
            </thead>
            <tbody>
              {([0, 1] as const).map((i) => {
                const b = s.perBey[i];
                const l = result.launch[i];
                return (
                  <tr key={i} className="border-b border-border/60 tabular-nums last:border-0">
                    <th scope="row" className="py-2.5 pr-3 text-left font-display font-bold uppercase tracking-[0.06em]" style={{ color: colors[i] }}>
                      {result.names[i]}
                      {result.winnerIndex === i && <span className="ml-2 rounded bg-surface-3 px-1.5 py-0.5 text-[0.6rem] text-fg">WIN</span>}
                    </th>
                    <td className="py-2.5 pr-3 text-fg-muted">
                      {formatPercent(l.power)} · {l.angle > 0 ? "+" : ""}
                      {l.angle.toFixed(1)}°
                    </td>
                    <td className="py-2.5 pr-3">{b.hitsLanded}</td>
                    <td className="py-2.5 pr-3">{b.xtremeDashes}</td>
                    <td className="py-2.5 pr-3">{b.counters}</td>
                    <td className="py-2.5 pr-3">{b.ratchetClicks}</td>
                    <td className="py-2.5 pr-3">{formatPercent(b.maxMomentum)}</td>
                    <td className="py-2.5 pr-3">{formatPercent(b.spinLoss)}</td>
                    <td className="py-2.5">{formatPercent(b.finalSpin)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-fg-subtle">
          Simulated result from a physics-inspired model — an entertainment and analysis tool, not a prediction of a real-world match.
        </p>
      </div>
    </section>
  );
}
