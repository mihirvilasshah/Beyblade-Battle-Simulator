import type { CSSProperties } from "react";
import type { Beyblade } from "@/types/beyblade";
import { BeyModelViewer } from "@/components/beyblade/BeyImage";

const PARTICLES = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => (((i + 1) * 9301 + n * 49297 + i * n * 233) % 233280) / 233280;
  return {
    left: `${(r(1) * 100).toFixed(2)}%`,
    top: `${(40 + r(2) * 55).toFixed(2)}%`,
    delay: `${(r(3) * 6).toFixed(2)}s`,
    duration: `${(5 + r(4) * 5).toFixed(2)}s`,
    dx: `${((r(5) - 0.5) * 80).toFixed(0)}px`,
    size: r(6) > 0.7 ? 3 : 2,
    hot: r(7) > 0.6,
  };
});

/** Decorative hero: stadium rings, particles, energy and two slowly rotating Beys. */
export function HeroArena({ left, right }: { left: Beyblade; right: Beyblade }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid-bg [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div className="absolute left-1/2 top-[58%] aspect-square w-[min(1100px,160vw)] -translate-x-1/2 -translate-y-1/2">
        <svg viewBox="-100 -100 200 200" className="h-full w-full">
          <defs>
            <radialGradient id="hero-bowl" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="var(--surface-3)" stopOpacity="0.9" />
              <stop offset="70%" stopColor="var(--surface)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--bg)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="hero-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.7" />
              <stop offset="50%" stopColor="var(--fg-subtle)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--hot)" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <circle r="92" fill="url(#hero-bowl)" />
          <circle r="92" fill="none" stroke="url(#hero-rim)" strokeWidth="0.6" />
          <circle r="80" fill="none" stroke="var(--border-strong)" strokeOpacity="0.5" strokeWidth="0.3" strokeDasharray="0.6 1.4" />
          <circle r="74" fill="none" stroke="var(--accent)" strokeOpacity="0.25" strokeWidth="0.4" />
          <circle r="50" fill="none" stroke="var(--border-strong)" strokeOpacity="0.35" strokeWidth="0.25" />
          <circle r="24" fill="none" stroke="var(--border-strong)" strokeOpacity="0.3" strokeWidth="0.25" />
          <path d="M-8 -8 L8 8 M8 -8 L-8 8" stroke="var(--fg)" strokeOpacity="0.06" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="absolute left-1/2 top-[72%] size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--accent-glow),transparent_65%)] [animation:pulse-glow_3s_ease-in-out_infinite]" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full [animation:float-particle_linear_infinite]"
          style={
            {
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              background: p.hot ? "var(--hot)" : "var(--accent)",
              boxShadow: `0 0 8px ${p.hot ? "var(--hot)" : "var(--accent)"}`,
              animationDelay: p.delay,
              animationDuration: p.duration,
              "--dx": p.dx,
            } as CSSProperties
          }
        />
      ))}
      <div className="absolute left-[4%] top-[74%] w-[34vw] max-w-[300px] min-w-[150px] -translate-y-1/2 sm:left-[12%]">
        <div className="absolute inset-[12%] rounded-full blur-3xl" style={{ background: left.visual.primary, opacity: 0.45 }} />
        <BeyModelViewer visual={left.visual} type={left.type} spin={left.spinDirection} ratchet={left.resolvedParts.ratchet.name} interactive={false} spinSpeed={3} className="relative w-full" />
      </div>
      <div className="absolute right-[4%] top-[74%] w-[34vw] max-w-[300px] min-w-[150px] -translate-y-1/2 sm:right-[12%]">
        <div className="absolute inset-[12%] rounded-full blur-3xl" style={{ background: right.visual.primary, opacity: 0.45 }} />
        <BeyModelViewer visual={right.visual} type={right.type} spin={right.spinDirection} ratchet={right.resolvedParts.ratchet.name} interactive={false} spinSpeed={3} className="relative w-full" />
      </div>
    </div>
  );
}
