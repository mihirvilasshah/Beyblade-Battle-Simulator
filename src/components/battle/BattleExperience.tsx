"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, FastForward, Gauge, RefreshCw, Repeat, Sparkles, Swords } from "lucide-react";
import type { BattleEvent } from "@/types/battle";
import type { Beyblade } from "@/types/beyblade";
import { useBattleSimulation } from "@/hooks/useBattleSimulation";
import { useBattleHistory } from "@/hooks/useBattleHistory";
import { useHydrated, useLocalStorage } from "@/hooks/useLocalStorage";
import { detectLowPowerDevice, usePrefersReducedMotion } from "@/hooks/useMediaQuery";
import { useSound } from "@/components/layout/Providers";
import { generateSeed } from "@/engine/random";
import { FINISH_LABELS, formatClock, formatPercent, formatSeconds } from "@/utils/formatting";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SIDE_COLORS } from "@/components/beyblade/ComparisonPanel";
import { TelemetryPanel } from "./TelemetryPanel";
import { CALLOUTS, Callout, CountdownOverlay, RandomReveal, WinnerBanner } from "./BattleOverlays";
import { BattleAnalysis } from "./BattleAnalysis";
import type { Telemetry } from "./BattleArena";

const BattleArena = dynamic(() => import("./BattleArena"), {
  ssr: false,
  loading: () => <div className="skeleton aspect-square w-full rounded-full" aria-label="Loading stadium" />,
});

type Phase = "intro" | "countdown" | "battle" | "finish" | "result";
const COUNTDOWN = ["READY", "3", "2", "1", "GO SHOOT!"];
const RAW_COLORS: [string, string] = ["#38d3f5", "#ff8a3d"];

