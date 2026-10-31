"use client";

import { useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Swords } from "lucide-react";
import type { Beyblade, BeyType } from "@/types/beyblade";
import { TYPE_LABELS } from "@/utils/formatting";
import { generateSeed } from "@/engine/random";
import { ComparisonPanel, SIDE_COLORS } from "@/components/beyblade/ComparisonPanel";
import { BeyImage } from "@/components/beyblade/BeyImage";
import { Button } from "@/components/ui/Button";
import { arenaHref } from "@/components/battle/RandomBattleButton";

const TYPES: BeyType[] = ["attack", "defense", "stamina", "balance"];

export function CompareClient({ beys }: { beys: Beyblade[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const id = useId();
  const byId = useMemo(() => new Map(beys.map((b) => [b.id, b])), [beys]);
  const initial = (key: string, fallback: string) => {
    const v = params.get(key);
    return v && byId.has(v) ? v : fallback;
  };
  const [a, setA] = useState(() => initial("a", "dran-sword-3-60f"));
  const [b, setB] = useState(() => initial("b", a === "wizard-rod-5-70db" ? "dran-sword-3-60f" : "wizard-rod-5-70db"));
  const beyA = byId.get(a) ?? beys[0];
  const beyB = byId.get(b) ?? beys[1];

  const picker = (value: string, onChange: (v: string) => void, label: string, key: string, color: string, bey: Beyblade) => (
    <div className="panel flex items-center gap-4 p-4">
      <BeyImage visual={bey.visual} type={bey.type} spin={bey.spinDirection} ratchet={bey.resolvedParts.ratchet.name} className="size-20 shrink-0" />
      <div className="min-w-0 flex-1">
        <label htmlFor={`${id}-${key}`} className="font-display text-[0.65rem] font-bold tracking-[0.2em]" style={{ color }}>
          {label}
        </label>
        <select
          id={`${id}-${key}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-border bg-bg-elevated px-3 text-sm text-fg outline-none hover:border-border-strong focus-visible:border-accent"
        >
          {TYPES.map((t) => (
            <optgroup key={t} label={TYPE_LABELS[t]}>
              {beys
                .filter((x) => x.type === t)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.fullName} ({x.productCode})
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        {picker(a, setA, "BEYBLADE 1", "a", SIDE_COLORS[0], beyA)}
        {picker(b, setB, "BEYBLADE 2", "b", SIDE_COLORS[1], beyB)}
      </div>
      <ComparisonPanel className="mt-6" beys={[beyA, beyB]} />
      <div className="mt-6 flex justify-center">
        <Button onClick={() => router.push(arenaHref(beyA.id, beyB.id, generateSeed()))} variant="hot" size="lg" icon={<Swords className="size-5" aria-hidden />}>
          Battle these two
        </Button>
      </div>
    </div>
  );
}
