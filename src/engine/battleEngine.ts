import type {
  BattleEvent,
  BattleFrame,
  BattleResult,
  BattleStatistics,
  BeyBattleStats,
  BeyFrame,
  BeyIndex,
  EngineBey,
  FinishType,
  LaunchConditions,
} from "@/types/battle";
import { BEY_STATE } from "@/types/battle";
import { typeMatchups as defaultMatchups, type TypeMatchupTable } from "@/data/matchups";
import { createRng, type Rng } from "./random";
import { ENGINE_VERSION, SIM_CONFIG } from "./config";
import {
  applyStadiumForces,
  bounceOffWall,
  deriveBeyParams,
  detectWallContact,
  isOnRail,
  momentumOf,
  orbitTangent,
  type BeyParams,
  type BeyState,
} from "./physics";
import { applySpinDecay } from "./spinDecay";
import { calculateCollisionOutcome } from "./collision";
import { calculateBurstProbability, calculateKnockoutProbability, determineFinish } from "./finishDetector";

export interface SimulateBattleInput {
  beys: [EngineBey, EngineBey];
  seed: string;
  matchups?: TypeMatchupTable;
}

const EVENT_LABELS = {
  LAUNCH: "Launch",
  FIRST_CONTACT: "First Contact",
  COLLISION: "Contact",
  DIRECT_HIT: "Direct Hit",
  HEAVY_IMPACT: "Massive Impact",
  XTREME_DASH: "Xtreme Dash",
  COUNTER: "Counter Attack",
  BURST_FINISH: "Burst Finish",
  KNOCKOUT_FINISH: "Knockout Finish",
  XTREME_FINISH: "Xtreme Finish",
  SURVIVOR_FINISH: "Survivor Finish",
} as const;

/** Random launch: power, tilt and starting spot on each side of the stadium. */
export function createLaunchConditions(rng: Rng, side: BeyIndex): LaunchConditions {
  const { minPower, maxPower, maxAngle } = SIM_CONFIG.launch;
  const x = rng.range(0.35, 0.6);
  return {
    power: rng.range(minPower, maxPower),
    angle: rng.signed() * maxAngle,
    startX: side === 0 ? -x : x,
    startY: rng.signed() * 0.3,
  };
}

/** Initial spin and orbit velocity from launch power; tilt becomes initial wobble. */
export function calculateInitialMomentum(params: BeyParams, launch: LaunchConditions, rng: Rng): BeyState {
  const state: BeyState = {
    x: launch.startX,
    y: launch.startY,
    vx: 0,
    vy: 0,
    spin: launch.power * rng.range(0.96, 1),
    wobble: (Math.abs(launch.angle) / SIM_CONFIG.launch.maxAngle) * 0.35,
    dashTimer: 0,
    dashCooldown: 0.4,
    ratchetClicks: 0,
    active: true,
    lastHitAt: -10,
  };
  const { tx, ty } = orbitTangent(state, params);
  const speed = launch.power * (0.9 + params.aggression * 0.5);
  state.vx = tx * speed + rng.signed() * 0.2;
  state.vy = ty * speed + rng.signed() * 0.2;
  return state;
}

/**
 * Xtreme Dash: while riding the rail with enough speed, gear bits may catch the Xtreme Line
 * and accelerate hard along it. Returns true when a new dash begins this step.
 */
export function calculateXtremeDash(state: BeyState, params: BeyParams, rng: Rng, dt: number): boolean {
  const c = SIM_CONFIG.dash;
  const { tx, ty } = orbitTangent(state, params);
  if (state.dashTimer > 0) {
    state.vx += tx * c.accel * (0.6 + params.dash) * state.spin * dt;
    state.vy += ty * c.accel * (0.6 + params.dash) * state.spin * dt;
    state.dashTimer -= dt;
    if (state.dashTimer <= 0) {
      // Leave the rail and cut back across the stadium.
      const { exitCos, exitSin } = c;
      const r = Math.sqrt(state.x * state.x + state.y * state.y) || 1;
      const inx = -state.x / r;
      const iny = -state.y / r;
      const speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);
      const vxn = state.vx / (speed || 1);
      const vyn = state.vy / (speed || 1);
      state.vx = (vxn * exitCos + inx * exitSin) * speed;
      state.vy = (vyn * exitCos + iny * exitSin) * speed;
      state.dashCooldown = c.cooldown;
    }
    return false;
  }
  if (state.dashCooldown > 0) {
    state.dashCooldown -= dt;
    return false;
  }
  if (!isOnRail(state) || state.spin < 0.2) return false;
  const railSpeed = state.vx * tx + state.vy * ty;
  if (railSpeed < c.minRailSpeed) return false;
  if (!rng.chance((c.baseChance + params.dash * c.dashChance) * state.spin * dt)) return false;
  state.dashTimer = rng.range(c.minDuration, c.maxDuration) * (0.7 + params.dash * 0.4);
  return true;
}