export function BattleExperience({ beys, initialSeed, intro }: { beys: [Beyblade, Beyblade]; initialSeed: string; intro: boolean }) {
  const [seed, setSeed] = useState(initialSeed);
  const simulation = useBattleSimulation(beys, seed);
  const [phase, setPhase] = useState<Phase>(intro ? "intro" : "countdown");
  const [countStep, setCountStep] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [skipSignal, setSkipSignal] = useState(0);
  const [callout, setCallout] = useState<{ id: number; type: BattleEvent["type"] } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [fxPref, setFxPref] = useLocalStorage<"auto" | "full" | "lite">("bbx:fx", "auto");
  const hydrated = useHydrated();
  const reducedMotion = usePrefersReducedMotion();
  const lite = fxPref === "lite" || (fxPref === "auto" && hydrated && detectLowPowerDevice());
  const sound = useSound();
  const { record } = useBattleHistory();
  const lastCalloutAt = useRef(0);
  const calloutId = useRef(0);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);

  const result = simulation.status === "ready" ? simulation.result : null;
  const stepMs = reducedMotion ? 380 : 720;

  // Intro reveal (random battle) -> countdown.
  useEffect(() => {
    if (phase !== "intro") return;
    const id = window.setTimeout(() => setPhase("countdown"), reducedMotion ? 1200 : 2800);
    return () => window.clearTimeout(id);
  }, [phase, reducedMotion]);

  // Countdown ticks.
  useEffect(() => {
    if (phase !== "countdown") return;
    sound.play(countStep === COUNTDOWN.length - 1 ? "go" : "countdown");
    const id = window.setTimeout(() => {
      if (countStep < COUNTDOWN.length - 1) setCountStep((s) => s + 1);
      else setPhase("battle");
    }, stepMs);
    return () => window.clearTimeout(id);
    // sound.play identity changes with the sound toggle; don't restart the countdown for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, countStep, stepMs]);

  // Finish slow-down -> result.
  useEffect(() => {
    if (phase !== "finish" || !result) return;
    const id = window.setTimeout(() => {
      record(result);
      sound.play("victory");
      setPhase("result");
    }, 1100);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, result]);

  useEffect(() => {
    if (phase === "result") resultHeadingRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => () => sound.setSpinHum(0), [sound]);

  useEffect(() => {
    if (!callout) return;
    const id = window.setTimeout(() => setCallout((c) => (c?.id === callout.id ? null : c)), 1900);
    return () => window.clearTimeout(id);
  }, [callout]);

  const onEvent = useCallback(
    (e: BattleEvent) => {
      if (e.type === "COLLISION") {
        sound.play("collision", (e.intensity ?? 1) * 0.6);
        return;
      }
      const cfg = CALLOUTS[e.type];
      if (!cfg) return;
      const isFinish = e.type.endsWith("FINISH");
      if (cfg.sound) sound.play(cfg.sound, e.intensity);
      const now = performance.now();
      if (!isFinish && now - lastCalloutAt.current < 900) return;
      lastCalloutAt.current = now;
      setCallout({ id: ++calloutId.current, type: e.type });
      if (isFinish || e.type === "HEAVY_IMPACT") setAnnouncement(cfg.text);
    },
    [sound],
  );

  const onTelemetry = useCallback(
    (t: Telemetry) => {
      setTelemetry(t);
      sound.setSpinHum((t.spin[0] + t.spin[1]) / 2);
    },
    [sound],
  );

  const onLaunch = useCallback(() => sound.play("launch"), [sound]);
  const onComplete = useCallback(() => {
    sound.setSpinHum(0);
    setPhase((p) => (p === "battle" ? "finish" : p));
  }, [sound]);

  const restart = (nextSeed?: string) => {
    if (nextSeed) {
      setSeed(nextSeed);
      const url = new URL(window.location.href);
      url.searchParams.set("seed", nextSeed);
      url.searchParams.delete("intro");
      window.history.replaceState(null, "", url.toString());
    }
    setRunKey((k) => k + 1);
    setCountStep(0);
    setCallout(null);
    setTelemetry(null);
    setAnnouncement("");
    setPhase("countdown");
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const skip = () => {
    if (phase === "intro" || phase === "countdown") setPhase("battle");
    setSkipSignal((s) => s + 1);
  };

  const status = useMemo(() => {
    if (!result || (phase !== "finish" && phase !== "result")) return [null, null] as [string | null, string | null];
    const loserStatus = { SURVIVOR: "Stopped spinning", KNOCKOUT: "Knocked out", XTREME: "Xtreme finish", BURST: "Burst!" }[result.finishType];
    const out: [string | null, string | null] = [null, null];
    out[result.winnerIndex] = "🏆 Winner";
    out[(1 - result.winnerIndex) as 0 | 1] = loserStatus;
    return out;
  }, [result, phase]);

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon="⚠️"
          title="Simulation error"
          description={<>The battle couldn&apos;t be simulated. {simulation.status === "error" ? simulation.message : ""}</>}
          action={
            <Button onClick={() => restart(generateSeed())} icon={<RefreshCw className="size-4" aria-hidden />}>
              Try another seed
            </Button>
          }
        />
      </div>
    );
  }

  const first = result.frames[0].beys;
  const t = telemetry ?? { t: 0, spin: [first[0].spin, first[1].spin], momentum: [0, 0], dashing: [false, false] };
  const playing = phase === "battle" || phase === "finish" || phase === "result";
  const winner = beys[result.winnerIndex];
  const finishLabel = FINISH_LABELS[result.finishType];
  const calloutCfg = callout ? CALLOUTS[callout.type] : null;
  const changeHref = `/battle?b1=${encodeURIComponent(beys[0].id)}&b2=${encodeURIComponent(beys[1].id)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6">
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Physics-inspired battle simulation</p>
          <h1 className="truncate font-display text-lg font-bold uppercase tracking-[0.08em] sm:text-2xl">
            <span style={{ color: SIDE_COLORS[0] }}>{beys[0].name}</span>
            <span className="mx-2 text-fg-subtle">vs</span>
            <span style={{ color: SIDE_COLORS[1] }}>{beys[1].name}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
            aria-label={`Playback speed ${speed}x — change`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 font-display text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-fg-muted transition hover:border-border-strong hover:text-fg"
          >
            <Gauge className="size-4" aria-hidden /> {speed}x
          </button>
          <button
            type="button"
            onClick={() => setFxPref(lite ? "full" : "lite")}
            aria-label={`Visual effects: ${lite ? "lite" : "full"} — change`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 font-display text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-fg-muted transition hover:border-border-strong hover:text-fg"
          >
            <Sparkles className="size-4" aria-hidden /> {lite ? "Lite FX" : "Full FX"}
          </button>
          {phase !== "result" && phase !== "finish" && (
            <Button variant="secondary" size="sm" onClick={skip} icon={<FastForward className="size-4" aria-hidden />}>
              Skip to result
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 grid items-start gap-4 md:grid-cols-2 lg:grid-cols-[250px_minmax(0,1fr)_250px] lg:gap-6">
        <TelemetryPanel bey={beys[0]} slot="BEY 1" spin={t.spin[0]} momentum={t.momentum[0]} dashing={t.dashing[0]} color={SIDE_COLORS[0]} status={status[0]} />

        <div className="md:order-last md:col-span-2 lg:order-none lg:col-span-1">
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="font-display text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-fg-muted">Battle time</span>
            <span className="font-display text-xl font-bold tabular-nums text-fg" aria-live="off">
              {formatClock(t.t)}s
            </span>
            <span className="rounded border border-border px-1.5 py-0.5 font-display text-[0.58rem] font-bold tracking-[0.18em] text-hot">SIMULATED</span>
          </div>
          <div className="relative mx-auto w-full max-w-[min(100%,78vh)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-[6%] rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${RAW_COLORS[0]}33, transparent 60%), radial-gradient(circle at 70% 60%, ${RAW_COLORS[1]}22, transparent 60%)` }}
            />
            <div className="relative">
              <BattleArena
                result={result}
                beys={beys}
                playing={playing}
                runKey={runKey}
                speed={speed}
                lite={lite}
                reducedMotion={reducedMotion}
                skipSignal={skipSignal}
                onTelemetry={onTelemetry}
                onEvent={onEvent}
                onLaunch={onLaunch}
                onComplete={onComplete}
              />
            </div>
            {phase === "intro" && <RandomReveal beys={beys} />}
            {phase === "countdown" && <CountdownOverlay step={COUNTDOWN[countStep]} />}
            {phase === "battle" && calloutCfg && <Callout key={callout!.id} config={calloutCfg} />}
            {phase === "finish" && calloutCfg && <Callout key={callout!.id} config={calloutCfg} big />}
            {phase === "result" && <WinnerBanner name={winner.name} finish={finishLabel} color={SIDE_COLORS[result.winnerIndex]} />}
          </div>
        </div>

        <TelemetryPanel bey={beys[1]} slot="BEY 2" spin={t.spin[1]} momentum={t.momentum[1]} dashing={t.dashing[1]} color={SIDE_COLORS[1]} status={status[1]} align="right" />
      </div>

      {phase === "result" && (
        <>
          <section aria-labelledby="result-title" className="panel metal-edge mt-8 overflow-hidden p-5 sm:p-7 animate-rise-in">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
              <div>
                <span className="inline-flex rounded-md border border-hot/50 bg-hot/10 px-2 py-0.5 font-display text-[0.62rem] font-bold tracking-[0.2em] text-hot">
                  SIMULATED RESULT
                </span>
                <h2 id="result-title" ref={resultHeadingRef} tabIndex={-1} className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.06em] outline-none sm:text-3xl">
                  <span className="text-fg-muted">Winner: </span>
                  <span style={{ color: SIDE_COLORS[result.winnerIndex] }}>{winner.name}</span>
                </h2>
                <p className="mt-1 font-display text-sm font-semibold uppercase tracking-[0.2em] text-fg-muted">
                  {finishLabel}
                  {result.selfKnockout && " · self knockout"}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-fg-subtle">Battle duration</dt>
                    <dd className="font-display text-lg font-bold tabular-nums">{formatSeconds(result.duration)}</dd>
                  </div>
                  <div>
                    <dt className="text-fg-subtle">Finish</dt>
                    <dd className="font-display text-lg font-bold">{finishLabel}</dd>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <dt className="text-fg-subtle">Final spin</dt>
                    <dd className="font-display text-sm font-bold tabular-nums">
                      {beys.map((b, i) => (
                        <span key={i} className="block">
                          {b.name} — {formatPercent(result.statistics.perBey[i].finalSpin)}
                        </span>
                      ))}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <Button variant="hot" size="lg" onClick={() => restart(generateSeed())} icon={<Swords className="size-4" aria-hidden />} className="sm:col-span-2">
                  Battle again
                </Button>
                <Button variant="secondary" onClick={() => restart()} icon={<Repeat className="size-4" aria-hidden />}>
                  Replay
                </Button>
                <ButtonLink variant="secondary" href={changeHref} icon={<RefreshCw className="size-4" aria-hidden />}>
                  Change Beyblades
                </ButtonLink>
                <Button
                  variant="ghost"
                  className="sm:col-span-2"
                  onClick={() => document.getElementById("analysis")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" })}
                  icon={<BarChart3 className="size-4" aria-hidden />}
                >
                  View battle analysis
                </Button>
                <p className="text-center text-xs text-fg-subtle sm:col-span-2">
                  <strong className="text-fg-muted">Replay</strong> reproduces this exact battle (seed <code>{seed}</code>).{" "}
                  <strong className="text-fg-muted">Battle again</strong> uses a new seed.
                </p>
              </div>
            </div>
          </section>
          <div className="mt-10">
            <BattleAnalysis result={result} colors={RAW_COLORS} />
          </div>
        </>
      )}
    </div>
  );
}
