export type BeyType = "attack" | "defense" | "stamina" | "balance";
export type ProductLine = "BX" | "UX" | "CX";
export type SpinDirection = "right" | "left";

export type PartCategory =
  | "blade"
  | "lockChip"
  | "mainBlade"
  | "assistBlade"
  | "overBlade"
  | "metalBlade"
  | "ratchet"
  | "bit";

/**
 * official            – published by the manufacturer and read directly from an official page
 * official-catalogued – manufacturer figures, transcribed by a community database
 * community           – community-measured / community-maintained values
 * derived             – computed by this application
 */
export type SourceKind = "official" | "official-catalogued" | "community" | "derived";

export interface SourceRef {
  sourceId: string;
  url: string;
  kind: SourceKind;
  fields: string[];
  note?: string;
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  usedFor: string;
  license: string;
}

export interface PartStats {
  attack: number | null;
  defense: number | null;
  stamina: number | null;
  dash?: number | null;
  burstResistance?: number | null;
}

export interface Part {
  id: string;
  category: PartCategory;
  name: string;
  abbreviation?: string;
  type: BeyType | null;
  weight: number | null;
  /** Ratchet height code (e.g. 60 = 6.0 mm) or assist blade height spec. */
  height?: number | null;
  stats: PartStats;
  debutProductCode: string | null;
  notes?: string;
  sources: SourceRef[];
}

export type PartSlots = Partial<Record<PartCategory, string>> & { ratchet: string; bit: string };
export type ResolvedParts = Partial<Record<PartCategory, Part>> & { ratchet: Part; bit: Part };

export interface BeyVisual {
  primary: string;
  secondary: string;
  accent: string;
  blades: number;
}

/** Shape of a record in data/beyblades/*.json */
export interface BeybladeRecord {
  id: string;
  name: string;
  fullName: string;
  comboCode: string;
  hasbroName: string | null;
  productCode: string;
  series: string;
  line: ProductLine;
  type: BeyType;
  spinDirection: SpinDirection;
  weight: number | null;
  parts: PartSlots;
  releaseDate: string;
  description: string;
  image: string | null;
  visual: BeyVisual;
  sources: SourceRef[];
}

export interface ComboStats {
  attack: number;
  defense: number;
  stamina: number;
  dash: number;
  burstResistance: number;
  weight: number;
  height: number;
}

/** A Beyblade with its parts resolved and combined stats computed. */
export interface Beyblade extends BeybladeRecord {
  resolvedParts: ResolvedParts;
  stats: ComboStats;
  /** Stat keys that include a derived estimate because a part spec is unavailable. */
  estimated: (keyof ComboStats)[];
}

export type StatKey = "attack" | "defense" | "stamina" | "dash" | "burstResistance" | "weight";
