import * as THREE from "three";
import { buildBeyModel, type BeyModelSpec } from "./beyModel";
import { createStudio } from "./studio";

let context: { renderer: THREE.WebGLRenderer; studio: ReturnType<typeof createStudio> } | null = null;
const cache = new Map<string, Promise<string>>();
let queue: Promise<unknown> = Promise.resolve();

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function draw(spec: BeyModelSpec, size: number) {
  if (!context) {
    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(1);
    context = { renderer, studio: createStudio(renderer) };
  }
  const { renderer, studio } = context;
  renderer.setSize(size, size, false);
  const model = buildBeyModel(spec);
  model.group.rotation.y = 0.5;
  studio.scene.add(model.group);
  renderer.render(studio.scene, studio.camera);
  const url = renderer.domElement.toDataURL("image/webp", 0.9);
  studio.scene.remove(model.group);
  model.dispose();
  return url;
}

/**
 * Renders a Bey to an image with one shared WebGL context, so lists of cards get
 * 3D-lit artwork without one context per card. Results are cached per session.
 */
export function renderBeyThumbnail(spec: BeyModelSpec, size = 320): Promise<string> {
  const key = `${spec.type}|${spec.spin}|${spec.visual.blades}|${spec.visual.primary}|${spec.visual.secondary}|${spec.visual.accent}|${spec.ratchetTeeth}|${size}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = queue.then(async () => {
    await nextFrame();
    return draw(spec, size);
  });
  queue = job.catch(() => undefined);
  cache.set(key, job);
  return job;
}
