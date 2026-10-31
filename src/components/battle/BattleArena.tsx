"use client";

import { useEffect, useRef, useState } from "react";
import type { BattleEvent, BattleResult } from "@/types/battle";
import type { Beyblade } from "@/types/beyblade";
import { ArenaRenderer, interpolateFrame, type ArenaRendererLike, type RenderBey } from "@/components/stadium/ArenaRenderer";
import { ratchetTeethCount } from "@/components/beyblade/beyGeometry";
import { supportsWebGL } from "@/lib/webgl";

export interface Telemetry {
  t: number;
  spin: [number, number];
  momentum: [number, number];
  dashing: [boolean, boolean];
}

interface BattleArenaProps {
  result: BattleResult;
  beys: [Beyblade, Beyblade];
  playing: boolean;
  runKey: number;
  speed: number;
  lite: boolean;
  reducedMotion: boolean;
  skipSignal: number;
  onTelemetry: (t: Telemetry) => void;
  onEvent: (e: BattleEvent) => void;
  onLaunch: () => void;
  onComplete: () => void;
}

const SLOWMO_EVENTS = new Set(["HEAVY_IMPACT", "BURST_FINISH", "KNOCKOUT_FINISH", "XTREME_FINISH"]);
const IMPACT_EVENTS = new Set(["FIRST_CONTACT", "COLLISION", "DIRECT_HIT", "HEAVY_IMPACT", "COUNTER"]);

/**
 * Stadium + requestAnimationFrame playback loop. Uses the Three.js 3D renderer when WebGL is
 * available and Full FX is on; otherwise the lighter 2D canvas renderer.
 */
