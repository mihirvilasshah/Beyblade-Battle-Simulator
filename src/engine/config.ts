/** Tunable constants for the physics-inspired battle simulation. Units: stadium radius = 1, time in seconds. */
export const ENGINE_VERSION = 1;

export const SIM_CONFIG = {
  dt: 1 / 120,
  /** Store a playback frame every N steps (120 / 4 = 30 frames per second). */
  frameEvery: 4,
  maxDuration: 60,
  postFinishDuration: 1.8,

  stadium: {
    wallRadius: 1,
    beyRadius: 0.14,
    /** Distance from centre where a Bey's edge meets the Xtreme Line rail. */
    railRadius: 0.8,
    /** Pull toward the centre from the bowl slope. */
    bowlPull: 1.25,
    wallRestitution: 0.38,
    /** Minimum outward speed needed to clear a pocket lip. */
    pocketLip: 1.0,
  },

  spin: {
    stopThreshold: 0.035,
    baseDecay: 0.027,
    staminaDecay: 0.009,
    frictionDecay: 0.01,
    wobbleDecay: 0.07,
    dashDecay: 0.05,
    /** Below this spin a Bey starts to wobble / precess. */
    wobbleStart: 0.17,
  },

  movement: {
    tipDrive: 1.5,
    outwardDrift: 0.25,
    wander: 0.7,
    baseDamping: 0.35,
    holdDamping: 1.1,
    cutRadius: 0.68,
    cutRate: 3.0,
    seek: 2.6,
  },

  dash: {
    baseChance: 0.35,
    dashChance: 4.0,
    accel: 4.0,
    minDuration: 0.28,
    maxDuration: 0.55,
    minRailSpeed: 0.3,
    cooldown: 0.6,
    /** Exit deflection off the rail toward the centre (cos/sin of ~0.9 rad, literal for determinism). */
    exitCos: 0.6216099682706644,
    exitSin: 0.7833269096274834,
  },

  collision: {
    restitution: 0.5,
    smash: 1.2,
    oppositeSpinSmash: 0.62,
    spinLoss: 0.014,
    recoil: 0.2,
    pairCooldown: 0.1,
    /** Sideways deflection from blade spin (cos/sin of 0.45 rad). */
    deflectCos: 0.9004471023526769,
    deflectSin: 0.43496553411123023,
    heavyThreshold: 2.6,
    directHitThreshold: 1.5,
    counterThreshold: 1.2,
    minEventStrength: 0.3,
  },

  burst: {
    clicksToBurst: 2,
    relockRate: 0.07,
    minStrength: 0.5,
  },

  launch: {
    minPower: 0.72,
    maxPower: 1,
    maxAngle: 12,
  },

  momentumRef: 3.0,
} as const;

export type PocketKind = "xtreme" | "over";

/** Pocket openings in the wall. dir is a unit vector (y points down / toward the player). */
export const POCKETS: { kind: PocketKind; dirX: number; dirY: number; minDot: number }[] = [
  { kind: "xtreme", dirX: 0, dirY: 1, minDot: 0.93 },
  { kind: "over", dirX: -0.8660254037844386, dirY: -0.5, minDot: 0.955 },
  { kind: "over", dirX: 0.8660254037844386, dirY: -0.5, minDot: 0.955 },
];
