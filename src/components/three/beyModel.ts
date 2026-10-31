import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { BeyType, BeyVisual, SpinDirection } from "@/types/beyblade";
import { bladePoints } from "@/components/beyblade/beyGeometry";

export interface BeyModelSpec {
  visual: BeyVisual;
  type: BeyType;
  spin: SpinDirection;
  ratchetTeeth: number;
}

export interface BeyModel {
  group: THREE.Group;
  /** Blade assembly (separates from the ratchet on a burst). */
  top: THREE.Group;
  /** Ratchet + bit. */
  bottom: THREE.Group;
  spinDisc: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  dispose: () => void;
}

/** Model height in model units (radius = 1). */
export const BEY_MODEL_HEIGHT = 1.02;

const metal = (color: THREE.ColorRepresentation, roughness = 0.28) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness, envMapIntensity: 1.25 });
const plastic = (color: THREE.ColorRepresentation, roughness = 0.42) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness, envMapIntensity: 0.9 });

function outlineShape(spec: BeyModelSpec, scale = 1) {
  const pts = bladePoints(spec.type, spec.visual.blades, spec.spin);
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x * scale, y * scale) : shape.lineTo(x * scale, y * scale)));
  shape.closePath();
  return shape;
}

/** Extrudes a flat shape upward (+Y) from `base`; shape y maps to world +z so spin matches the 2D art. */
function extrudeUp(shape: THREE.Shape, depth: number, base: number, bevel = 0.035) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, base + depth, 0);
  geo.computeVertexNormals();
  return geo;
}

let discTexture: THREE.CanvasTexture | null = null;
function spinDiscTexture() {
  if (discTexture) return discTexture;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,0.05)");
  g.addColorStop(0.55, "rgba(255,255,255,0.55)");
  g.addColorStop(0.9, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  discTexture = new THREE.CanvasTexture(c);
  discTexture.colorSpace = THREE.SRGBColorSpace;
  return discTexture;
}

/** Builds an original, stylised 3D Beyblade (radius 1, tip at y = 0). */
export function buildBeyModel(spec: BeyModelSpec): BeyModel {
  const { visual, type } = spec;
  const group = new THREE.Group();
  const top = new THREE.Group();
  const bottom = new THREE.Group();
  group.add(bottom, top);

  // Bit — tip shape reflects the type.
  const bitMat = plastic(visual.accent, 0.35);
  const tipRadius = { attack: 0.17, balance: 0.1, stamina: 0.13, defense: 0.035 }[type];
  const bitBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, tipRadius, 0.3, 28), bitMat);
  bitBody.position.y = 0.23;
  bottom.add(bitBody);
  if (type === "stamina") {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 12), bitMat);
    ball.position.y = 0.12;
    bottom.add(ball);
  }
  const bitCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 28), metal("#8b94a3", 0.35));
  bitCollar.position.y = 0.4;
  bottom.add(bitCollar);

  // Ratchet with teeth.
  const ratchet = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.44, 0.22, 36), plastic("#171b22", 0.5));
  ratchet.position.y = 0.53;
  bottom.add(ratchet);
  const toothGeo = new THREE.BoxGeometry(0.13, 0.2, 0.12);
  const toothMat = plastic(visual.secondary, 0.4);
  for (let i = 0; i < spec.ratchetTeeth; i++) {
    const a = (i / spec.ratchetTeeth) * Math.PI * 2;
    const tooth = new THREE.Mesh(toothGeo, toothMat);
    tooth.position.set(Math.cos(a) * 0.47, 0.54, Math.sin(a) * 0.47);
    tooth.rotation.y = -a;
    bottom.add(tooth);
  }

  // Blade: metallic body, inner layer, chrome ring and cap.
  const blade = new THREE.Mesh(extrudeUp(outlineShape(spec), 0.17, 0.63), metal(visual.primary, 0.3));
  top.add(blade);
  const edge = new THREE.Mesh(
    extrudeUp(outlineShape(spec, 1.012), 0.03, 0.66, 0),
    new THREE.MeshStandardMaterial({ color: visual.secondary, metalness: 0.6, roughness: 0.3, emissive: visual.secondary, emissiveIntensity: 0.12 }),
  );
  top.add(edge);
  const inner = new THREE.Mesh(extrudeUp(outlineShape(spec, 0.78), 0.06, 0.83, 0.02), plastic(visual.secondary, 0.32));
  inner.rotation.y = -Math.PI / visual.blades;
  top.add(inner);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.055, 12, 48), metal("#dfe4ea", 0.18));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.91;
  top.add(ring);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.08, 36), plastic("#0c0f15", 0.55));
  hub.position.y = 0.9;
  top.add(hub);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.29, 0.1, 32),
    new THREE.MeshStandardMaterial({ color: visual.accent, metalness: 0.4, roughness: 0.25, emissive: visual.accent, emissiveIntensity: 0.18 }),
  );
  cap.position.y = 0.97;
  top.add(cap);
  const markMat = plastic("#0b0e14", 0.5);
  for (const r of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.06), markMat);
    bar.position.y = 1.025;
    bar.rotation.y = r;
    top.add(bar);
  }

  const spinDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.04, 48),
    new THREE.MeshBasicMaterial({ color: visual.primary, map: spinDiscTexture(), transparent: true, opacity: 0, depthWrite: false }),
  );
  spinDisc.rotation.x = -Math.PI / 2;
  spinDisc.position.y = 0.84;
  group.add(spinDisc);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh && o !== spinDisc) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    group,
    top,
    bottom,
    spinDisc,
    dispose: () =>
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
      }),
  };
}

/** Image-based lighting so metal parts get reflections. */
export function createEnvironment(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return env;
}
