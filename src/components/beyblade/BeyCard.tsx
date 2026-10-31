"use client";

import Link from "next/link";
import { memo, useCallback, type PointerEvent } from "react";
import type { Beyblade } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { statPercent } from "@/utils/calculations";
import { formatWeight } from "@/utils/formatting";
import { BeyImage } from "./BeyImage";
import { LineBadge, SpinBadge, TYPE_VAR, TypeBadge } from "@/components/ui/Badges";
import { StatBar } from "@/components/ui/StatBar";

interface BeyCardProps {
  bey: Beyblade;
  mode?: "link" | "select";
  layout?: "grid" | "list";
  onSelect?: (bey: Beyblade) => void;
  /** Slot labels this Bey currently fills, e.g. ["BEY 1"]. */
  selectedAs?: string[];
  priority?: boolean;
}

function handleTilt(e: PointerEvent<HTMLElement>) {
  if (e.pointerType !== "mouse") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const px = (e.clientX - rect.left) / rect.width;
  const py = (e.clientY - rect.top) / rect.height;
  el.style.setProperty("--ry", `${(px - 0.5) * 10}deg`);
  el.style.setProperty("--rx", `${(0.5 - py) * 10}deg`);
  el.style.setProperty("--mx", `${px * 100}%`);
  el.style.setProperty("--my", `${py * 100}%`);
}

function resetTilt(e: PointerEvent<HTMLElement>) {
  e.currentTarget.style.setProperty("--rx", "0deg");
  e.currentTarget.style.setProperty("--ry", "0deg");
}

export const BeyCard = memo(function BeyCard({ bey, mode = "link", layout = "grid", onSelect, selectedAs }: BeyCardProps) {
  const color = TYPE_VAR[bey.type];
  const selected = !!selectedAs?.length;
  const est = (k: "attack" | "defense" | "stamina") => bey.estimated.includes(k);
  const onClick = useCallback(() => onSelect?.(bey), [onSelect, bey]);

  const body = (
    <>
      <div aria-hidden className="tilt-glow pointer-events-none absolute inset-0 rounded-[inherit]" style={{ ["--glow" as string]: `color-mix(in oklab, ${color} 30%, transparent)` }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      <div className={cn("relative", layout === "grid" ? "flex flex-col gap-4" : "flex items-center gap-4 sm:gap-6")}>
        <div className={cn("relative mx-auto shrink-0", layout === "grid" ? "w-[62%]" : "w-20 sm:w-24")}>
          <div
            aria-hidden
            className="absolute inset-[8%] rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-90"
            style={{ background: color, opacity: 0.25 }}
          />
          <BeyImage visual={bey.visual} type={bey.type} spin={bey.spinDirection} ratchet={bey.resolvedParts.ratchet.name} motion="hover" className="relative w-full" />
          {selected && (
            <span className="absolute -right-2 -top-1 rounded-md bg-accent px-1.5 py-0.5 font-display text-[0.6rem] font-bold tracking-[0.14em] text-accent-contrast shadow-lg">
              {selectedAs!.join(" · ")}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge type={bey.type} />
            <LineBadge line={bey.line} />
            <span className="font-display text-[0.65rem] font-semibold tracking-[0.12em] text-fg-subtle">{bey.productCode}</span>
          </div>
          <h3 className="mt-2 truncate font-display text-lg font-bold uppercase tracking-[0.06em] text-fg">{bey.name}</h3>
          <p className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="font-display font-semibold tracking-[0.1em]">{bey.comboCode}</span>
            <span aria-hidden>·</span>
            <span>{formatWeight(bey.stats.weight)}</span>
            <span aria-hidden>·</span>
            <SpinBadge spin={bey.spinDirection} />
          </p>
          <div className={cn("mt-3 space-y-1.5", layout === "list" && "hidden sm:block sm:max-w-xs")}>
            <StatBar size="sm" label="ATK" value={bey.stats.attack} percent={statPercent("attack", bey.stats.attack)} color="var(--type-attack)" estimated={est("attack")} />
            <StatBar size="sm" label="DEF" value={bey.stats.defense} percent={statPercent("defense", bey.stats.defense)} color="var(--type-defense)" estimated={est("defense")} />
            <StatBar size="sm" label="STA" value={bey.stats.stamina} percent={statPercent("stamina", bey.stats.stamina)} color="var(--type-stamina)" estimated={est("stamina")} />
          </div>
        </div>
        {layout === "list" && (
          <p className="hidden max-w-sm text-sm leading-relaxed text-fg-muted lg:block">{bey.description}</p>
        )}
      </div>
    </>
  );

  const className = cn(
    "tilt-card group relative block w-full overflow-hidden rounded-2xl border bg-surface p-4 text-left shadow-card sm:p-5",
    selected ? "border-accent ring-1 ring-accent" : "border-border hover:border-border-strong",
  );
  const label = `${bey.fullName}, ${bey.type} type, ${bey.productCode}`;

  if (mode === "select") {
    return (
      <button
        type="button"
        onClick={onClick}
        onPointerMove={handleTilt}
        onPointerLeave={resetTilt}
        className={className}
        aria-pressed={selected}
        aria-label={`Select ${label}${selected ? ` (selected as ${selectedAs!.join(" and ")})` : ""}`}
      >
        {body}
      </button>
    );
  }
  return (
    <Link href={`/database/${bey.id}`} onPointerMove={handleTilt} onPointerLeave={resetTilt} className={className} aria-label={`${label} — view details`}>
      {body}
    </Link>
  );
});
