import { memo } from "react";
import type { Beyblade } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { TypeBadge } from "@/components/ui/Badges";
import { BeyImage } from "@/components/beyblade/BeyImage";

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-fg-muted">{label}</span>
        <span className="font-display text-sm font-bold tabular-nums text-fg">{pct}%</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-1 grid h-2.5 grid-cols-10 gap-[3px]"
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className="rounded-[2px] transition-colors duration-150"
            style={{ background: i < Math.round(pct / 10) ? color : "var(--surface-3)", boxShadow: i < Math.round(pct / 10) ? `0 0 8px -2px ${color}` : undefined }}
          />
        ))}
      </div>
    </div>
  );
}

export const TelemetryPanel = memo(function TelemetryPanel({
  bey,
  slot,
  spin,
  momentum,
  dashing,
  color,
  status,
  align = "left",
}: {
  bey: Beyblade;
  slot: string;
  spin: number;
  momentum: number;
  dashing: boolean;
  color: string;
  status?: string | null;
  align?: "left" | "right";
}) {
  return (
    <section
      aria-label={`${slot} telemetry: ${bey.name}`}
      className={cn("panel relative overflow-hidden p-3 sm:p-4", dashing && "ring-1")}
      style={dashing ? { ["--tw-ring-color" as string]: color } : undefined}
    >
      <div aria-hidden className="absolute inset-y-0 w-1" style={{ background: color, [align === "left" ? "left" : "right"]: 0 }} />
      <div className={cn("flex items-center gap-3", align === "right" && "lg:flex-row-reverse lg:text-right")}>
        <BeyImage visual={bey.visual} type={bey.type} spin={bey.spinDirection} ratchet={bey.resolvedParts.ratchet.name} motion={spin > 0.05 ? "float" : "none"} className="size-12 shrink-0 sm:size-16" />
        <div className="min-w-0">
          <p className="font-display text-[0.62rem] font-bold tracking-[0.22em]" style={{ color }}>
            {slot}
          </p>
          <p className="truncate font-display text-sm font-bold uppercase tracking-[0.06em] sm:text-base">{bey.name}</p>
          <TypeBadge type={bey.type} className="mt-0.5" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-1">
        <Meter label="Spin" value={spin} color={color} />
        <Meter label="Momentum" value={momentum} color="var(--fg-muted)" />
      </div>
      <p className={cn("mt-2 h-4 font-display text-[0.62rem] font-bold uppercase tracking-[0.2em]", align === "right" && "lg:text-right")} style={{ color }}>
        {status ?? (dashing ? "⚡ Xtreme Dash" : "")}
      </p>
    </section>
  );
});
