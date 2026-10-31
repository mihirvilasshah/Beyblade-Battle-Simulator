import * as THREE from "three";
import type { BattleFrame, BeyFrame } from "@/types/battle";
import { BEY_STATE } from "@/types/battle";
import { POCKETS, SIM_CONFIG } from "@/engine/config";
import { createRng } from "@/engine/random";
import { buildBeyModel, createEnvironment, type BeyModel } from "@/components/three/beyModel";
import type { ArenaRendererLike, RenderBey, RenderOptions } from "./ArenaRenderer";

const BEY_R = SIM_CONFIG.stadium.beyRadius;
const RAIL_IN = SIM_CONFIG.stadium.railRadius;
const WALL_TOP = 0.2;
const MAX_SPARKS = 420;
const TRAIL_POINTS = 22;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

/** Bowl surface height at radius r (world units, stadium radius = 1). */
const bowlHeight = (r: number) => (r <= RAIL_IN ? 0.1 * r * r : 0.1 * RAIL_IN * RAIL_IN + (r - RAIL_IN) * 0.06);
const bowlSlope = (r: number) => (r <= RAIL_IN ? 0.2 * r : 0.06);

interface Spark {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface Pulse {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> | THREE.Sprite;
  life: number;
  maxLife: number;
  size: number;
}

interface BeyEntity {
  pivot: THREE.Group;
  model: BeyModel;
  angle: number;
  /** 1 for right spin (clockwise from above = negative rotation about +Y), -1 for left. */
  spinDir: number;
  trail: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  history: THREE.Vector3[];
  dashRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  color: THREE.Color;
  burstAt: number;
  outAt: number;
  burstDir: THREE.Vector2;
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const radialDot = () =>
  canvasTexture(64, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

/** WebGL (Three.js) stadium renderer with real 3D Beys, lighting, shadows and particles. */
export class ArenaRenderer3D implements ArenaRendererLike {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  private basePos = new THREE.Vector3(0, 3.55, 3.05);
  private lookBase = new THREE.Vector3(0, -0.12, 0.12);
  private look = new THREE.Vector3(0, -0.12, 0.12);
  private entities: [BeyEntity, BeyEntity];
  private sparks: Spark[] = [];
  private sparkPoints: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private rings: Pulse[] = [];
  private flashes: Pulse[] = [];
  private dot: THREE.Texture;
  private pocketLight: THREE.PointLight;
  private shake = 0;
  private zoom = 1;
  private zoomTarget = 1;
  private focus = new THREE.Vector3();
  private disposables: { dispose: () => void }[] = [];
  private time = 0;

  constructor(
    canvas: HTMLCanvasElement,
    beys: [RenderBey, RenderBey],
    private options: RenderOptions,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    const env = createEnvironment(this.renderer);
    this.scene.environment = env;
    this.disposables.push(env);

    this.dot = radialDot();
    this.disposables.push(this.dot);
    this.buildLights();
    this.buildStadium();
    this.pocketLight = new THREE.PointLight(0xff7a2f, 0, 2.2, 1.5);
    this.scene.add(this.pocketLight);

    this.entities = beys.map((b) => this.createEntity(b)) as [BeyEntity, BeyEntity];
    this.sparkPoints = this.createSparkPoints();

    this.camera.position.copy(this.basePos);
    this.camera.lookAt(this.look);
  }

  setOptions(options: RenderOptions) {
    this.options = options;
  }

  resize(cssSize: number, devicePixelRatio: number) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
    this.renderer.setSize(cssSize, cssSize, false);
    this.camera.aspect = 1;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  reset() {
    this.sparks = [];
    this.shake = 0;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.pocketLight.intensity = 0;
    for (const p of [...this.rings, ...this.flashes]) p.life = p.maxLife;
    for (const e of this.entities) {
      e.burstAt = -1;
      e.outAt = -1;
      e.history = [];
      e.model.top.position.set(0, 0, 0);
      e.model.top.rotation.set(0, 0, 0);
      e.model.bottom.rotation.set(0, 0, 0);
      e.model.bottom.position.set(0, 0, 0);
    }
  }

  // ---------- Scene construction ----------

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x07090d, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-1.4, 3.4, 1.6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -1.5;
    key.shadow.camera.right = 1.5;
    key.shadow.camera.top = 1.5;
    key.shadow.camera.bottom = -1.5;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 8;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.01;
    this.scene.add(key);
    const cyan = new THREE.PointLight(0x38d3f5, 5, 5, 1.2);
    cyan.position.set(-1.6, 1.1, -1.2);
    const orange = new THREE.PointLight(0xff7a2f, 4, 5, 1.2);
    orange.position.set(1.6, 1.1, -1.0);
    this.scene.add(cyan, orange);
  }

  private track<T extends { dispose: () => void }>(item: T) {
    this.disposables.push(item);
    return item;
  }

  private buildStadium() {
    const lite = this.options.lite;
    const segments = lite ? 64 : 128;

    // Bowl floor: planar-UV ring displaced into a shallow bowl.
    const bowlTex = this.track(
      canvasTexture(lite ? 512 : 1024, (ctx, s) => {
        const c = s / 2;
        const g = ctx.createRadialGradient(c * 0.85, c * 0.8, s * 0.02, c, c, c);
        g.addColorStop(0, "#4a525f");
        g.addColorStop(0.6, "#2a3039");
        g.addColorStop(1, "#151a21");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.lineWidth = s * 0.003;
        for (const r of [0.25, 0.52, 0.78]) {
          ctx.beginPath();
          ctx.arc(c, c, c * r, 0, Math.PI * 2);
          ctx.stroke();
        }
        const rng = createRng("stadium-scratches-3d");
        for (let i = 0; i < (lite ? 40 : 140); i++) {
          const r = rng.range(0.05, 0.97) * c;
          const a = rng.range(0, Math.PI * 2);
          ctx.beginPath();
          ctx.arc(c, c, r, a, a + rng.range(0.05, 0.3));
          ctx.strokeStyle = `rgba(255,255,255,${rng.range(0.02, 0.07).toFixed(3)})`;
          ctx.lineWidth = rng.range(0.5, 1.6);
          ctx.stroke();
        }
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = s * 0.02;
        ctx.lineCap = "round";
        const m = s * 0.06;
        ctx.beginPath();
        ctx.moveTo(c - m, c - m);
        ctx.lineTo(c + m, c + m);
        ctx.moveTo(c + m, c - m);
        ctx.lineTo(c - m, c + m);
        ctx.stroke();
      }),
    );
    const bowlGeo = this.track(new THREE.RingGeometry(0.0001, RAIL_IN, segments, 18));
    bowlGeo.rotateX(-Math.PI / 2);
    this.displace(bowlGeo);
    const bowl = new THREE.Mesh(bowlGeo, this.track(new THREE.MeshStandardMaterial({ map: bowlTex, metalness: 0.55, roughness: 0.42, envMapIntensity: 0.7 })));
    bowl.receiveShadow = true;
    this.scene.add(bowl);

    // Xtreme Line rail band with gear teeth.
    const railTex = this.track(
      canvasTexture(lite ? 512 : 1024, (ctx, s) => {
        const c = s / 2;
        ctx.fillStyle = "#1c222b";
        ctx.fillRect(0, 0, s, s);
        ctx.strokeStyle = "rgba(255,255,255,0.14)";
        ctx.lineWidth = s * 0.004;
        const n = 180;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(c + Math.cos(a) * c * 0.86, c + Math.sin(a) * c * 0.86);
          ctx.lineTo(c + Math.cos(a) * c * 0.94, c + Math.sin(a) * c * 0.94);
          ctx.stroke();
        }
      }),
    );
    const railGeo = this.track(new THREE.RingGeometry(RAIL_IN, 0.975, segments, 3));
    railGeo.rotateX(-Math.PI / 2);
    this.displace(railGeo);
    const rail = new THREE.Mesh(railGeo, this.track(new THREE.MeshStandardMaterial({ map: railTex, metalness: 0.6, roughness: 0.45 })));
    rail.receiveShadow = true;
    this.scene.add(rail);

    const glow = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(RAIL_IN + 0.015, 0.0045, 6, segments)),
      this.track(new THREE.MeshBasicMaterial({ color: 0x38d3f5, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })),
    );
    glow.rotation.x = Math.PI / 2;
    glow.position.y = bowlHeight(RAIL_IN) + 0.008;
    this.scene.add(glow);

