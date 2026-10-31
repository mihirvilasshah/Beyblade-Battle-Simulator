import type { Beyblade, StatKey } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { statPercent } from "@/utils/calculations";
import { TYPE_LABELS } from "@/utils/formatting";
import { typeMatchups } from "@/data/matchups";
import { RadarChart, radarValues } from "@/components/charts/RadarChart";
import { TypeBadge } from "@/components/ui/Badges";
import { Info } from "lucide-react";

export const SIDE_COLORS = ["var(--accent)", "var(--hot)"] as const;

const ROWS: { key: StatKey; label: string; format?: (v: number) => string }[] = [
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "stamina", label: "Stamina" },
  { key: "weight", label: "Weight", format: (v) => `${v.toFixed(1)}g` },
  { key: "dash", label: "Dash" },
  { key: "burstResistance", label: "Burst Res." },
];

function pct(value: number) {
  const delta = Math.round((value - 1) * 100);
  return delta === 0 ? "neutral" : `${delta > 0 ? "+" : ""}${delta}%`;
}

export function ComparisonPanel({ beys, className }: { beys: [Beyblade, Beyblade]; className?: string }) {
  const [a, b] = beys;
  const ab = typeMatchups[a.type][b.type];
  const ba = typeMatchups[b.type][a.type];

  return (
    <section aria-labelledby="comparison-title" className={cn("panel overflow-hidden p-5 sm:p-7", className)}>
      <div className="text-center">
        <p className="eyebrow">Head to head</p>
        <h2 id="comparison-title" className="mt-1 font-display text-xl font-bold uppercase tracking-[0.14em] sm:text-2xl">
          Battle Comparison
        </h2>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 pb-3">
            <div className="min-w-0 text-right">
              <p className="truncate font-display text-sm font-bold uppercase tracking-[0.1em] sm:text-base" style={{ color: SIDE_COLORS[0] }}>
                {a.name}
              </p>
              <TypeBadge type={a.type} className="mt-1" />
            </div>
            <span className="pb-1 font-display text-xs font-bold tracking-[0.2em] text-fg-subtle">VS</span>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold uppercase tracking-[0.1em] sm:text-base" style={{ color: SIDE_COLORS[1] }}>
                {b.name}
              </p>
              <TypeBadge type={b.type} className="mt-1" />
            </div>
          </div>
          <table className="w-full border-separate border-spacing-y-2">
            <caption className="sr-only">
              Stat comparison between {a.fullName} and {b.fullName}
            </caption>
            <thead className="sr-only">
              <tr>
                <th scope="col">{a.name}</th>
                <th scope="col">Stat</th>
                <th scope="col">{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, idx) => {
                const va = a.stats[row.key];
                const vb = b.stats[row.key];
                const fmt = row.format ?? ((v: number) => String(v));
                const estA = a.estimated.includes(row.key);
                const estB = b.estimated.includes(row.key);
                return (
                  <tr key={row.key}>
                    <td className="w-[42%]">
                      <div className="flex items-center justify-end gap-2">
                        <span className={cn("font-display text-sm font-bold tabular-nums", va > vb ? "text-fg" : "text-fg-muted")}>
                          {estA && "≈"}
                          {fmt(va)}
                        </span>
                        <div className="h-2.5 w-full max-w-[180px] overflow-hidden rounded-full bg-surface-3" aria-hidden>
                          <div
                            className="stat-fill relative ml-auto h-full origin-right overflow-hidden rounded-full"
                            style={{ width: `${statPercent(row.key, va)}%`, background: SIDE_COLORS[0], opacity: va >= vb ? 1 : 0.55, animationDelay: `${idx * 70}ms` }}
                          />
                        </div>
                      </div>
                    </td>
                    <th scope="row" className="px-2 text-center font-display text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-fg-muted sm:px-4 sm:text-[0.68rem]">
                      {row.label}
                    </th>
                    <td className="w-[42%]">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-full max-w-[180px] overflow-hidden rounded-full bg-surface-3" aria-hidden>
                          <div
                            className="stat-fill relative h-full overflow-hidden rounded-full"
                            style={{ width: `${statPercent(row.key, vb)}%`, background: SIDE_COLORS[1], opacity: vb >= va ? 1 : 0.55, animationDelay: `${idx * 70}ms` }}
                          />
                        </div>
                        <span className={cn("font-display text-sm font-bold tabular-nums", vb > va ? "text-fg" : "text-fg-muted")}>
                          {estB && "≈"}
                          {fmt(vb)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <RadarChart
          className="mx-auto w-full max-w-[300px]"
          series={[
            { label: a.name, color: SIDE_COLORS[0], values: radarValues(a) },
            { label: b.name, color: SIDE_COLORS[1], values: radarValues(b) },
          ]}
        />
      </div>

      <div className="mt-6 grid gap-3 border-t border-border pt-5 text-sm text-fg-muted sm:grid-cols-2">
        <p>
          <span className="font-semibold text-fg">Type matchup · </span>
          {TYPE_LABELS[a.type]} → {TYPE_LABELS[b.type]}: impact {pct(ab.impact)}, knockback {pct(ab.knockback)}, spin drain {pct(ab.spinDrain)}.{" "}
          {TYPE_LABELS[b.type]} → {TYPE_LABELS[a.type]}: impact {pct(ba.impact)}, knockback {pct(ba.knockback)}, spin drain {pct(ba.spinDrain)}.
        </p>
        <p className="flex gap-2">
          <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          <span>
            Stats describe tendencies — they don&apos;t decide the winner. Launch power, tilt, position, collisions, Xtreme Dashes and
            controlled randomness all shape every simulated battle.
          </span>
        </p>
      </div>
    </section>
  );
}
