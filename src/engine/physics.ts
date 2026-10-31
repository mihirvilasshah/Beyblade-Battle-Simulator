import type { EngineBey } from "@/types/battle";
import type { Rng } from "./random";
import { POCKETS, SIM_CONFIG, type PocketKind } from "./config";

// Only +, -, *, / and sqrt are used in the simulation loop: these are exactly specified by
// IEEE-754, which keeps seeded replays identical across browsers.

export interface BeyParams {
  mass: number;
  attack: number;
  defense: number;
  stamina: number;
  dash: number;
  burstResistance: number;
  /** How strongly the bit tip grips the floor / rail. */
  grip: number;
  /** Self-propelled movement tendency. */
  aggression: number;
  /** Tendency to hold its position (sharp / defensive tips). */
  centerHold: number;
  /** -1 or 1: direction the Bey orbits the stadium. */
  orbitSign: number;
  /** Ratchet height in tenths of a millimetre. */
  height: number;
  /** Per-battle spin-decay multiplier (tip wear, launch quality, stadium condition). */
  condition: number;
}

export interface BeyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  wobble: number;
  dashTimer: number;
  dashCooldown: number;
  ratchetClicks: number;
  active: boolean;
  lastHitAt: number;
}

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

export function deriveBeyParams(bey: EngineBey, condition = 1): BeyParams {
  const s = bey.stats;
  const attack = s.attack / 100;
  const defense = s.defense / 100;
  const stamina = s.stamina / 100;
  const dash = s.dash / 50;
  return {
    mass: s.weight / 45,
    attack,
    defense,
    stamina,
    dash,
    burstResistance: s.burstResistance / 100,
    grip: 0.2 + dash * 0.9,
    aggression: clamp(attack * 0.55 + dash * 0.7 - defense * 0.15, 0.1, 1.4),
    centerHold: clamp(defense * 0.55 + (1 - dash) * 0.35, 0.1, 1.2),
    orbitSign: bey.spinDirection === "right" ? -1 : 1,
    height: s.height,
    condition,
  };
}

export function speedOf(state: BeyState) {
  return Math.sqrt(state.vx * state.vx + state.vy * state.vy);
}

export function momentumOf(state: BeyState, params: BeyParams) {
  return speedOf(state) * params.mass;
}

/** Unit tangent in the Bey's orbit direction at its current position. */
export function orbitTangent(state: BeyState, params: BeyParams) {
  const r = Math.sqrt(state.x * state.x + state.y * state.y) || 1e-6;
  return { tx: (-state.y / r) * params.orbitSign, ty: (state.x / r) * params.orbitSign, r };
}

export function isOnRail(state: BeyState) {
  const r = Math.sqrt(state.x * state.x + state.y * state.y);
  return r + SIM_CONFIG.stadium.beyRadius > SIM_CONFIG.stadium.railRadius;
}

/** Bowl slope, tip propulsion, contact seeking, wander and floor friction. Mutates velocity. */
export function applyStadiumForces(state: BeyState, params: BeyParams, rng: Rng, dt: number, opponent?: BeyState) {
  const { stadium, movement } = SIM_CONFIG;
  const { tx, ty, r } = orbitTangent(state, params);
  const rx = state.x / r;
  const ry = state.y / r;
  const s = state.spin;

  const pull = stadium.bowlPull * r * (0.6 + r);
  let ax = -rx * pull;
  let ay = -ry * pull;

  // The tip drives the Bey along its path; with the bowl pulling inward this traces a flower pattern.
  const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
  const vxn = speed > 0.05 ? state.vx / speed : tx;
  const vyn = speed > 0.05 ? state.vy / speed : ty;
  const drive = params.aggression * params.grip * s * movement.tipDrive;
  ax += (vxn * 0.8 + tx * 0.2) * drive;
  ay += (vyn * 0.8 + ty * 0.2) * drive;

  // Contact frequency: the stadium funnels aggressive Beys into their opponent's path.
  if (opponent?.active && params.aggression > 0.35) {
    const ox = opponent.x - state.x;
    const oy = opponent.y - state.y;
    const od = Math.sqrt(ox * ox + oy * oy) || 1;
    const seek = movement.seek * (params.aggression - 0.35) * s;
    ax += (ox / od) * seek;
    ay += (oy / od) * seek;
  }

  const drift = params.aggression * movement.outwardDrift * s * (1 - r);
  ax += rx * drift;
  ay += ry * drift;

  const wander = movement.wander * (0.4 + state.wobble * 2.5) * (0.5 + params.aggression * 0.5);
  ax += rng.signed() * wander;
  ay += rng.signed() * wander;

  const damping = movement.baseDamping + params.centerHold * movement.holdDamping * (1 - r * 0.5) + (1 - s) * 0.4;
  state.vx += (ax - state.vx * damping) * dt;
  state.vy += (ay - state.vy * damping) * dt;

  // Near the rim, aggressive tips periodically cut back across the stadium (flower pattern),
  // usually through the area the opponent occupies.
  if (r > movement.cutRadius && state.dashTimer <= 0 && rng.chance(params.aggression * movement.cutRate * s * dt)) {
    const v = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
    if (v > 0.2) {
      const aim = opponent?.active ? rng.range(0.8, 1) : 0;
      let tx2 = (opponent ? opponent.x : 0) * aim + rng.signed() * 0.12 - state.x;
      let ty2 = (opponent ? opponent.y : 0) * aim + rng.signed() * 0.12 - state.y;
      const tl = Math.sqrt(tx2 * tx2 + ty2 * ty2) || 1;
      tx2 /= tl;
      ty2 /= tl;
      const k = rng.range(0.75, 1);
      const dx = (state.vx / v) * (1 - k) + tx2 * k;
      const dy = (state.vy / v) * (1 - k) + ty2 * k;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      state.vx = (dx / len) * v;
      state.vy = (dy / len) * v;
    }
  }
}

export interface WallContact {
  pocket: PocketKind | null;
  outwardSpeed: number;
}

/** Returns contact info if the Bey reached the wall this step, without resolving it. */
export function detectWallContact(state: BeyState): WallContact | null {
  const limit = SIM_CONFIG.stadium.wallRadius - SIM_CONFIG.stadium.beyRadius;
  const r2 = state.x * state.x + state.y * state.y;
  if (r2 < limit * limit) return null;
  const r = Math.sqrt(r2);
  const ux = state.x / r;
  const uy = state.y / r;
  const outwardSpeed = state.vx * ux + state.vy * uy;
  const pocket = POCKETS.find((p) => ux * p.dirX + uy * p.dirY >= p.minDot)?.kind ?? null;
  return { pocket, outwardSpeed };
}

/** Bounce off the stadium wall. Returns impact speed. */
export function bounceOffWall(state: BeyState) {
  const limit = SIM_CONFIG.stadium.wallRadius - SIM_CONFIG.stadium.beyRadius;
  const r = Math.sqrt(state.x * state.x + state.y * state.y);
  const ux = state.x / r;
  const uy = state.y / r;
  state.x = ux * limit;
  state.y = uy * limit;
  const vr = state.vx * ux + state.vy * uy;
  if (vr > 0) {
    const k = 1 + SIM_CONFIG.stadium.wallRestitution;
    state.vx -= k * vr * ux;
    state.vy -= k * vr * uy;
  }
  return vr > 0 ? vr : 0;
}