    // Walls, pockets and housing.
    const pockets = POCKETS.map((p) => ({ ...p, a: Math.atan2(p.dirY, p.dirX), h: Math.acos(p.minDot) + 0.06 })).sort((x, y) => x.a - y.a);
    const wallMat = this.track(new THREE.MeshStandardMaterial({ color: 0xb9c1cc, metalness: 0.9, roughness: 0.22, side: THREE.DoubleSide }));
    const housingMat = this.track(new THREE.MeshStandardMaterial({ color: 0x1c222b, metalness: 0.7, roughness: 0.38 }));
    const darkMat = this.track(new THREE.MeshStandardMaterial({ color: 0x06080b, metalness: 0.3, roughness: 0.8 }));

    for (let i = 0; i < pockets.length; i++) {
      const cur = pockets[i];
      const next = pockets[(i + 1) % pockets.length];
      const a0 = cur.a + cur.h;
      const a1 = next.a - next.h + (i === pockets.length - 1 ? Math.PI * 2 : 0);
      this.addWallArc(a0, a1, wallMat, housingMat);
    }

    for (const p of pockets) {
      const a0 = p.a - p.h;
      const a1 = p.a + p.h;
      const floor = this.ringArc(0.975, 1.24, a0, a1, -0.09);
      const floorMesh = new THREE.Mesh(floor, darkMat);
      floorMesh.receiveShadow = true;
      this.scene.add(floorMesh);
      this.scene.add(new THREE.Mesh(this.cylArc(1.24, a0, a1, -0.09, WALL_TOP), darkMat));
      const color = p.kind === "xtreme" ? 0xff7a2f : 0x38d3f5;
      const rim = new THREE.Mesh(
        this.track(new THREE.TorusGeometry(0.985, 0.006, 6, 24, a1 - a0)),
        this.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })),
      );
      rim.rotation.x = Math.PI / 2;
      rim.rotation.z = a0;
      rim.position.y = bowlHeight(0.975) + 0.004;
      this.scene.add(rim);
      const label = this.labelSprite(p.kind === "xtreme" ? "X" : "OVER", p.kind === "xtreme" ? "#ff8a3d" : "#9fe8fa");
      label.position.set(Math.cos(p.a) * 1.12, 0.02, Math.sin(p.a) * 1.12);
      label.scale.setScalar(p.kind === "xtreme" ? 0.2 : 0.16);
      this.scene.add(label);
    }

    // Outer housing rim + base.
    const outerTop = this.ringArc(1.24, 1.32, 0, Math.PI * 2, WALL_TOP);
    this.scene.add(new THREE.Mesh(outerTop, housingMat));
    const base = new THREE.Mesh(this.track(new THREE.CylinderGeometry(1.32, 1.38, 0.45, segments, 1, true)), housingMat);
    base.position.y = WALL_TOP - 0.225;
    this.scene.add(base);
    const boltGeo = this.track(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12));
    const boltMat = this.track(new THREE.MeshStandardMaterial({ color: 0x7c8594, metalness: 0.9, roughness: 0.3 }));
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.position.set(Math.cos(a) * 1.28, WALL_TOP + 0.006, Math.sin(a) * 1.28);
      this.scene.add(bolt);
    }

    // Soft contact shadow under the whole stadium.
    const ground = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(2.2, 48)),
      this.track(new THREE.MeshBasicMaterial({ map: this.dot, color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false })),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = WALL_TOP - 0.46;
    this.scene.add(ground);
  }

  private displace(geo: THREE.BufferGeometry) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, bowlHeight(Math.sqrt(x * x + z * z)));
    }
    geo.computeVertexNormals();
  }

  /** Flat ring arc lying at height y, covering sim angles a0..a1. */
  private ringArc(inner: number, outer: number, a0: number, a1: number, y: number) {
    const geo = this.track(new THREE.RingGeometry(inner, outer, Math.max(8, Math.round((a1 - a0) * 20)), 1, -a1, a1 - a0));
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, y, 0);
    return geo;
  }

  /** Vertical open cylinder arc between heights y0..y1 covering sim angles a0..a1. */
  private cylArc(radius: number, a0: number, a1: number, y0: number, y1: number) {
    const geo = this.track(
      new THREE.CylinderGeometry(radius, radius, y1 - y0, Math.max(8, Math.round((a1 - a0) * 20)), 1, true, Math.PI / 2 - a1, a1 - a0),
    );
    geo.translate(0, (y0 + y1) / 2, 0);
    return geo;
  }

  private addWallArc(a0: number, a1: number, wallMat: THREE.Material, housingMat: THREE.Material) {
    const inner = new THREE.Mesh(this.cylArc(0.975, a0, a1, bowlHeight(0.975) - 0.01, WALL_TOP), wallMat);
    inner.receiveShadow = true;
    this.scene.add(inner);
    this.scene.add(new THREE.Mesh(this.ringArc(0.975, 1.24, a0, a1, WALL_TOP), housingMat));
    const lip = new THREE.Mesh(this.track(new THREE.TorusGeometry(0.975, 0.012, 6, 32, a1 - a0)), wallMat);
    lip.rotation.x = Math.PI / 2;
    lip.rotation.z = a0;
    lip.position.y = WALL_TOP;
    this.scene.add(lip);
  }

  private labelSprite(text: string, color: string) {
    const tex = this.track(
      canvasTexture(128, (ctx, s) => {
        ctx.fillStyle = color;
        ctx.font = `700 ${text.length > 1 ? 38 : 88}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = color;
        ctx.shadowBlur = 16;
        ctx.fillText(text, s / 2, s / 2);
      }),
    );
    return new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })));
  }

  private createEntity(b: RenderBey): BeyEntity {
    const model = buildBeyModel(b);
    // Drawn slightly larger than the physics radius so the Beys read well on small screens.
    model.group.scale.setScalar(BEY_R * 1.15);
    const pivot = new THREE.Group();
    pivot.add(model.group);
    pivot.visible = false;
    this.scene.add(pivot);

    const trailGeo = this.track(new THREE.BufferGeometry());
    trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 2 * 3), 3));
    trailGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(TRAIL_POINTS * 2 * 3), 3));
    const index: number[] = [];
    for (let i = 0; i < TRAIL_POINTS - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    trailGeo.setIndex(index);
    const trail = new THREE.Mesh(
      trailGeo,
      this.track(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })),
    );
    trail.frustumCulled = false;
    this.scene.add(trail);

    const color = new THREE.Color(b.visual.accent);
    const dashRing = new THREE.Mesh(
      this.track(new THREE.TorusGeometry(1.22, 0.07, 8, 48)),
      this.track(new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })),
    );
    dashRing.rotation.x = Math.PI / 2;
    dashRing.position.y = 0.75;
    model.group.add(dashRing);

    return {
      pivot,
      model,
      angle: Math.random() * Math.PI * 2,
      spinDir: b.spin === "right" ? 1 : -1,
      trail,
      history: [],
      dashRing,
      color,
      burstAt: -1,
      outAt: -1,
      burstDir: new THREE.Vector2(1, 0),
    };
  }

  private createSparkPoints() {
    const geo = this.track(new THREE.BufferGeometry());
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(MAX_SPARKS * 3), 3));
    const points = new THREE.Points(
      geo,
      this.track(
        new THREE.PointsMaterial({ size: 0.035, map: this.dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }),
      ),
    );
    points.frustumCulled = false;
    this.scene.add(points);
    return points;
  }

  // ---------- Effects ----------

  private worldAt(x: number, y: number, lift = 0.08) {
    return new THREE.Vector3(x, bowlHeight(Math.sqrt(x * x + y * y)) + lift, y);
  }

  private spawnSparks(at: THREE.Vector3, count: number, speed: number, colors: THREE.Color[]) {
    for (let i = 0; i < count; i++) {
      if (this.sparks.length >= MAX_SPARKS) this.sparks.shift();
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random());
      this.sparks.push({
        x: at.x,
        y: at.y,
        z: at.z,
        vx: Math.cos(a) * sp,
        vy: 0.4 + Math.random() * speed * 0.9,
        vz: Math.sin(a) * sp,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.45,
        color: colors[i % colors.length],
      });
    }
  }

  private pulse(list: Pulse[], create: () => Pulse["mesh"], at: THREE.Vector3, size: number, life: number, color: THREE.ColorRepresentation) {
    let p = list.find((x) => x.life >= x.maxLife);
    if (!p) {
      p = { mesh: create(), life: 0, maxLife: life, size };
      this.scene.add(p.mesh);
      list.push(p);
    }
    p.life = 0;
    p.maxLife = life;
    p.size = size;
    p.mesh.position.copy(at);
    (p.mesh.material as THREE.MeshBasicMaterial | THREE.SpriteMaterial).color.set(color);
    p.mesh.visible = true;
  }

  private ring(at: THREE.Vector3, size: number, color: THREE.ColorRepresentation) {
    this.pulse(
      this.rings,
      () => {
        const geo = this.track(new THREE.RingGeometry(0.86, 1, 48));
        geo.rotateX(-Math.PI / 2);
        return new THREE.Mesh(geo, this.track(new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
      },
      at,
      size,
      0.45,
      color,
    );
  }

  private flash(at: THREE.Vector3, size: number, color: THREE.ColorRepresentation) {
    this.pulse(
      this.flashes,
      () => new THREE.Sprite(this.track(new THREE.SpriteMaterial({ map: this.dot, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))),
      at,
      size,
      0.2,
      color,
    );
  }

  impact(x: number, y: number, intensity: number, colors: [string, string]) {
    const at = this.worldAt(x, y);
    const n = Math.round((this.options.reducedMotion ? 10 : 24) * Math.min(2.5, 0.6 + intensity * 0.5));
    this.spawnSparks(at, n, 0.8 + Math.min(2, intensity) * 0.7, [new THREE.Color("#fff6d5"), new THREE.Color("#ffc14d"), new THREE.Color(colors[0])]);
    this.ring(new THREE.Vector3(at.x, at.y - 0.06, at.z), 0.08 + intensity * 0.05, 0xffffff);
    this.flash(at, 0.3 + intensity * 0.1, 0xfff3c4);
    if (!this.options.reducedMotion) this.shake = Math.min(1, this.shake + intensity * 0.2);
  }

  heavyFocus(x: number, y: number) {
    if (this.options.reducedMotion) return;
    this.focus.copy(this.worldAt(x, y, 0));
    this.zoomTarget = 1.14;
  }

  releaseFocus() {
    this.zoomTarget = 1;
  }

  dashBurst(x: number, y: number, color: string) {
    const at = this.worldAt(x, y, 0.04);
    this.spawnSparks(at, 12, 0.9, [new THREE.Color(color), new THREE.Color("#ffffff")]);
    this.ring(new THREE.Vector3(at.x, at.y - 0.02, at.z), 0.12, color);
  }

  burst(index: 0 | 1, x: number, y: number, t: number) {
    const e = this.entities[index];
    e.burstAt = t;
    const r = Math.sqrt(x * x + y * y) || 1;
    e.burstDir.set(x / r, y / r).rotateAround(new THREE.Vector2(), (Math.random() - 0.5) * 1.2);
    this.impact(x, y, 2.6, [`#${e.color.getHexString()}`, "#ffffff"]);
  }

  knockout(index: 0 | 1, x: number, y: number, t: number, xtreme: boolean) {
    this.entities[index].outAt = t;
    const r = Math.sqrt(x * x + y * y) || 1;
    this.pocketLight.color.set(xtreme ? 0xff7a2f : 0x38d3f5);
    this.pocketLight.position.set((x / r) * 1.1, 0.25, (y / r) * 1.1);
    this.pocketLight.intensity = 8;
    this.impact(x, y, 2.2, ["#ffffff", xtreme ? "#ff7a2f" : "#38d3f5"]);
  }

  // ---------- Frame ----------

  render(frame: BattleFrame | null, launch: number, dt: number) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 6);
    this.pocketLight.intensity = Math.max(0, this.pocketLight.intensity - dt * 7);

    for (const i of [0, 1] as const) {
      const e = this.entities[i];
      if (!frame) {
        e.pivot.visible = false;
        e.trail.visible = false;
        continue;
      }
      this.updateBey(e, frame.beys[i], i, launch, dt, frame.t);
    }
    this.updateSparks(dt);
    this.updatePulses(dt);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  private updateBey(e: BeyEntity, b: BeyFrame, index: 0 | 1, launch: number, dt: number, t: number) {
    const r = Math.sqrt(b.x * b.x + b.y * b.y);
    const target = new THREE.Vector3(b.x, bowlHeight(Math.min(r, 0.975)), b.y);

    if (b.state === BEY_STATE.Out && e.outAt >= 0 && r > 0.975) {
      target.y = bowlHeight(0.975) - Math.min(0.16, (r - 0.975) * 0.9);
    }
    if (launch < 1) {
      const k = easeOut(launch);
      const from = new THREE.Vector3(index === 0 ? -1.3 : 1.3, 1.5, -0.9);
      target.lerpVectors(from, target, k);
    }
    e.pivot.visible = true;
    e.pivot.position.copy(target);

    // Lean with the bowl slope plus wobble precession.
    const slope = launch < 1 ? 0 : Math.atan(bowlSlope(r)) * 0.8;
    const rx = r > 1e-4 ? b.x / r : 0;
    const rz = r > 1e-4 ? b.y / r : 0;
    const pa = t * (3 + b.wobble * 6);
    const wob = Math.min(0.45, b.wobble * 0.5);
    let dirX = -rx * slope + Math.cos(pa) * wob;
    let dirZ = -rz * slope + Math.sin(pa) * wob;
    if (b.state === BEY_STATE.Stopped) {
      dirX = rx * 0.35;
      dirZ = rz * 0.35;
    }
    e.pivot.rotation.set(dirZ, 0, -dirX);

    e.angle -= e.spinDir * (2 + b.spin * 40) * dt;
    e.model.group.rotation.y = e.angle;
    e.model.spinDisc.material.opacity = this.options.reducedMotion ? 0 : Math.min(0.45, Math.max(0, b.spin - 0.2) * 0.55);
    e.dashRing.material.opacity += ((b.dashing ? 0.85 : 0) - e.dashRing.material.opacity) * Math.min(1, dt * 12);

    // Burst: blade assembly flies off, ratchet + bit topple.
    if (b.state === BEY_STATE.Burst && e.burstAt >= 0) {
      const s = Math.max(0, t - e.burstAt);
      const up = Math.max(-0.6, 0.35 + s * 7 - s * s * 14);
      e.model.top.position.set((e.burstDir.x * s * 1.8) / (BEY_R * 1.15), up, (e.burstDir.y * s * 1.8) / (BEY_R * 1.15));
      e.model.top.rotation.set(s * 7, 0, s * 4);
      e.model.bottom.rotation.z = Math.min(1.3, s * 3);
      e.model.spinDisc.material.opacity = 0;
    }

    this.updateTrail(e, target, b);
  }

  private updateTrail(e: BeyEntity, pos: THREE.Vector3, b: BeyFrame) {
    const show = !this.options.reducedMotion && (b.state === BEY_STATE.Active || b.state === BEY_STATE.Out);
    e.trail.visible = show;
    if (!show) {
      e.history = [];
      return;
    }
    e.history.push(pos.clone().setY(pos.y + 0.02));
    if (e.history.length > TRAIL_POINTS) e.history.shift();
    const posAttr = e.trail.geometry.attributes.position as THREE.BufferAttribute;
    const colAttr = e.trail.geometry.attributes.color as THREE.BufferAttribute;
    const n = e.history.length;
    const width = BEY_R * (b.dashing ? 0.9 : 0.55);
    const strength = b.dashing ? 1 : 0.45;
    for (let i = 0; i < TRAIL_POINTS; i++) {
      const p = e.history[Math.min(n - 1, Math.max(0, i - (TRAIL_POINTS - n)))] ?? pos;
      const q = e.history[Math.min(n - 1, Math.max(0, i - (TRAIL_POINTS - n) + 1))] ?? pos;
      let dx = q.x - p.x;
      let dz = q.z - p.z;
      const len = Math.sqrt(dx * dx + dz * dz) || 1;
      dx /= len;
      dz /= len;
      const f = i / (TRAIL_POINTS - 1);
      const w = width * f;
      posAttr.setXYZ(i * 2, p.x - dz * w, p.y, p.z + dx * w);
      posAttr.setXYZ(i * 2 + 1, p.x + dz * w, p.y, p.z - dx * w);
      const c = f * f * strength;
      colAttr.setXYZ(i * 2, e.color.r * c, e.color.g * c, e.color.b * c);
      colAttr.setXYZ(i * 2 + 1, e.color.r * c, e.color.g * c, e.color.b * c);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  private updateSparks(dt: number) {
    const pos = this.sparkPoints.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.sparkPoints.geometry.attributes.color as THREE.BufferAttribute;
    const alive: Spark[] = [];
    for (const s of this.sparks) {
      s.life += dt;
      if (s.life >= s.maxLife) continue;
      s.vy -= 4.5 * dt;
      s.x += s.vx * dt;
      s.y = Math.max(bowlHeight(Math.sqrt(s.x * s.x + s.z * s.z)) + 0.005, s.y + s.vy * dt);
      s.z += s.vz * dt;
      s.vx *= 1 - dt * 2;
      s.vz *= 1 - dt * 2;
      alive.push(s);
    }
    this.sparks = alive;
    for (let i = 0; i < MAX_SPARKS; i++) {
      const s = alive[i];
      if (!s) {
        col.setXYZ(i, 0, 0, 0);
        continue;
      }
      const k = 1 - s.life / s.maxLife;
      pos.setXYZ(i, s.x, s.y, s.z);
      col.setXYZ(i, s.color.r * k * 1.6, s.color.g * k * 1.6, s.color.b * k * 1.6);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  private updatePulses(dt: number) {
    for (const p of this.rings) {
      p.life = Math.min(p.maxLife, p.life + dt);
      const k = p.life / p.maxLife;
      p.mesh.visible = k < 1;
      p.mesh.scale.setScalar(p.size * (1 + k * 3));
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8;
    }
    for (const p of this.flashes) {
      p.life = Math.min(p.maxLife, p.life + dt);
      const k = p.life / p.maxLife;
      p.mesh.visible = k < 1;
      p.mesh.scale.setScalar(p.size * (0.6 + k));
      (p.mesh.material as THREE.SpriteMaterial).opacity = 1 - k;
    }
  }

  private updateCamera() {
    const z = this.zoom;
    const k = (z - 1) / 0.14;
    this.look.lerpVectors(this.lookBase, this.focus, Math.max(0, Math.min(1, k)) * 0.6);
    const shakeX = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.06 : 0;
    const shakeY = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 0.06 : 0;
    this.camera.position.set(this.basePos.x + shakeX, this.basePos.y + shakeY, this.basePos.z);
    this.camera.zoom = z;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.look);
  }

  dispose() {
    for (const e of this.entities) e.model.dispose();
    for (const d of this.disposables) d.dispose();
    this.renderer.dispose();
  }
}
