import * as THREE from "three";
import { buildBeyModel, type BeyModelSpec } from "./beyModel";
import { createStudio } from "./studio";

export interface ViewerOptions {
  /** Radians per second around the spin axis. */
  spinSpeed: number;
  interactive: boolean;
}

/** Live, lit 3D showcase of a single Bey. Returns a disposer. */
export function createBeyViewer(canvas: HTMLCanvasElement, spec: BeyModelSpec, options: ViewerOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  const studio = createStudio(renderer);
  const model = buildBeyModel(spec);
  const pivot = new THREE.Group();
  pivot.add(model.group);
  studio.scene.add(pivot);

  const dir = spec.spin === "right" ? -1 : 1;
  const tilt = { x: 0, z: 0, tx: 0, tz: 0 };
  let raf = 0;
  let last = performance.now();
  let visible = true;
  let t = 0;

  const resize = () => {
    const w = canvas.clientWidth;
    if (!w) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, w, false);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const onPointer = (e: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    tilt.tz = -((e.clientX - rect.left) / rect.width - 0.5) * 0.5;
    tilt.tx = ((e.clientY - rect.top) / rect.height - 0.5) * 0.5;
  };
  const onLeave = () => {
    tilt.tx = 0;
    tilt.tz = 0;
  };
  if (options.interactive) {
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerleave", onLeave);
  }

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  io.observe(canvas);

  function frame(now: number) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    model.group.rotation.y += dir * options.spinSpeed * dt;
    tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 5);
    tilt.z += (tilt.tz - tilt.z) * Math.min(1, dt * 5);
    // Gentle precession so the top reads as a spinning object.
    pivot.rotation.set(tilt.x + Math.sin(t * 1.3) * 0.05, 0, tilt.z + Math.cos(t * 1.3) * 0.05);
    pivot.position.y = Math.sin(t * 1.6) * 0.03;
    renderer.render(studio.scene, studio.camera);
    raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => {
    if (!document.hidden && visible && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("pointermove", onPointer);
    canvas.removeEventListener("pointerleave", onLeave);
    model.dispose();
    studio.dispose();
    renderer.dispose();
  };
}
