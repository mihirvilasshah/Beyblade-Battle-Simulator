import type { BeyType, SpinDirection } from "@/types/beyblade";

/** Generates an original, stylised top-down blade outline (unit radius) from type + blade count. */
const PROFILES: Record<BeyType, (phi: number) => number> = {
  attack: (phi) => {
    const f = phi < 0.72 ? Math.pow(phi / 0.72, 1.7) : Math.max(0, 1 - (phi - 0.72) / 0.1);
    return 0.64 + 0.36 * f;
  },
  defense: (phi) => 0.8 + 0.17 * Math.pow(Math.sin(Math.PI * phi), 0.55),
  stamina: (phi) => 0.7 + 0.29 * Math.pow(Math.sin(Math.PI * phi), 0.35),
  balance: (phi) => {
    const hook = phi < 0.6 ? Math.pow(phi / 0.6, 1.3) : Math.max(0, 1 - (phi - 0.6) / 0.18);
    return 0.72 + 0.14 * hook + 0.12 * Math.pow(Math.sin(Math.PI * phi), 0.7);
  },
};

const cache = new Map<string, string>();

/** Blade outline as [x, y] points on a unit circle (y down, like SVG). */
export function bladePoints(type: BeyType, blades: number, spin: SpinDirection): [number, number][] {
  const samples = blades === 1 ? 48 : Math.max(10, Math.round(72 / blades));
  const profile = PROFILES[type];
  const points: [number, number][] = [];
  const seg = (Math.PI * 2) / blades;
  for (let i = 0; i < blades; i++) {
    for (let j = 0; j < samples; j++) {
      const phi = j / samples;
      const r = profile(spin === "right" ? phi : 1 - phi);
      const a = i * seg + phi * seg - Math.PI / 2;
      points.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  return points;
}

export function bladePath(type: BeyType, blades: number, spin: SpinDirection): string {
  const key = `${type}-${blades}-${spin}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const points = bladePoints(type, blades, spin).map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`);
  const path = `M${points.join("L")}Z`;
  cache.set(key, path);
  return path;
}

/** Ratchet teeth as short radial segments. */
export function ratchetTeethPath(count: number, inner = 0.34, outer = 0.46): string {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    parts.push(`M${(c * inner).toFixed(3)} ${(s * inner).toFixed(3)}L${(c * outer).toFixed(3)} ${(s * outer).toFixed(3)}`);
  }
  return parts.join("");
}

export function ratchetTeethCount(ratchetName: string | undefined) {
  const n = Number(ratchetName?.split("-")[0]);
  return Number.isFinite(n) && n > 0 ? n : 5;
}
