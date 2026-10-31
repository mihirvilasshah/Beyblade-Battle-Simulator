import type { BeyIndex } from "@/types/battle";
import type { BeyType } from "@/types/beyblade";
import type { MatchupModifier, TypeMatchupTable } from "@/data/matchups";
import type { Rng } from "./random";
import { SIM_CONFIG } from "./config";
import type { BeyParams, BeyState } from "./physics";

export interface CollisionOutcome {
  x: number;
  y: number;
  approachSpeed: number;
  /** Combined violence of the contact. */
  strength: number;
  /** Velocity change applied to each Bey. */
  knockback: [number, number];
  /** Bey that drove into the other. */
  initiator: BeyIndex;
  /** Bey that came out on top of the exchange (pushed the other harder). */
  dominant: BeyIndex;
  counter: boolean;
  heavy: boolean;
  directHit: boolean;
  spinLoss: [number, number];
}

/** Striking power a Bey delivers: spin, attack spec, weight, matchup and whether it is mid-dash. */
export function calculateAttackImpact(attacker: BeyParams, state: BeyState, matchup: MatchupModifier, rng: Rng) {
  const dashBoost = state.dashTimer > 0 ? 1.55 : 1;
  return (
    state.spin *
    (0.35 + attacker.attack * 0.9) *
    (0.85 + attacker.mass * 0.15) *
    matchup.impact *
    dashBoost *
    rng.range(0.8, 1.2)
  );
}

/** How well a Bey resists being pushed: weight, defense spec and spin-driven stability. */
export function calculateDefenseResistance(params: BeyParams, state: BeyState) {
  return params.mass * (0.55 + params.defense * 0.75) * (0.7 + state.spin * 0.3) * (1 + (1 - state.wobble) * 0.1);
}

/**
 * Resolves contact between two Beys. Mutates positions (always) and velocities / spin
 * (when `allowImpulse`). Returns null if they are not touching or not closing in.
 */
export function calculateCollisionOutcome(
  states: [BeyState, BeyState],
  params: [BeyParams, BeyParams],
  types: [BeyType, BeyType],
  matchups: TypeMatchupTable,
  rng: Rng,
  allowImpulse: boolean,
): CollisionOutcome | null {
  const cfg = SIM_CONFIG.collision;
  const [a, b] = states;
  const [pa, pb] = params;
  const minDist = SIM_CONFIG.stadium.beyRadius * 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= minDist * minDist) return null;

  const dist = Math.sqrt(d2) || 1e-6;
  const nx = dx / dist;
  const ny = dy / dist;
  const totalMass = pa.mass + pb.mass;
  const overlap = minDist - dist;
  a.x -= nx * overlap * (pb.mass / totalMass);
  a.y -= ny * overlap * (pb.mass / totalMass);
  b.x += nx * overlap * (pa.mass / totalMass);
  b.y += ny * overlap * (pa.mass / totalMass);

  const approachA = a.vx * nx + a.vy * ny;
  const approachB = -(b.vx * nx + b.vy * ny);
  const approach = approachA + approachB;
  if (!allowImpulse || approach <= 0.02) return null;

  const impulse = ((1 + cfg.restitution) * approach) / (1 / pa.mass + 1 / pb.mass);
  const sameSpin = pa.orbitSign === pb.orbitSign;
  const energy = approach * 0.55 + (a.spin + b.spin) * 0.5 * cfg.smash * (sameSpin ? 1 : cfg.oppositeSpinSmash);

  const mAB = matchups[types[0]][types[1]];
  const mBA = matchups[types[1]][types[0]];
  const powerA = calculateAttackImpact(pa, a, mAB, rng);
  const powerB = calculateAttackImpact(pb, b, mBA, rng);
  const resA = calculateDefenseResistance(pa, a);
  const resB = calculateDefenseResistance(pb, b);

  const recoilA = (energy * powerA * cfg.recoil) / (pa.mass * (0.5 + pa.defense * 0.6));
  const recoilB = (energy * powerB * cfg.recoil) / (pb.mass * (0.5 + pb.defense * 0.6));
  const knockB = (energy * powerA * mAB.knockback) / resB + recoilB;
  const knockA = (energy * powerB * mBA.knockback) / resA + recoilA;

  // Blade spin deflects the push sideways. Right spin = clockwise on screen.
  const spinA = -pa.orbitSign;
  const spinB = -pb.orbitSign;
  const { deflectCos: c, deflectSin: s } = cfg;
  const dirBx = nx * c + -ny * s * spinA;
  const dirBy = ny * c + nx * s * spinA;
  const dirAx = -nx * c + ny * s * spinB;
  const dirAy = -ny * c + -nx * s * spinB;

  a.vx += (-nx * impulse) / pa.mass + dirAx * knockA;
  a.vy += (-ny * impulse) / pa.mass + dirAy * knockA;
  b.vx += (nx * impulse) / pb.mass + dirBx * knockB;
  b.vy += (ny * impulse) / pb.mass + dirBy * knockB;

  const strength = (knockA + knockB) * 0.5 + impulse * 0.3;
  let lossA = (strength * cfg.spinLoss * mBA.spinDrain) / (0.6 + pa.defense * 0.4 + pa.stamina * 0.3);
  let lossB = (strength * cfg.spinLoss * mAB.spinDrain) / (0.6 + pb.defense * 0.4 + pb.stamina * 0.3);
  if (!sameSpin) {
    // Opposite-spin contact grinds; the Bey with less stamina suffers more.
    const grind = strength * 0.012;
    lossA += grind * (pb.stamina > pa.stamina ? 1.4 : 0.7);
    lossB += grind * (pa.stamina > pb.stamina ? 1.4 : 0.7);
  }
  lossA = Math.min(a.spin, lossA * rng.range(0.85, 1.15));
  lossB = Math.min(b.spin, lossB * rng.range(0.85, 1.15));
  a.spin -= lossA;
  b.spin -= lossB;
  a.wobble = Math.min(1, a.wobble + (strength * 0.035) / (0.5 + pa.defense));
  b.wobble = Math.min(1, b.wobble + (strength * 0.035) / (0.5 + pb.defense));

  const initiator: BeyIndex = approachA >= approachB ? 0 : 1;
  const dominant: BeyIndex = knockB >= knockA ? 0 : 1;
  const heavy = strength > cfg.heavyThreshold;
  const counter = !heavy && initiator !== dominant && strength > cfg.counterThreshold;
  const directHit = !heavy && !counter && strength > cfg.directHitThreshold;

  return {
    x: a.x + nx * SIM_CONFIG.stadium.beyRadius,
    y: a.y + ny * SIM_CONFIG.stadium.beyRadius,
    approachSpeed: approach,
    strength,
    knockback: [knockA, knockB],
    initiator,
    dominant,
    counter,
    heavy,
    directHit,
    spinLoss: [lossA, lossB],
  };
}
