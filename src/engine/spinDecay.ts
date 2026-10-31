import { SIM_CONFIG } from "./config";
import { speedOf, type BeyParams, type BeyState } from "./physics";

/** Spin lost per second from air/floor friction, movement, wobble and dashing. */
export function calculateSpinDecay(state: BeyState, params: BeyParams) {
  const c = SIM_CONFIG.spin;
  const staminaFactor = Math.min(1, params.stamina / 1.3);
  return (
    (c.baseDecay +
      c.staminaDecay * (1 - staminaFactor) +
      c.frictionDecay * speedOf(state) * params.grip +
      c.wobbleDecay * state.wobble +
      (state.dashTimer > 0 ? c.dashDecay : 0)) *
    params.condition
  );
}

/** Advances spin and wobble. Returns the spin lost this step. */
export function applySpinDecay(state: BeyState, params: BeyParams, dt: number) {
  const before = state.spin;
  state.spin = Math.max(0, state.spin - calculateSpinDecay(state, params) * dt);

  const { wobbleStart } = SIM_CONFIG.spin;
  if (state.spin < wobbleStart) {
    state.wobble += (wobbleStart - state.spin) * 2.4 * dt;
  } else {
    // High spin stabilises a tilted launch.
    state.wobble -= state.wobble * 0.6 * state.spin * dt;
  }
  state.wobble = Math.min(1, Math.max(0, state.wobble));
  return before - state.spin;
}
