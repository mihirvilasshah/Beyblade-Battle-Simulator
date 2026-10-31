import type { BattleResult } from "@/types/battle";

const MAJOR = new Set(["HEAVY_IMPACT", "XTREME_DASH", "COUNTER", "DIRECT_HIT", "BURST_FINISH", "KNOCKOUT_FINISH", "XTREME_FINISH", "SURVIVOR_FINISH"]);

/** Spin energy of both Beys over the battle, with markers for major events. */
export function SpinChart({ result, colors }: { result: BattleResult; colors: [string, string] }) {
  const W = 640;
  const H = 240;
  const pad = { l: 40, r: 12, t: 12, b: 28 };
  const frames = result.frames.filter((f) => f.t <= result.duration + 0.05);
  const end = Math.max(result.duration, 1);
  const x = (t: number) => pad.l + (t / end) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v) * (H - pad.t - pad.b);
  const step = Math.max(1, Math.floor(frames.length / 160));
  const sampled = frames.filter((_, i) => i % step === 0 || i === frames.length - 1);
  const line = (i: 0 | 1) => sampled.map((f, k) => `${k ? "L" : "M"}${x(f.t).toFixed(1)} ${y(f.beys[i].spin).toFixed(1)}`).join("");
  const ticks = Array.from({ length: 6 }, (_, i) => (end / 5) * i);
  const events = result.events.filter((e) => MAJOR.has(e.type));
  const describe = (i: 0 | 1) => `${result.names[i]} from ${Math.round(frames[0].beys[i].spin * 100)}% to ${Math.round(frames[frames.length - 1].beys[i].spin * 100)}%`;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Spin energy over ${end.toFixed(2)} seconds: ${describe(0)}; ${describe(1)}.`}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray={v === 0 ? undefined : "3 5"} />
            <text x={pad.l - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" className="fill-[var(--fg-subtle)] text-[10px] tabular-nums">
              {v * 100}%
            </text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="fill-[var(--fg-subtle)] text-[10px] tabular-nums">
            {t.toFixed(1)}s
          </text>
        ))}
        {events.map((e, i) => (
          <line key={i} x1={x(e.t)} x2={x(e.t)} y1={pad.t} y2={H - pad.b} stroke={e.type.endsWith("FINISH") ? "var(--hot)" : "var(--fg-subtle)"} strokeOpacity={e.type.endsWith("FINISH") ? 0.9 : 0.25} />
        ))}
        {([0, 1] as const).map((i) => (
          <g key={i}>
            <path d={`${line(i)}L${x(sampled[sampled.length - 1].t)} ${y(0)}L${x(0)} ${y(0)}Z`} fill={colors[i]} fillOpacity="0.08" />
            <path d={line(i)} fill="none" stroke={colors[i]} strokeWidth="2.5" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${colors[i]})` }} />
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-fg-muted">
        {([0, 1] as const).map((i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded" style={{ background: colors[i] }} />
            {result.names[i]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-px bg-[var(--hot)]" /> Finish
        </span>
      </figcaption>
    </figure>
  );
}
