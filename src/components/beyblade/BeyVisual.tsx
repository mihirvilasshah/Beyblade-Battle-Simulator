import type { BeyType, BeyVisual as BeyVisualConfig, SpinDirection } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { bladePath, ratchetTeethCount, ratchetTeethPath } from "./beyGeometry";

interface BeyVisualProps {
  visual: BeyVisualConfig;
  type: BeyType;
  spin: SpinDirection;
  ratchet?: string;
  className?: string;
  /** Accessible label; omit to render decoratively. */
  label?: string;
  spinning?: "none" | "slow" | "hover";
}

/**
 * Original stylised top-down representation of a Beyblade — generated from data,
 * not official product artwork.
 */
export function BeyVisual({
  visual,
  type,
  spin,
  ratchet,
  className,
  label,
  spinning = "none",
}: BeyVisualProps) {
  // Deterministic id: identical Beys share identical gradient definitions, so duplicates are harmless.
  const id = `bv-${visual.primary}${visual.secondary}${visual.accent}`.replace(/#/g, "");
  const outline = bladePath(type, visual.blades, spin);
  const teeth = ratchetTeethCount(ratchet);
  const spinClass =
    spinning === "slow"
      ? spin === "right"
        ? "animate-spin-slow"
        : "animate-spin-slow-reverse"
      : spinning === "hover"
        ? cn("transition-transform duration-[1400ms] ease-out", spin === "right" ? "group-hover:rotate-[240deg]" : "group-hover:-rotate-[240deg]")
        : "";

  return (
    <svg
      viewBox="-1.08 -1.08 2.16 2.16"
      className={cn("block aspect-square", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <radialGradient id={`${id}-blade`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={visual.secondary} stopOpacity="0.9" />
          <stop offset="35%" stopColor={visual.primary} />
          <stop offset="100%" stopColor="#05070b" />
        </radialGradient>
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5f7fa" />
          <stop offset="45%" stopColor="#8a93a3" />
          <stop offset="55%" stopColor="#c9d0db" />
          <stop offset="100%" stopColor="#4a5261" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="40%" stopColor={visual.accent} />
          <stop offset="100%" stopColor={visual.primary} />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* view-box reference box starts at user-space (0,0), which is the Bey's centre here. */}
      <g className={spinClass} style={{ transformBox: "view-box", transformOrigin: "0 0" }}>
        <path d={outline} fill={`url(#${id}-blade)`} stroke={visual.secondary} strokeWidth="0.03" strokeLinejoin="round" />
        {/* Inner metal layer, offset half a blade for depth. */}
        <path
          d={outline}
          fill="#0b0e14"
          fillOpacity="0.35"
          stroke={visual.accent}
          strokeOpacity="0.35"
          strokeWidth="0.02"
          transform={`scale(0.8) rotate(${180 / visual.blades})`}
        />
        <path d={outline} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="0.012" transform="scale(0.9)" />
        <path d={outline} fill={`url(#${id}-sheen)`} />
        <circle r="0.64" fill="none" stroke="#05070b" strokeOpacity="0.6" strokeWidth="0.03" />
        <circle r="0.6" fill="none" stroke={`url(#${id}-ring)`} strokeWidth="0.09" />
        <circle r="0.47" fill="#0b0e14" stroke={visual.secondary} strokeOpacity="0.5" strokeWidth="0.02" />
        <path d={ratchetTeethPath(teeth)} stroke={visual.secondary} strokeOpacity="0.8" strokeWidth="0.05" strokeLinecap="round" />
        <circle r="0.26" fill={`url(#${id}-core)`} stroke="#fff" strokeOpacity="0.4" strokeWidth="0.015" />
        <path d="M-0.1 -0.1 L0.1 0.1 M0.1 -0.1 L-0.1 0.1" stroke="#0b0e14" strokeOpacity="0.55" strokeWidth="0.045" strokeLinecap="round" />
      </g>
      <ellipse cx="-0.32" cy="-0.42" rx="0.34" ry="0.14" transform="rotate(-35 -0.32 -0.42)" fill="#fff" fillOpacity="0.1" pointerEvents="none" />
    </svg>
  );
}
