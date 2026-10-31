/**
 * Seeded PRNG. Uses only integer ops so the same seed yields the same sequence in every JS engine.
 */

/** cyrb53-style string hash folded to a 32-bit seed. */
export function hashSeed(seed: string): number {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  range(min: number, max: number): number;
  chance(probability: number): boolean;
  /** Symmetric noise in [-1, 1]. */
  signed(): number;
}

export function createRng(seed: string): Rng {
  let state = hashSeed(seed);
  const next = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    chance: (p) => next() < p,
    signed: () => next() * 2 - 1,
  };
}

const SEED_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/** Human-friendly random seed, e.g. "k7qm-x2ra". */
export function generateSeed(): string {
  const bytes = new Uint8Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export function isValidSeed(seed: unknown): seed is string {
  return typeof seed === "string" && /^[a-z0-9-]{1,32}$/i.test(seed);
}