function emptyBeyStats(): BeyBattleStats {
  return { hitsLanded: 0, xtremeDashes: 0, counters: 0, ratchetClicks: 0, spinLoss: 0, maxMomentum: 0, finalSpin: 0 };
}

const round = (v: number, digits = 3) => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

export function simulateBattle(input: SimulateBattleInput): BattleResult {
  const { beys, seed } = input;
  const matchups = input.matchups ?? defaultMatchups;
  const rng = createRng(`${seed}:${beys[0].id}:${beys[1].id}`);
  const { dt, frameEvery, maxDuration, postFinishDuration } = SIM_CONFIG;
  const params: [BeyParams, BeyParams] = [
    deriveBeyParams(beys[0], rng.range(0.88, 1.12)),
    deriveBeyParams(beys[1], rng.range(0.88, 1.12)),
  ];
  const types = [beys[0].type, beys[1].type] as [EngineBey["type"], EngineBey["type"]];
  const launch: [LaunchConditions, LaunchConditions] = [createLaunchConditions(rng, 0), createLaunchConditions(rng, 1)];
  const states: [BeyState, BeyState] = [
    calculateInitialMomentum(params[0], launch[0], rng),
    calculateInitialMomentum(params[1], launch[1], rng),
  ];
  const initialSpin = [states[0].spin, states[1].spin];

  const events: BattleEvent[] = [{ t: 0, type: "LAUNCH", label: EVENT_LABELS.LAUNCH }];
  const frames: BattleFrame[] = [];
  const perBey: [BeyBattleStats, BeyBattleStats] = [emptyBeyStats(), emptyBeyStats()];
  const stats: Omit<BattleStatistics, "perBey"> = {
    collisions: 0,
    heavyHits: 0,
    directHits: 0,
    xtremeDashes: 0,
    counters: 0,
    burstAttempts: 0,
    burstEvents: 0,
    knockoutEvents: 0,
  };
  const frameState = [BEY_STATE.Active, BEY_STATE.Active] as [BeyFrame["state"], BeyFrame["state"]];

  let finish: { loser: BeyIndex; type: FinishType; t: number; selfKo: boolean } | null = null;
  let lastCollisionAt = -1;
  let step = 0;

  const endBattle = (loser: BeyIndex, type: FinishType, t: number, x?: number, y?: number) => {
    const winner = (1 - loser) as BeyIndex;
    const selfKo = (type === "KNOCKOUT" || type === "XTREME") && t - states[loser].lastHitAt > 0.8;
    finish = { loser, type, t, selfKo };
    for (const i of [0, 1] as const) {
      perBey[i].finalSpin = round(states[i].spin);
      perBey[i].spinLoss = round(initialSpin[i] - states[i].spin);
    }
    const eventType = `${type}_FINISH` as const;
    events.push({ t, type: eventType, actor: winner, target: loser, x, y, intensity: 3, label: EVENT_LABELS[eventType] });
    if (type === "KNOCKOUT" || type === "XTREME") {
      stats.knockoutEvents += 1;
      frameState[loser] = BEY_STATE.Out;
    } else if (type === "BURST") {
      stats.burstEvents += 1;
      frameState[loser] = BEY_STATE.Burst;
    } else {
      frameState[loser] = BEY_STATE.Stopped;
    }
    states[loser].active = false;
  };

  const recordFrame = (t: number) => {
    frames.push({
      t: round(t, 4),
      beys: [0, 1].map((i) => {
        const s = states[i];
        const momentum = Math.min(1, momentumOf(s, params[i]) / SIM_CONFIG.momentumRef);
        if (!finish && momentum > perBey[i].maxMomentum) perBey[i].maxMomentum = round(momentum);
        return {
          x: round(s.x, 4),
          y: round(s.y, 4),
          spin: round(s.spin),
          momentum: round(momentum),
          wobble: round(s.wobble),
          dashing: s.dashTimer > 0,
          state: frameState[i],
        };
      }) as [BeyFrame, BeyFrame],
    });
  };

  recordFrame(0);

  while (true) {
    step += 1;
    const t = step * dt;
    const done = finish as { t: number } | null;
    if (done && t > done.t + postFinishDuration) break;

    for (const i of [0, 1] as const) {
      const s = states[i];
      const p = params[i];
      if (!s.active) {
        // Knocked-out / burst / stopped Beys coast to a halt.
        const drag = frameState[i] === BEY_STATE.Out ? 1.2 : 6;
        s.vx -= s.vx * drag * dt;
        s.vy -= s.vy * drag * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const r = Math.sqrt(s.x * s.x + s.y * s.y);
        const maxR = frameState[i] === BEY_STATE.Out ? 1.24 : SIM_CONFIG.stadium.wallRadius - SIM_CONFIG.stadium.beyRadius;
        if (r > maxR) {
          s.x *= maxR / r;
          s.y *= maxR / r;
          s.vx *= 0.2;
          s.vy *= 0.2;
        }
        s.spin = Math.max(0, s.spin - (frameState[i] === BEY_STATE.Out ? 0.25 : 1) * dt);
        s.wobble = Math.min(1, s.wobble + dt);
        continue;
      }

      applyStadiumForces(s, p, rng, dt, finish ? undefined : states[1 - i]);
      if (calculateXtremeDash(s, p, rng, dt) && !finish) {
        stats.xtremeDashes += 1;
        perBey[i].xtremeDashes += 1;
        events.push({ t, type: "XTREME_DASH", actor: i, x: s.x, y: s.y, intensity: 1.5, label: EVENT_LABELS.XTREME_DASH });
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const contact = detectWallContact(s);
      if (contact) {
        // Beys are still settling right after launch, so early pocket finishes are rarer.
        const settle = t < 1.5 ? t / 1.5 : 1;
        const koChance = finish ? 0 : calculateKnockoutProbability(contact, p) * settle;
        if (koChance > 0 && rng.chance(koChance)) {
          endBattle(i, contact.pocket === "xtreme" ? "XTREME" : "KNOCKOUT", t, s.x, s.y);
        } else {
          const impact = bounceOffWall(s);
          s.spin = Math.max(0, s.spin - impact * 0.004);
          if (s.dashTimer > 0 && impact > 0.8) s.dashTimer = 0;
        }
      }

      s.ratchetClicks = Math.max(0, s.ratchetClicks - SIM_CONFIG.burst.relockRate * s.spin * dt);
      applySpinDecay(s, p, dt);
    }

    if (!finish && states[0].active && states[1].active) {
      const allowImpulse = t - lastCollisionAt > SIM_CONFIG.collision.pairCooldown;
      const outcome = calculateCollisionOutcome(states, params, types, matchups, rng, allowImpulse);
      if (outcome && outcome.strength >= SIM_CONFIG.collision.minEventStrength) {
        lastCollisionAt = t;
        stats.collisions += 1;
        states[0].lastHitAt = t;
        states[1].lastHitAt = t;
        const dominant = outcome.dominant;
        const other = (1 - dominant) as BeyIndex;
        perBey[dominant].hitsLanded += 1;

        const base = { t, actor: dominant, target: other, x: outcome.x, y: outcome.y, intensity: round(outcome.strength) };
        if (stats.collisions === 1) {
          events.push({ ...base, type: "FIRST_CONTACT", label: EVENT_LABELS.FIRST_CONTACT });
        } else if (outcome.heavy) {
          stats.heavyHits += 1;
          events.push({ ...base, type: "HEAVY_IMPACT", label: EVENT_LABELS.HEAVY_IMPACT });
        } else if (outcome.counter) {
          stats.counters += 1;
          perBey[dominant].counters += 1;
          events.push({ ...base, type: "COUNTER", label: EVENT_LABELS.COUNTER });
        } else if (outcome.directHit) {
          stats.directHits += 1;
          events.push({ ...base, type: "DIRECT_HIT", label: EVENT_LABELS.DIRECT_HIT });
        } else {
          events.push({ ...base, type: "COLLISION", label: EVENT_LABELS.COLLISION });
        }
        if (outcome.heavy && stats.collisions === 1) stats.heavyHits += 1;

        for (const i of [0, 1] as const) {
          const received = outcome.knockback[i];
          const chance = calculateBurstProbability(received, params[i], states[i]);
          if (chance > 0 && rng.chance(chance)) {
            stats.burstAttempts += 1;
            perBey[i].ratchetClicks += 1;
            states[i].ratchetClicks += 1;
            if (states[i].ratchetClicks >= SIM_CONFIG.burst.clicksToBurst) {
              endBattle(i, "BURST", t, states[i].x, states[i].y);
              break;
            }
          }
        }
      }
    }

    if (!finish) {
      const spinFinish = determineFinish(states);
      if (spinFinish) endBattle(spinFinish.loser, spinFinish.finishType, t, states[spinFinish.loser].x, states[spinFinish.loser].y);
      else if (t >= maxDuration) {
        const loser: BeyIndex = states[0].spin <= states[1].spin ? 0 : 1;
        endBattle(loser, "SURVIVOR", t, states[loser].x, states[loser].y);
      }
    }

    if (step % frameEvery === 0) recordFrame(t);
  }

  const final = finish as unknown as { loser: BeyIndex; type: FinishType; t: number; selfKo: boolean };
  const winnerIndex = (1 - final.loser) as BeyIndex;
  return {
    engineVersion: ENGINE_VERSION,
    seed,
    beyIds: [beys[0].id, beys[1].id],
    names: [beys[0].name, beys[1].name],
    winnerId: beys[winnerIndex].id,
    loserId: beys[final.loser].id,
    winnerIndex,
    finishType: final.type,
    duration: round(final.t, 2),
    selfKnockout: final.selfKo,
    events,
    frames,
    frameInterval: dt * frameEvery,
    launch: launch.map((l) => ({
      power: round(l.power),
      angle: round(l.angle, 1),
      startX: round(l.startX),
      startY: round(l.startY),
    })) as [LaunchConditions, LaunchConditions],
    statistics: { ...stats, perBey },
  };
}
