import type { BeyType, ProductLine, SpinDirection } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { LINE_LABELS, TYPE_LABELS } from "@/utils/formatting";
import { RotateCcw, RotateCw } from "lucide-react";

export const TYPE_TEXT: Record<BeyType, string> = {
  attack: "text-attack",
  defense: "text-defense",
  stamina: "text-stamina",
  balance: "text-balance",
};

export const TYPE_BG: Record<BeyType, string> = {
  attack: "bg-attack",
  defense: "bg-defense",
  stamina: "bg-stamina",
  balance: "bg-balance",
};

export const TYPE_VAR: Record<BeyType, string> = {
  attack: "var(--type-attack)",
  defense: "var(--type-defense)",
  stamina: "var(--type-stamina)",
  balance: "var(--type-balance)",
};

export function TypeBadge({ type, className, size = "sm" }: { type: BeyType; className?: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border font-display font-semibold uppercase tracking-[0.16em]",
        size === "sm" ? "px-2 py-0.5 text-[0.62rem]" : "px-2.5 py-1 text-xs",
        TYPE_TEXT[type],
        className,
      )}
      style={{ borderColor: `color-mix(in oklab, ${TYPE_VAR[type]} 45%, transparent)`, background: `color-mix(in oklab, ${TYPE_VAR[type]} 12%, transparent)` }}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", TYPE_BG[type])} />
      {TYPE_LABELS[type]}
    </span>
  );
}

export function LineBadge({ line, className }: { line: ProductLine; className?: string }) {
  return (
    <span
      title={LINE_LABELS[line]}
      className={cn(
        "inline-flex items-center rounded-md border border-border-strong bg-surface-2 px-1.5 py-0.5 font-display text-[0.62rem] font-semibold tracking-[0.14em] text-fg-muted",
        className,
      )}
    >
      {line}
      <span className="sr-only"> ({LINE_LABELS[line]})</span>
    </span>
  );
}

export function SpinBadge({ spin, className }: { spin: SpinDirection; className?: string }) {
  const Icon = spin === "right" ? RotateCw : RotateCcw;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[0.7rem] font-medium text-fg-muted", className)}>
      <Icon aria-hidden className="size-3.5" />
      {spin === "right" ? "Right" : "Left"}
      <span className="sr-only"> spin</span>
    </span>
  );
}
