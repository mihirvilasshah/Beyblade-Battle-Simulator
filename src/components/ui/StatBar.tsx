import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

interface StatBarProps {
  label: string;
  value: number;
  /** 0-100 fill. */
  percent: number;
  display?: string;
  color?: string;
  estimated?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** Delay the fill animation (ms). */
  delay?: number;
}

/** Accessible horizontal stat meter. */
export function StatBar({ label, value, percent, display, color = "var(--accent)", estimated, size = "md", className, delay = 0 }: StatBarProps) {
  const shown = display ?? String(value);
  return (
    <div className={cn("grid grid-cols-[4.5rem_1fr_3rem] items-center gap-3", size === "sm" && "grid-cols-[2.25rem_1fr_2rem] gap-2", className)}>
      <span className={cn("font-display font-semibold uppercase tracking-[0.14em] text-fg-muted", size === "sm" ? "text-[0.6rem]" : "text-[0.68rem]")}>
        {label}
      </span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-valuetext={`${shown}${estimated ? " (includes estimate)" : ""}`}
        className={cn("relative overflow-hidden rounded-full bg-surface-3", size === "sm" ? "h-1.5" : "h-2.5")}
      >
        <div
          className="stat-fill absolute inset-y-0 left-0 origin-left overflow-hidden rounded-full"
          style={
            {
              width: `${Math.max(2, percent)}%`,
              background: `linear-gradient(90deg, color-mix(in oklab, ${color} 55%, transparent), ${color})`,
              boxShadow: `0 0 12px -2px ${color}`,
              animationDelay: `${delay}ms`,
            } as CSSProperties
          }
        />
      </div>
      <span className={cn("text-right font-display font-semibold tabular-nums text-fg", size === "sm" ? "text-[0.68rem]" : "text-sm")}>
        {estimated && <span title="Includes a derived estimate" className="text-fg-subtle">≈</span>}
        {shown}
      </span>
    </div>
  );
}
