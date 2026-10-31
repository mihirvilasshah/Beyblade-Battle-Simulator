import type { BeyType, ComboStats, SpinDirection } from "./beyblade";

export type FinishType = "SURVIVOR" | "KNOCKOUT" | "BURST" | "XTREME";

export type BattleEventType =
  | "LAUNCH"
  | "FIRST_CONTACT"
  | "COLLISION"
  | "DIRECT_HIT"
  | "HEAVY_IMPACT"
  | "XTREME_DASH"
  | "COUNTER"
  | "BURST_FINISH"
  | "KNOCKOUT_FINISH"
  | "XTREME_FINISH"
  | "SURVIVOR_FINISH";

export type BeyIndex = 0 | 1;

export interface BattleEvent {
  t: number;
  type: BattleEventType;
  /** The Beyblade that caused the event (attacker / dasher / winner). */
  actor?: BeyIndex;
  /** The Beyblade that received the event (target / loser). */
  target?: BeyIndex;
  x?: number;
  y?: number;
  /** Relative strength, ~0-3. */
  intensity?: number;
  label: string;
}

export const BEY_STATE = { Active: 0, Out: 1, Burst: 2, Stopped: 3 } as const;
export type BeyFrameState = (typeof BEY_STATE)[keyof typeof BEY_STATE];

export interface BeyFrame {
  x: number;
  y: number;
  /** 0-1 fraction of maximum spin. */
  spin: number;
  /** 0-1 normalised momentum. */
  momentum: number;
  wobble: number;
  dashing: boolean;
  state: BeyFrameState;
}

export interface BattleFrame {
  t: number;
  beys: [BeyFrame, BeyFrame];
}

export interface LaunchConditions {
  /** 0-1 launch power. */
  power: number;
  /** Launch tilt in degrees; 0 is perfectly flat. */
  angle: number;
  startX: number;
  startY: number;
}

/** Minimal Beyblade description the engine needs; keeps it independent of UI data. */
export interface EngineBey {
  id: string;
  name: string;
  type: BeyType;
  spinDirection: SpinDirection;
  stats: ComboStats;
}

export interface BeyBattleStats {
  hitsLanded: number;
  xtremeDashes: number;
  counters: number;
  ratchetClicks: number;
  spinLoss: number;
  maxMomentum: number;
  finalSpin: number;
}

export interface BattleStatistics {
  collisions: number;
  heavyHits: number;
  directHits: number;
  xtremeDashes: number;
  counters: number;
  burstAttempts: number;
  burstEvents: number;
  knockoutEvents: number;
  perBey: [BeyBattleStats, BeyBattleStats];
}

export interface BattleResult {
  engineVersion: number;
  seed: string;
  beyIds: [string, string];
  names: [string, string];
  winnerId: string;
  loserId: string;
  winnerIndex: BeyIndex;
  finishType: FinishType;
  /** Seconds until the finish occurred. */
  duration: number;
  /** True when the loser knocked itself out without a recent collision. */
  selfKnockout: boolean;
  events: BattleEvent[];
  frames: BattleFrame[];
  frameInterval: number;
  launch: [LaunchConditions, LaunchConditions];
  statistics: BattleStatistics;
}

export interface BattleHistoryEntry {
  id: string;
  seed: string;
  beyIds: [string, string];
  names: [string, string];
  winnerIndex: BeyIndex;
  finishType: FinishType;
  duration: number;
  createdAt: string;
  statistics: BattleStatistics;
}
