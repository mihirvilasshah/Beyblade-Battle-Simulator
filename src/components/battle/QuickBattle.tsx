"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Swords } from "lucide-react";
import type { BeyType } from "@/types/beyblade";
import { generateSeed } from "@/engine/random";
import { TYPE_LABELS } from "@/utils/formatting";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { arenaHref } from "./RandomBattleButton";

export interface BeyOption {
  id: string;
  name: string;
  fullName: string;
  type: BeyType;
  productCode: string;
}

const selectClass =
  "h-12 w-full rounded-lg border border-border bg-bg-elevated px-3 text-sm text-fg outline-none transition hover:border-border-strong focus-visible:border-accent";

export function QuickBattle({ options, className }: { options: BeyOption[]; className?: string }) {
  const router = useRouter();
  const id = useId();
  const [b1, setB1] = useState(options[0]?.id ?? "");
  const [b2, setB2] = useState(options[1]?.id ?? "");
  const grouped = (["attack", "defense", "stamina", "balance"] as BeyType[]).map((type) => ({ type, items: options.filter((o) => o.type === type) }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (b1 && b2) router.push(arenaHref(b1, b2, generateSeed()));
  };

  const select = (value: string, onChange: (v: string) => void, label: string, key: string) => (
    <div className="flex-1">
      <label htmlFor={`${id}-${key}`} className="mb-1.5 block font-display text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-fg-muted">
        {label}
      </label>
      <select id={`${id}-${key}`} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {grouped.map((g) => (
          <optgroup key={g.type} label={TYPE_LABELS[g.type]}>
            {g.items.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName} ({o.productCode})
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );

  return (
    <form onSubmit={submit} className={cn("panel p-5 sm:p-6", className)} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="font-display text-lg font-bold uppercase tracking-[0.16em]">
        Quick Battle
      </h2>
      <p className="mt-1 text-sm text-fg-muted">Pick two Beyblades and go — no setup required.</p>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        {select(b1, setB1, "Choose Beyblade 1", "b1")}
        <span aria-hidden className="hidden pb-3 font-display text-sm font-bold text-fg-subtle sm:block">
          VS
        </span>
        {select(b2, setB2, "Choose Beyblade 2", "b2")}
        <Button type="submit" variant="hot" size="lg" className="sm:h-12" icon={<Swords className="size-4" aria-hidden />}>
          Battle
        </Button>
      </div>
    </form>
  );
}
