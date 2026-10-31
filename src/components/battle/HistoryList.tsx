"use client";

import Link from "next/link";
import { BarChart3, Play, Trash2 } from "lucide-react";
import { useBattleHistory } from "@/hooks/useBattleHistory";
import { FINISH_LABELS, formatSeconds } from "@/utils/formatting";
import { SIDE_COLORS } from "@/components/beyblade/ComparisonPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DialogContent, DialogRoot, DialogTrigger } from "@/components/ui/Dialog";
import { arenaHref } from "@/components/battle/RandomBattleButton";
import type { BattleHistoryEntry } from "@/types/battle";

function Inspect({ entry }: { entry: BattleHistoryEntry }) {
  const s = entry.statistics;
  const rows: [string, string | number][] = [
    ["Duration", formatSeconds(entry.duration)],
    ["Finish", FINISH_LABELS[entry.finishType]],
    ["Collisions", s.collisions],
    ["Heavy hits", s.heavyHits],
    ["Xtreme Dashes", s.xtremeDashes],
    ["Counters", s.counters],
    ["Burst attempts", s.burstAttempts],
    ["Seed", entry.seed],
  ];
  return (
    <DialogRoot>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" icon={<BarChart3 className="size-4" aria-hidden />}>
          Inspect
        </Button>
      </DialogTrigger>
      <DialogContent title="Battle statistics" description={`${entry.names[0]} vs ${entry.names[1]}`}>
        <dl className="grid grid-cols-2 gap-3">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-surface-2/60 p-3">
              <dt className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-fg-muted">{k}</dt>
              <dd className="mt-0.5 font-display font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Per-Beyblade statistics</caption>
          <thead>
            <tr className="text-left font-display text-[0.6rem] uppercase tracking-[0.14em] text-fg-muted">
              <th scope="col" className="py-1.5">Beyblade</th>
              <th scope="col" className="py-1.5 text-right">Hits</th>
              <th scope="col" className="py-1.5 text-right">Dashes</th>
              <th scope="col" className="py-1.5 text-right">Final spin</th>
            </tr>
          </thead>
          <tbody>
            {([0, 1] as const).map((i) => (
              <tr key={i} className="border-t border-border">
                <th scope="row" className="py-2 text-left font-semibold" style={{ color: SIDE_COLORS[i] }}>
                  {entry.names[i]}
                </th>
                <td className="py-2 text-right tabular-nums">{s.perBey[i].hitsLanded}</td>
                <td className="py-2 text-right tabular-nums">{s.perBey[i].xtremeDashes}</td>
                <td className="py-2 text-right tabular-nums">{Math.round(s.perBey[i].finalSpin * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 flex justify-end">
          <ButtonLink href={arenaHref(entry.beyIds[0], entry.beyIds[1], entry.seed)} size="sm" icon={<Play className="size-4" aria-hidden />}>
            Replay
          </ButtonLink>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}

export function HistoryList() {
  const { entries, remove, clear, hydrated } = useBattleHistory();

  if (!hydrated) return <div className="skeleton h-40 rounded-2xl" aria-label="Loading battle history" />;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="⚔️"
        title="No battles yet"
        description="Your recent simulations will appear here. They're stored only in this browser — no account needed."
        action={<ButtonLink href="/battle">Start a battle</ButtonLink>}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-fg-muted">
          {entries.length} recent battle{entries.length === 1 ? "" : "s"} · stored locally in this browser
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.confirm("Delete all battle history from this browser?")) clear();
          }}
        >
          Clear all
        </Button>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {entries.map((e) => (
          <li key={e.id} className="panel relative overflow-hidden p-5">
            <div aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: SIDE_COLORS[e.winnerIndex] }} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-fg-subtle">
                  {new Date(e.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
                <p className="mt-2 font-display text-base font-bold uppercase tracking-[0.06em]">
                  <Link href={`/database/${e.beyIds[0]}`} style={{ color: SIDE_COLORS[0] }} className="hover:underline">
                    {e.names[0]}
                  </Link>
                  <span className="mx-2 text-xs text-fg-subtle">VS</span>
                  <Link href={`/database/${e.beyIds[1]}`} style={{ color: SIDE_COLORS[1] }} className="hover:underline">
                    {e.names[1]}
                  </Link>
                </p>
              </div>
              <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[0.65rem] text-fg-subtle">{e.seed}</span>
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt className="text-xs text-fg-subtle">Winner</dt>
                <dd className="font-semibold">{e.names[e.winnerIndex]}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Finish</dt>
                <dd className="font-semibold">{FINISH_LABELS[e.finishType]}</dd>
              </div>
              <div>
                <dt className="text-xs text-fg-subtle">Duration</dt>
                <dd className="font-semibold tabular-nums">{formatSeconds(e.duration)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <ButtonLink href={arenaHref(e.beyIds[0], e.beyIds[1], e.seed)} size="sm" icon={<Play className="size-4" aria-hidden />}>
                Replay
              </ButtonLink>
              <Inspect entry={e} />
              <Button variant="ghost" size="sm" onClick={() => remove(e.id)} icon={<Trash2 className="size-4" aria-hidden />} aria-label={`Delete battle ${e.names[0]} vs ${e.names[1]}`}>
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
