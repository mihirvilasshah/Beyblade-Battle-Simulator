let cached: boolean | null = null;

/** Whether this device can create a WebGL context (checked once, without loading Three.js). */
export function supportsWebGL() {
  if (cached !== null) return cached;
  if (typeof document === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    cached = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}
