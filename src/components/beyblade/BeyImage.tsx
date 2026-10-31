"use client";

import { useEffect, useRef, useState } from "react";
import type { BeyType, BeyVisual as BeyVisualConfig, SpinDirection } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { supportsWebGL } from "@/lib/webgl";
import { BeyVisual } from "./BeyVisual";
import { ratchetTeethCount } from "./beyGeometry";

interface BeyArtProps {
  visual: BeyVisualConfig;
  type: BeyType;
  spin: SpinDirection;
  ratchet?: string;
  className?: string;
  label?: string;
}

/**
 * 3D-rendered Beyblade image (via a shared WebGL context), generated lazily when scrolled
 * into view. Falls back to the flat SVG while loading or when WebGL is unavailable.
 */
export function BeyImage({ visual, type, spin, ratchet, className, label, motion = "none" }: BeyArtProps & { motion?: "none" | "hover" | "float" }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsWebGL()) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        import("@/components/three/thumbnails")
          .then(({ renderBeyThumbnail }) => renderBeyThumbnail({ visual, type, spin, ratchetTeeth: ratchetTeethCount(ratchet) }))
          .then((u) => !cancelled && setUrl(u))
          .catch(() => undefined);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [visual, type, spin, ratchet]);

  const motionClass =
    motion === "hover"
      ? "transition-transform duration-500 ease-out group-hover:-translate-y-1.5 group-hover:rotate-[4deg] group-hover:scale-[1.04]"
      : motion === "float"
        ? "animate-bey-float"
        : "";

  return (
    <div ref={ref} className={cn("relative aspect-square", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- generated data URL, not an optimisable asset
        <img src={url} alt="" draggable={false} className={cn("block h-full w-full select-none", motionClass)} />
      ) : (
        <BeyVisual visual={visual} type={type} spin={spin} ratchet={ratchet} spinning={motion === "hover" ? "hover" : motion === "float" ? "slow" : "none"} className="h-full w-full scale-[0.82]" />
      )}
    </div>
  );
}

/** Live, interactive 3D model of a Beyblade with the SVG as a fallback. */
export function BeyModelViewer({ visual, type, spin, ratchet, className, label, spinSpeed = 2.4, interactive = true }: BeyArtProps & { spinSpeed?: number; interactive?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !supportsWebGL()) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("@/components/three/viewer")
      .then(({ createBeyViewer }) => {
        if (cancelled) return;
        dispose = createBeyViewer(canvas, { visual, type, spin, ratchetTeeth: ratchetTeethCount(ratchet) }, { spinSpeed: reduced ? 0.4 : spinSpeed, interactive });
        setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [visual, type, spin, ratchet, spinSpeed, interactive]);

  return (
    <div className={cn("relative aspect-square", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {!ready && <BeyVisual visual={visual} type={type} spin={spin} ratchet={ratchet} spinning="slow" className="absolute inset-0 h-full w-full scale-[0.82]" />}
      <canvas ref={canvasRef} className={cn("absolute inset-0 h-full w-full transition-opacity duration-500", ready ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
