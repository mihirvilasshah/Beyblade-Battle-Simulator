"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, LayoutGrid, List, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { Beyblade, BeyType, ProductLine } from "@/types/beyblade";
import { cn } from "@/lib/cn";
import { DEFAULT_FILTERS, WEIGHT_BOUNDS, filterBeyblades, type BeyFilters, type SortKey } from "@/utils/calculations";
import { TYPE_LABELS } from "@/utils/formatting";
import { TYPE_VAR } from "@/components/ui/Badges";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { BeyCard } from "./BeyCard";

const TYPES: BeyType[] = ["attack", "defense", "stamina", "balance"];
const LINES: ProductLine[] = ["BX", "UX", "CX"];
const SORTS: { value: SortKey; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "attack", label: "Attack" },
  { value: "defense", label: "Defense" },
  { value: "stamina", label: "Stamina" },
  { value: "weight", label: "Weight" },
  { value: "burstResistance", label: "Burst Resistance" },
  { value: "dash", label: "Dash" },
  { value: "releaseDate", label: "Release date" },
];

function Chip({ active, onClick, children, color }: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 font-display text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition",
        active ? "border-transparent text-fg" : "border-border bg-surface/60 text-fg-muted hover:border-border-strong hover:text-fg",
      )}
      style={active ? { background: `color-mix(in oklab, ${color ?? "var(--accent)"} 22%, var(--surface))`, borderColor: color ?? "var(--accent)" } : undefined}
    >
      {color && <span aria-hidden className="size-2 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  );
}

const selectClass =
  "h-9 rounded-lg border border-border bg-surface px-2.5 text-sm text-fg outline-none transition hover:border-border-strong focus-visible:border-accent";

interface BeyBrowserProps {
  beys: Beyblade[];
  mode?: "link" | "select";
  onSelect?: (bey: Beyblade) => void;
  selectedMap?: Record<string, string[]>;
  allowViewToggle?: boolean;
  compact?: boolean;
}

