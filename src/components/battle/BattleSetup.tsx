"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Swords, X } from "lucide-react";
import type { Beyblade } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { generateSeed } from "@/engine/random";
import { statPercent } from "@/utils/calculations";
import { formatWeight } from "@/utils/formatting";
import { BeyBrowser } from "@/components/beyblade/BeyBrowser";
import { BeyImage } from "@/components/beyblade/BeyImage";
import { ComparisonPanel, SIDE_COLORS } from "@/components/beyblade/ComparisonPanel";
import { TypeBadge } from "@/components/ui/Badges";
import { StatBar } from "@/components/ui/StatBar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { QuickBattle, type BeyOption } from "./QuickBattle";
import { RandomBattleButton, arenaHref } from "./RandomBattleButton";

type Slot = 0 | 1;

function SlotCard({ bey, slot, active, onActivate, onClear }: { bey: Beyblade | null; slot: Slot; active: boolean; onActivate: () => void; onClear: () => void }) {
  const color = SIDE_COLORS[slot];
  return (
    <div
      className={cn(
        "panel relative flex min-h-[220px] flex-col items-center justify-center overflow-hidden p-4 text-center transition sm:p-5",
        active && "ring-2",
      )}
      style={active ? { ["--tw-ring-color" as string]: color } : undefined}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1" style={{ background: color }} />
      <button
        type="button"
        onClick={onActivate}
        aria-pressed={active}
        aria-label={`${active ? "Choosing" : "Choose"} Beyblade ${slot + 1}${bey ? ` (currently ${bey.fullName})` : ""}`}
        className="absolute inset-0 z-0"
      />
      <p className="relative font-display text-[0.65rem] font-bold tracking-[0.24em]" style={{ color }}>
        BEYBLADE {slot + 1}
      </p>
      {bey ? (
        <div className="pointer-events-none relative mt-3 w-full">
          <BeyImage visual={bey.visual} type={bey.type} spin={bey.spinDirection} ratchet={bey.resolvedParts.ratchet.name} motion="float" className="mx-auto w-28 sm:w-32" />
          <p className="mt-3 font-display text-lg font-bold uppercase tracking-[0.06em]">{bey.name}</p>
          <div className="mt-1 flex items-center justify-center gap-2">
            <TypeBadge type={bey.type} />
            <span className="text-xs text-fg-muted">
              {bey.comboCode} · {formatWeight(bey.stats.weight)}
            </span>
          </div>
          <div className="mx-auto mt-3 max-w-[220px] space-y-1">
            <StatBar size="sm" label="ATK" value={bey.stats.attack} percent={statPercent("attack", bey.stats.attack)} color="var(--type-attack)" />
            <StatBar size="sm" label="DEF" value={bey.stats.defense} percent={statPercent("defense", bey.stats.defense)} color="var(--type-defense)" />
            <StatBar size="sm" label="STA" value={bey.stats.stamina} percent={statPercent("stamina", bey.stats.stamina)} color="var(--type-stamina)" />
          </div>
        </div>
      ) : (
        <div className="pointer-events-none relative mt-4">
          <div className="mx-auto grid size-20 place-items-center rounded-full border-2 border-dashed border-border-strong text-2xl text-fg-subtle">?</div>
          <p className="mt-3 text-sm text-fg-muted">{active ? "Pick a Beyblade below" : "Tap to choose"}</p>
        </div>
      )}
      {bey && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-md text-fg-subtle transition hover:bg-surface-2 hover:text-fg"
          aria-label={`Clear Beyblade ${slot + 1}`}
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

export function BattleSetup({ beys }: { beys: Beyblade[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const byId = useMemo(() => new Map(beys.map((b) => [b.id, b])), [beys]);
  const [slots, setSlots] = useState<[string | null, string | null]>(() => {
    const b1 = params.get("b1");
    const b2 = params.get("b2");
    return [b1 && byId.has(b1) ? b1 : null, b2 && byId.has(b2) ? b2 : null];
  });
  const [active, setActive] = useState<Slot>(() => (slots[0] && !slots[1] ? 1 : 0));
  const [tab, setTab] = useState<"full" | "quick">("full");

  const selected: [Beyblade | null, Beyblade | null] = [slots[0] ? byId.get(slots[0])! : null, slots[1] ? byId.get(slots[1])! : null];

  const onSelect = useCallback(
    (bey: Beyblade) => {
      setSlots((prev) => {
        const next: [string | null, string | null] = [...prev];
        next[active] = bey.id;
        return next;
      });
      const other = (1 - active) as Slot;
      if (!slots[other]) setActive(other);
    },
    [active, slots],
  );

  const selectedMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    slots.forEach((id, i) => {
      if (id) (map[id] ??= []).push(`BEY ${i + 1}`);
    });
    return map;
  }, [slots]);

  const options: BeyOption[] = useMemo(() => beys.map(({ id, name, fullName, type, productCode }) => ({ id, name, fullName, type, productCode })), [beys]);
  const ready = selected[0] && selected[1];

  return (
    <div>
      <div role="tablist" aria-label="Battle mode" className="inline-flex rounded-xl border border-border bg-surface p-1">
        {(
          [
            ["full", "Battle setup"],
            ["quick", "Quick battle"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls={`panel-${value}`}
            id={`tab-${value}`}
            onClick={() => setTab(value)}
            className={cn(
              "h-10 rounded-lg px-4 font-display text-[0.7rem] font-semibold uppercase tracking-[0.16em] transition",
              tab === value ? "bg-surface-3 text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "quick" ? (
        <div id="panel-quick" role="tabpanel" aria-labelledby="tab-quick" className="mt-6">
          <QuickBattle options={options} />
          <div className="mt-4 flex justify-center">
            <RandomBattleButton ids={beys.map((b) => b.id)} />
          </div>
        </div>
      ) : (
        <div id="panel-full" role="tabpanel" aria-labelledby="tab-full" className="mt-6">
          <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <SlotCard bey={selected[0]} slot={0} active={active === 0} onActivate={() => setActive(0)} onClear={() => setSlots(([, b]) => [null, b])} />
            <div className="flex items-center justify-center" aria-hidden>
              <span className="font-display text-3xl font-bold italic text-gradient sm:text-4xl">VS</span>
            </div>
            <SlotCard bey={selected[1]} slot={1} active={active === 1} onActivate={() => setActive(1)} onClear={() => setSlots(([a]) => [a, null])} />
          </div>

          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              variant="hot"
              size="lg"
              disabled={!ready}
              onClick={() => ready && router.push(arenaHref(selected[0]!.id, selected[1]!.id, generateSeed()))}
              icon={<Swords className="size-5" aria-hidden />}
            >
              Launch battle
            </Button>
            <RandomBattleButton ids={beys.map((b) => b.id)} size="lg" />
          </div>

          {ready ? (
            <ComparisonPanel className="mt-8" beys={[selected[0]!, selected[1]!]} />
          ) : (
            !selected[0] &&
            !selected[1] && (
              <EmptyState
                className="mt-8"
                icon="⚔️"
                title="Your battle arena is empty"
                description={
                  <>
                    Choose two Beyblades
                    <br />
                    to begin the battle.
                  </>
                }
              />
            )
          )}

          <div className="mt-10">
            <h2 className="font-display text-lg font-bold uppercase tracking-[0.14em]">
              Choose <span style={{ color: SIDE_COLORS[active] }}>Beyblade {active + 1}</span>
            </h2>
            <p className="mb-4 mt-1 text-sm text-fg-muted">Select a card to place it in the highlighted slot. Mirror matches are allowed.</p>
            <BeyBrowser beys={beys} mode="select" onSelect={onSelect} selectedMap={selectedMap} compact />
          </div>
        </div>
      )}
    </div>
  );
}
