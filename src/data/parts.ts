import type { Part, PartCategory } from "@/types/beyblade";
import blades from "@data/parts/blades.json";
import lockChips from "@data/parts/lock-chips.json";
import mainBlades from "@data/parts/main-blades.json";
import assistBlades from "@data/parts/assist-blades.json";
import overBlades from "@data/parts/over-blades.json";
import metalBlades from "@data/parts/metal-blades.json";
import ratchets from "@data/parts/ratchets.json";
import bits from "@data/parts/bits.json";

export const partsByCategory: Record<PartCategory, Part[]> = {
  blade: blades as Part[],
  lockChip: lockChips as Part[],
  mainBlade: mainBlades as Part[],
  assistBlade: assistBlades as Part[],
  overBlade: overBlades as Part[],
  metalBlade: metalBlades as Part[],
  ratchet: ratchets as Part[],
  bit: bits as Part[],
};

export const allParts: Part[] = Object.values(partsByCategory).flat();

export const PART_CATEGORY_LABELS: Record<PartCategory, string> = {
  blade: "Blade",
  lockChip: "Lock Chip",
  mainBlade: "Main Blade",
  assistBlade: "Assist Blade",
  overBlade: "Over Blade",
  metalBlade: "Metal Blade",
  ratchet: "Ratchet",
  bit: "Bit",
};

/** Display order of parts from top of the Beyblade to the tip. */
export const PART_ORDER: PartCategory[] = [
  "lockChip",
  "overBlade",
  "blade",
  "mainBlade",
  "metalBlade",
  "assistBlade",
  "ratchet",
  "bit",
];