export function BeyBrowser({ beys, mode = "link", onSelect, selectedMap, allowViewToggle = false, compact = false }: BeyBrowserProps) {
  const [filters, setFilters] = useState<BeyFilters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const deferred = useDeferredValue(filters);
  const results = useMemo(() => filterBeyblades(beys, deferred), [beys, deferred]);
  const ids = useId();

  const set = <K extends keyof BeyFilters>(key: K, value: BeyFilters[K]) => setFilters((f) => ({ ...f, [key]: value }));
  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const activeCount =
    filters.types.length + filters.lines.length + (filters.spin !== "any" ? 1 : 0) + (filters.weightMin !== WEIGHT_BOUNDS.min || filters.weightMax !== WEIGHT_BOUNDS.max ? 1 : 0);

  return (
    <div>
      <div className="panel p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search by name, product code or part</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => set("query", e.target.value)}
              placeholder="Search name, product code (UX-03), part…"
              className="h-11 w-full rounded-lg border border-border bg-bg-elevated pl-9 pr-3 text-sm text-fg outline-none transition placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent"
            />
          </label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <span className="font-display font-semibold uppercase tracking-[0.14em]">Sort</span>
              <select value={filters.sort} onChange={(e) => set("sort", e.target.value as SortKey)} className={selectClass}>
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => set("direction", filters.direction === "asc" ? "desc" : "asc")}
              className="grid size-9 place-items-center rounded-lg border border-border text-fg-muted transition hover:border-border-strong hover:text-fg"
              aria-label={filters.direction === "asc" ? "Sorted ascending — switch to descending" : "Sorted descending — switch to ascending"}
            >
              {filters.direction === "asc" ? <ArrowUpNarrowWide className="size-4" aria-hidden /> : <ArrowDownWideNarrow className="size-4" aria-hidden />}
            </button>
            <button
              type="button"
              onClick={() => setShowFilters((s) => !s)}
              aria-expanded={showFilters}
              aria-controls={`${ids}-filters`}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg border px-3 font-display text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition lg:hidden",
                showFilters || activeCount ? "border-accent text-accent-strong" : "border-border text-fg-muted",
              )}
            >
              <SlidersHorizontal className="size-4" aria-hidden /> Filters{activeCount ? ` (${activeCount})` : ""}
            </button>
            {allowViewToggle && (
              <div role="group" aria-label="View" className="hidden rounded-lg border border-border p-0.5 sm:flex">
                {(["grid", "list"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    aria-label={v === "grid" ? "Grid view" : "List view"}
                    className={cn("grid size-8 place-items-center rounded-md transition", view === v ? "bg-surface-3 text-fg" : "text-fg-subtle hover:text-fg")}
                  >
                    {v === "grid" ? <LayoutGrid className="size-4" aria-hidden /> : <List className="size-4" aria-hidden />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div id={`${ids}-filters`} className={cn("mt-3 flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-3", showFilters ? "flex" : "hidden lg:flex")}>
          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">Type</legend>
            {TYPES.map((t) => (
              <Chip key={t} active={filters.types.includes(t)} onClick={() => set("types", toggleIn(filters.types, t))} color={TYPE_VAR[t]}>
                {TYPE_LABELS[t]}
              </Chip>
            ))}
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">Product line</legend>
            {LINES.map((l) => (
              <Chip key={l} active={filters.lines.includes(l)} onClick={() => set("lines", toggleIn(filters.lines, l))}>
                {l}
              </Chip>
            ))}
          </fieldset>
          <label className="flex items-center gap-2 text-xs text-fg-muted">
            <span className="font-display font-semibold uppercase tracking-[0.14em]">Spin</span>
            <select value={filters.spin} onChange={(e) => set("spin", e.target.value as BeyFilters["spin"])} className={selectClass}>
              <option value="any">Any</option>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </label>
          <fieldset className="flex items-center gap-2 text-xs text-fg-muted">
            <legend className="sr-only">Weight range in grams</legend>
            <span aria-hidden className="font-display font-semibold uppercase tracking-[0.14em]">Weight</span>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Minimum weight</span>
              <input
                type="range"
                min={WEIGHT_BOUNDS.min}
                max={WEIGHT_BOUNDS.max}
                step={0.5}
                value={filters.weightMin}
                onChange={(e) => set("weightMin", Math.min(Number(e.target.value), filters.weightMax))}
                className="w-20 accent-[var(--accent)]"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Maximum weight</span>
              <input
                type="range"
                min={WEIGHT_BOUNDS.min}
                max={WEIGHT_BOUNDS.max}
                step={0.5}
                value={filters.weightMax}
                onChange={(e) => set("weightMax", Math.max(Number(e.target.value), filters.weightMin))}
                className="w-20 accent-[var(--accent)]"
              />
            </label>
            <span className="tabular-nums text-fg">
              {filters.weightMin}–{filters.weightMax} g
            </span>
          </fieldset>
          {(activeCount > 0 || filters.query) && (
            <button
              type="button"
              onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort, direction: filters.direction })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-muted underline-offset-4 hover:text-fg hover:underline"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset filters
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs text-fg-subtle" aria-live="polite">
        {results.length} of {beys.length} Beyblades
      </p>

      {results.length === 0 ? (
        <EmptyState
          className="mt-3"
          icon="🔍"
          title="No Beyblades found"
          description="Try changing your filters."
          action={
            <Button variant="secondary" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <ul
          className={cn(
            "mt-3",
            view === "grid"
              ? cn("grid gap-4 sm:grid-cols-2", compact ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "lg:grid-cols-3 xl:grid-cols-4")
              : "flex flex-col gap-3",
          )}
        >
          {results.map((bey) => (
            <li key={bey.id}>
              <BeyCard bey={bey} mode={mode} layout={view} onSelect={onSelect} selectedAs={selectedMap?.[bey.id]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
