import type { Beyblade } from "@/types/beyblade";
import { balanceScore, statPercent } from "@/utils/calculations";

interface Series {
  label: string;
  color: string;
  values: [number, number, number, number];
}

const AXES = ["Attack", "Stamina", "Balance", "Defense"] as const;

export function radarValues(bey: Beyblade): [number, number, number, number] {
  return [
    statPercent("attack", bey.stats.attack),
    statPercent("stamina", bey.stats.stamina),
    balanceScore(bey.stats),
    statPercent("defense", bey.stats.defense),
  ];
}

/** Four-axis radar (Attack top, Stamina right, Balance bottom, Defense left). */
export function RadarChart({ series, className }: { series: Series[]; className?: string }) {
  const size = 260;
  const c = size / 2;
  const R = size / 2 - 52;
  const point = (axis: number, value: number) => {
    const angle = -Math.PI / 2 + (axis * Math.PI) / 2;
    const r = (value / 100) * R;
    return [c + Math.cos(angle) * r, c + Math.sin(angle) * r] as const;
  };
  const summary = series.map((s) => `${s.label}: ${AXES.map((a, i) => `${a} ${Math.round(s.values[i])}`).join(", ")}`).join(". ");

  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full overflow-visible" role="img" aria-label={`Radar chart. ${summary}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon
            key={f}
            points={AXES.map((_, i) => point(i, f * 100).join(",")).join(" ")}
            fill="none"
            stroke="var(--border-strong)"
            strokeOpacity={f === 1 ? 0.9 : 0.45}
            strokeDasharray={f === 1 ? undefined : "3 4"}
          />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = point(i, 100);
          return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--border-strong)" strokeOpacity="0.5" />;
        })}
        {series.map((s) => (
          <polygon
            key={s.label}
            points={s.values.map((v, i) => point(i, Math.max(4, v)).join(",")).join(" ")}
            fill={s.color}
            fillOpacity="0.18"
            stroke={s.color}
            strokeWidth="2"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
          />
        ))}
        {AXES.map((a, i) => {
          const [x, y] = point(i, 128);
          return (
            <text
              key={a}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-[var(--fg-muted)] font-display text-[10px] font-semibold uppercase tracking-[0.14em]"
            >
              {a}
            </text>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-4 text-xs text-fg-muted">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
