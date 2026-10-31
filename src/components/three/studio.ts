import * as THREE from "three";
import { createEnvironment } from "./beyModel";

let shadowTexture: THREE.CanvasTexture | null = null;

function contactShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.75)");
  g.addColorStop(0.5, "rgba(0,0,0,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(c);
  return shadowTexture;
}

/** Shared showroom setup for single-Bey renders: lighting, reflections, contact shadow and camera. */
export function createStudio(renderer: THREE.WebGLRenderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const env = createEnvironment(renderer);
  scene.environment = env;
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x0b0d12, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(-2, 4, 3);
  const rimA = new THREE.DirectionalLight(0x38d3f5, 1.6);
  rimA.position.set(-3, 1.5, -2.5);
  const rimB = new THREE.DirectionalLight(0xff7a2f, 1.3);
  rimB.position.set(3, 1.5, -2.5);
  scene.add(key, rimA, rimB);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.8),
    new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.02;
  scene.add(shadow);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 30);
  camera.position.set(0, 3.45, 4.15);
  camera.lookAt(0, 0.35, 0);

  return {
    scene,
    camera,
    dispose: () => {
      env.dispose();
      shadow.geometry.dispose();
      shadow.material.dispose();
    },
  };
}