export default function BattleArena(props: BattleArenaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ArenaRendererLike | null>(null);
  const propsRef = useRef(props);
  const stateRef = useRef({ simTime: 0, launchStart: 0, launched: false, eventIndex: 1, completed: false, raf: 0, last: 0, lastTelemetry: 0 });
  const [webgl] = useState(() => supportsWebGL());
  const [failed3d, setFailed3d] = useState(false);
  const [ready3d, setReady3d] = useState(false);

  useEffect(() => {
    propsRef.current = props;
  });

  const { result, beys, lite, reducedMotion, playing, runKey, skipSignal } = props;
  const mode: "3d" | "2d" = !lite && webgl && !failed3d ? "3d" : "2d";

  // Create the renderer for the current mode + resize handling.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    const renderBeys = beys.map<RenderBey>((b) => ({
      visual: b.visual,
      type: b.type,
      spin: b.spinDirection,
      ratchetTeeth: ratchetTeethCount(b.resolvedParts.ratchet.name),
    })) as [RenderBey, RenderBey];
    const options = { lite: propsRef.current.lite, reducedMotion: propsRef.current.reducedMotion };

    const attach = (renderer: ArenaRendererLike) => {
      if (cancelled) {
        renderer.dispose?.();
        return;
      }
      rendererRef.current = renderer;
      const draw = () => {
        const s = stateRef.current;
        const r = propsRef.current.result;
        const frame = s.launched || s.completed ? interpolateFrame(r.frames, r.frameInterval, s.simTime) : null;
        renderer.render(frame, 1, 0);
      };
      ro = new ResizeObserver(([entry]) => {
        const size = Math.floor(Math.min(entry.contentRect.width, entry.contentRect.height || entry.contentRect.width));
        if (size > 0) {
          renderer.resize(size, window.devicePixelRatio);
          draw();
        }
      });
      ro.observe(container);
    };

    if (mode === "3d") {
      import("@/components/stadium/ArenaRenderer3D")
        .then(({ ArenaRenderer3D }) => {
          attach(new ArenaRenderer3D(canvas, renderBeys, options));
          if (!cancelled) setReady3d(true);
        })
        .catch((error) => {
          console.warn("3D stadium unavailable, using 2D renderer.", error);
          if (!cancelled) setFailed3d(true);
        });
    } else {
      attach(new ArenaRenderer(canvas, renderBeys, options));
    }

    return () => {
      cancelled = true;
      ro?.disconnect();
      rendererRef.current?.dispose?.();
      rendererRef.current = null;
    };
  }, [beys, mode]);

  useEffect(() => {
    rendererRef.current?.setOptions({ lite, reducedMotion });
  }, [lite, reducedMotion]);

  // Playback loop. Reads the renderer each frame so a quality switch mid-battle keeps playing.
  useEffect(() => {
    if (!playing) return;
    const s = stateRef.current;
    rendererRef.current?.reset();
    Object.assign(s, { simTime: 0, launched: false, eventIndex: 1, completed: false, launchStart: performance.now(), last: performance.now(), lastTelemetry: 0 });
    const launchDuration = reducedMotion ? 0.35 : 0.95;
    const endTime = result.frames[result.frames.length - 1].t;
    let focusRelease = -1;
    let completedAt = 0;

    const fireEvents = (renderer: ArenaRendererLike, upTo: number) => {
      const p = propsRef.current;
      while (s.eventIndex < result.events.length && result.events[s.eventIndex].t <= upTo) {
        const e = result.events[s.eventIndex++];
        const colors: [string, string] = [beys[0].visual.accent, beys[1].visual.accent];
        if (IMPACT_EVENTS.has(e.type) && e.x !== undefined && e.y !== undefined) {
          renderer.impact(e.x, e.y, e.intensity ?? 1, colors);
          if (e.type === "HEAVY_IMPACT") {
            renderer.heavyFocus(e.x, e.y);
            focusRelease = e.t + 0.45;
          }
        } else if (e.type === "XTREME_DASH" && e.actor !== undefined && e.x !== undefined && e.y !== undefined) {
          renderer.dashBurst(e.x, e.y, beys[e.actor].visual.accent);
        } else if (e.type === "BURST_FINISH" && e.target !== undefined) {
          renderer.burst(e.target, e.x ?? 0, e.y ?? 0, e.t);
          renderer.heavyFocus(e.x ?? 0, e.y ?? 0);
        } else if ((e.type === "KNOCKOUT_FINISH" || e.type === "XTREME_FINISH") && e.target !== undefined) {
          renderer.knockout(e.target, e.x ?? 0, e.y ?? 0, e.t, e.type === "XTREME_FINISH");
        }
        p.onEvent(e);
      }
    };

    const speedAt = (t: number) => {
      if (reducedMotion) return 1;
      if (t >= result.duration) return 0.4;
      for (const e of result.events) {
        if (e.t > t + 0.05) break;
        if (SLOWMO_EVENTS.has(e.type) && t > e.t - 0.04 && t < e.t + 0.32) return 0.3;
      }
      return 1;
    };

    const emitTelemetry = (now: number, force = false) => {
      if (!force && now - s.lastTelemetry < 80) return;
      s.lastTelemetry = now;
      const f = interpolateFrame(result.frames, result.frameInterval, s.simTime);
      propsRef.current.onTelemetry({
        t: Math.min(s.simTime, result.duration),
        spin: [f.beys[0].spin, f.beys[1].spin],
        momentum: [f.beys[0].momentum, f.beys[1].momentum],
        dashing: [f.beys[0].dashing, f.beys[1].dashing],
      });
    };

    const tick = (now: number) => {
      const renderer = rendererRef.current;
      const realDt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (!renderer) {
        // Wait for the (lazy-loaded) renderer before launching.
        if (!s.launched) s.launchStart = now;
        s.raf = requestAnimationFrame(tick);
        return;
      }
      const p = propsRef.current;
      if (!s.launched) {
        const launch = Math.min(1, (now - s.launchStart) / 1000 / launchDuration);
        renderer.render(result.frames[0], launch, realDt);
        if (launch >= 1) {
          s.launched = true;
          const f0 = result.frames[0].beys;
          renderer.impact(f0[0].x, f0[0].y, 0.8, [beys[0].visual.accent, "#fff"]);
          renderer.impact(f0[1].x, f0[1].y, 0.8, [beys[1].visual.accent, "#fff"]);
          p.onLaunch();
        }
        s.raf = requestAnimationFrame(tick);
        return;
      }
      if (!s.completed) {
        const dt = realDt * p.speed * speedAt(s.simTime);
        s.simTime = Math.min(endTime, s.simTime + dt);
        fireEvents(renderer, s.simTime);
        if (focusRelease >= 0 && s.simTime > focusRelease) {
          renderer.releaseFocus();
          focusRelease = -1;
        }
        renderer.render(interpolateFrame(result.frames, result.frameInterval, s.simTime), 1, dt);
        emitTelemetry(now);
        if (s.simTime >= endTime) {
          s.completed = true;
          completedAt = now;
          renderer.releaseFocus();
          emitTelemetry(now, true);
          p.onComplete();
        }
      } else {
        // Let particles settle, then stop the loop to save battery.
        renderer.render(interpolateFrame(result.frames, result.frameInterval, s.simTime), 1, realDt * 0.5);
        if (now - completedAt > 1500) return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(s.raf);
    // runKey restarts playback of the same (or a new) result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, runKey, result]);

  // Skip to the end.
  useEffect(() => {
    if (!skipSignal) return;
    const s = stateRef.current;
    const renderer = rendererRef.current;
    if (s.completed) return;
    cancelAnimationFrame(s.raf);
    const endTime = result.frames[result.frames.length - 1].t;
    s.launched = true;
    s.simTime = endTime;
    while (s.eventIndex < result.events.length) {
      const e = result.events[s.eventIndex++];
      if (e.type === "BURST_FINISH" && e.target !== undefined) renderer?.burst(e.target, e.x ?? 0, e.y ?? 0, e.t);
      if ((e.type === "KNOCKOUT_FINISH" || e.type === "XTREME_FINISH") && e.target !== undefined)
        renderer?.knockout(e.target, e.x ?? 0, e.y ?? 0, e.t, e.type === "XTREME_FINISH");
    }
    s.completed = true;
    renderer?.render(interpolateFrame(result.frames, result.frameInterval, endTime), 1, 0);
    const f = result.frames[result.frames.length - 1];
    propsRef.current.onTelemetry({
      t: result.duration,
      spin: [f.beys[0].spin, f.beys[1].spin],
      momentum: [f.beys[0].momentum, f.beys[1].momentum],
      dashing: [false, false],
    });
    propsRef.current.onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipSignal]);

  return (
    <div ref={containerRef} className="relative aspect-square w-full">
      <canvas
        key={mode}
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label={`${mode === "3d" ? "3D battle" : "Battle"} stadium: ${result.names[0]} versus ${result.names[1]}`}
      />
      {mode === "3d" && !ready3d && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="skeleton aspect-square w-[80%] rounded-full" aria-label="Loading 3D stadium" />
        </div>
      )}
    </div>
  );
}
