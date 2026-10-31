import type { Beyblade, DataSource, Part } from "@/types/beyblade";
import { beybladeRecords } from "./beyblades";
import { allParts } from "./parts";
import { typeMatchups, type TypeMatchupTable } from "./matchups";
import { dataSources } from "./sources";
import { computeCategoryAverages, resolveBeyblade } from "@/utils/calculations";

/**
 * Data access layer. UI code depends only on this interface, so the static JSON
 * implementation can be swapped for PostgreSQL / Supabase / Firebase later.
 */
export interface BeybladeRepository {
  listBeyblades(): Promise<Beyblade[]>;
  getBeyblade(id: string): Promise<Beyblade | null>;
  listParts(): Promise<Part[]>;
  getMatchups(): Promise<TypeMatchupTable>;
  listSources(): Promise<DataSource[]>;
}

function createStaticRepository(): BeybladeRepository {
  let cache: { beys: Beyblade[]; byId: Map<string, Beyblade> } | null = null;

  const load = () => {
    if (cache) return cache;
    const partsById = new Map(allParts.map((p) => [p.id, p]));
    const averages = computeCategoryAverages(allParts);
    const beys = beybladeRecords.map((r) => resolveBeyblade(r, partsById, averages));
    cache = { beys, byId: new Map(beys.map((b) => [b.id, b])) };
    return cache;
  };

  return {
    async listBeyblades() {
      return load().beys;
    },
    async getBeyblade(id) {
      return load().byId.get(id) ?? null;
    },
    async listParts() {
      return allParts;
    },
    async getMatchups() {
      return typeMatchups;
    },
    async listSources() {
      return dataSources;
    },
  };
}

export const repository: BeybladeRepository = createStaticRepository();
