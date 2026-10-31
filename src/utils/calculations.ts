import type {
  Beyblade,
  BeybladeRecord,
  BeyType,
  ComboStats,
  Part,
  PartCategory,
  PartStats,
  ProductLine,
  ResolvedParts,
  SpinDirection,
  StatKey,
} from "@/types/beyblade";

type NumericPartStat = keyof PartStats;

/** Average of each numeric part spec per category; used only to estimate missing specs. */
export function computeCategoryAverages(parts: Part[]) {
  const sums = new Map<PartCategory, Record<string, { total: number; count: number }>>();
  const weightSums = new Map<PartCategory, { total: number; count: number }>();
  for (const part of parts) {
    const bucket = sums.get(part.category) ?? {};
    for (const [key, value] of Object.entries(part.stats)) {
      if (typeof value !== "number") continue;
      bucket[key] ??= { total: 0, count: 0 };
      bucket[key].total += value;
      bucket[key].count += 1;
    }
    sums.set(part.category, bucket);
    if (typeof part.weight === "number") {
      const w = weightSums.get(part.category) ?? { total: 0, count: 0 };
      w.total += part.weight;
      w.count += 1;
      weightSums.set(part.category, w);
    }
  }
  const stat = (category: PartCategory, key: NumericPartStat) => {
    const entry = sums.get(category)?.[key];
    return entry && entry.count > 0 ? entry.total / entry.count : 0;
  };
  const weight = (category: PartCategory) => {
    const entry = weightSums.get(category);
    return entry && entry.count > 0 ? entry.total / entry.count : 0;
  };
  return { stat, weight };
}

export type CategoryAverages = ReturnType<typeof computeCategoryAverages>;

/**
 * Combined combo stats: ATK/DEF/STA are the sum of every part's manufacturer spec,
 * Dash and Burst Resistance come from the Bit. Missing specs are filled with the
 * category average and reported in `estimated`.
 */
export function calculateComboStats(
  record: BeybladeRecord,
  parts: ResolvedParts,
  averages: CategoryAverages,
): { stats: ComboStats; estimated: (keyof ComboStats)[] } {
  const estimated = new Set<keyof ComboStats>();
  const totals = { attack: 0, defense: 0, stamina: 0 };

  for (const [category, part] of Object.entries(parts) as [PartCategory, Part][]) {
    // Lock chips carry no performance specs.
    if (category === "lockChip") continue;
    for (const key of ["attack", "defense", "stamina"] as const) {
      const value = part.stats[key];
      if (typeof value === "number") totals[key] += value;
      else {
        totals[key] += averages.stat(category, key);
        estimated.add(key);
      }
    }
  }

  const bitValue = (key: "dash" | "burstResistance") => {
    const value = parts.bit.stats[key];
    if (typeof value === "number") return value;
    estimated.add(key);
    return averages.stat("bit", key);
  };

  let weight = record.weight;
  if (weight === null) {
    estimated.add("weight");
    weight = (Object.entries(parts) as [PartCategory, Part][]).reduce(
      (sum, [category, part]) => sum + (part.weight ?? averages.weight(category)),
      0,
    );
  }

  return {
    stats: {
      attack: Math.round(totals.attack),
      defense: Math.round(totals.defense),
      stamina: Math.round(totals.stamina),
      dash: Math.round(bitValue("dash")),
      burstResistance: Math.round(bitValue("burstResistance")),
      weight: Math.round(weight * 10) / 10,
      height: parts.ratchet.height ?? 60,
    },
    estimated: [...estimated],
  };
}

export function resolveParts(record: BeybladeRecord, partsById: Map<string, Part>): ResolvedParts {
  const resolved: Partial<Record<PartCategory, Part>> = {};
  for (const [category, id] of Object.entries(record.parts) as [PartCategory, string][]) {
    const part = partsById.get(id);
    if (!part) throw new Error(`Beyblade "${record.id}" references unknown part "${id}"`);
    resolved[category] = part;
  }
  return resolved as ResolvedParts;
}

export function resolveBeyblade(
  record: BeybladeRecord,
  partsById: Map<string, Part>,
  averages: CategoryAverages,
): Beyblade {
  const resolvedParts = resolveParts(record, partsById);
  const { stats, estimated } = calculateComboStats(record, resolvedParts, averages);
  return { ...record, resolvedParts, stats, estimated };
}

/** Reference maximum used to scale stat bars. Combined specs rarely exceed these. */
export const STAT_SCALE: Record<StatKey, number> = {
  attack: 140,
  defense: 140,
  stamina: 140,
  dash: 50,
  burstResistance: 100,
  weight: 55,
};

export function statPercent(key: StatKey, value: number) {
  return Math.max(0, Math.min(100, (value / STAT_SCALE[key]) * 100));
}

/** Normalised 0-100 "balance" axis used for the radar chart: how evenly ATK/DEF/STA are spread. */
export function balanceScore(stats: ComboStats) {
  const values = [stats.attack, stats.defense, stats.stamina];
  const mean = values.reduce((a, b) => a + b, 0) / 3;
  const spread = Math.max(...values) - Math.min(...values);
  const evenness = mean > 0 ? 1 - spread / (mean * 2) : 0;
  return Math.round(Math.max(0, Math.min(1, evenness)) * 100);
}

// ---------- Filtering & sorting ----------

export type SortKey = "name" | "attack" | "defense" | "stamina" | "weight" | "burstResistance" | "dash" | "releaseDate";

export interface BeyFilters {
  query: string;
  types: BeyType[];
  lines: ProductLine[];
  spin: SpinDirection | "any";
  weightMin: number;
  weightMax: number;
  sort: SortKey;
  direction: "asc" | "desc";
}

export const WEIGHT_BOUNDS = { min: 30, max: 55 } as const;

export const DEFAULT_FILTERS: BeyFilters = {
  query: "",
  types: [],
  lines: [],
  spin: "any",
  weightMin: WEIGHT_BOUNDS.min,
  weightMax: WEIGHT_BOUNDS.max,
  sort: "name",
  direction: "asc",
};

function searchableText(bey: Beyblade) {
  const partNames = Object.values(bey.resolvedParts).map((p) => `${p.name} ${p.abbreviation ?? ""}`);
  return [bey.fullName, bey.name.replace(/\s/g, ""), bey.productCode, bey.comboCode, bey.hasbroName ?? "", bey.type, ...partNames]
    .join(" ")
    .toLowerCase();
}

export function filterBeyblades(beys: Beyblade[], filters: BeyFilters): Beyblade[] {
  const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const result = beys.filter((bey) => {
    if (filters.types.length && !filters.types.includes(bey.type)) return false;
    if (filters.lines.length && !filters.lines.includes(bey.line)) return false;
    if (filters.spin !== "any" && bey.spinDirection !== filters.spin) return false;
    if (bey.stats.weight < filters.weightMin || bey.stats.weight > filters.weightMax) return false;
    if (terms.length) {
      const text = searchableText(bey);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });
  const dir = filters.direction === "asc" ? 1 : -1;
  return result.sort((a, b) => {
    let cmp: number;
    if (filters.sort === "name") cmp = a.fullName.localeCompare(b.fullName);
    else if (filters.sort === "releaseDate") cmp = a.releaseDate.localeCompare(b.releaseDate);
    else cmp = a.stats[filters.sort] - b.stats[filters.sort];
    return cmp * dir || a.fullName.localeCompare(b.fullName);
  });
}
