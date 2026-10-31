import type { BattleFrame, BeyFrame } from "@/types/battle";
import { BEY_STATE } from "@/types/battle";
import type { BeyType, BeyVisual, SpinDirection } from "@/types/beyblade";
import { POCKETS, SIM_CONFIG } from "@/engine/config";
import { createRng } from "@/engine/random";
import { bladePath, ratchetTeethPath } from "@/components/beyblade/beyGeometry";

export interface RenderBey {
  visual: BeyVisual;
  type: BeyType;
  spin: SpinDirection;
  ratchetTeeth: number;
}

interface Particle {
  kind: "spark" | "ring" | "flash" | "shard";
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rot?: number;
  vrot?: number;
}

interface BeyGfx {
  blade: Path2D;
  teeth: Path2D;
  bladeFill: CanvasGradient | null;
  coreFill: CanvasGradient | null;
  angle: number;
  trail: { x: number; y: number }[];
}

export interface RenderOptions {
  lite: boolean;
  reducedMotion: boolean;
}

/** Common API of the 2D canvas and 3D WebGL stadium renderers. */
export interface ArenaRendererLike {
  setOptions(options: RenderOptions): void;
  resize(cssSize: number, devicePixelRatio: number): void;
  reset(): void;
  impact(x: number, y: number, intensity: number, colors: [string, string]): void;
  heavyFocus(x: number, y: number): void;
  releaseFocus(): void;
  dashBurst(x: number, y: number, color: string): void;
  burst(index: 0 | 1, x: number, y: number, t: number): void;
  knockout(index: 0 | 1, x: number, y: number, t: number, xtreme: boolean): void;
  render(frame: BattleFrame | null, launch: number, dt: number): void;
  dispose?(): void;
}

const WORLD_EXTENT = 1.3;
const BEY_R = SIM_CONFIG.stadium.beyRadius;
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);

export function interpolateFrame(frames: BattleFrame[], interval: number, t: number): BattleFrame {
  const maxIndex = frames.length - 1;
  const f = Math.max(0, Math.min(maxIndex, t / interval));
  const i = Math.floor(f);
  const a = frames[i];
  const b = frames[Math.min(maxIndex, i + 1)];
  const k = f - i;
  const lerp = (p: BeyFrame, q: BeyFrame): BeyFrame => ({
    x: p.x + (q.x - p.x) * k,
    y: p.y + (q.y - p.y) * k,
    spin: p.spin + (q.spin - p.spin) * k,
    momentum: p.momentum + (q.momentum - p.momentum) * k,
    wobble: p.wobble + (q.wobble - p.wobble) * k,
    dashing: p.dashing,
    state: p.state,
  });
  return { t, beys: [lerp(a.beys[0], b.beys[0]), lerp(a.beys[1], b.beys[1])] };
}

/** Canvas 2D renderer for the stadium, Beys and effects. Pure drawing — no React. */
export class ArenaRenderer implements ArenaRendererLike {
  private ctx: CanvasRenderingContext2D;
  private staticLayer: HTMLCanvasElement | null = null;
  private size = 0;
  private dpr = 1;
  private scale = 1;
  private particles: Particle[] = [];
  private gfx: [BeyGfx, BeyGfx];
  private shake = 0;
  private zoom = 1;
  private zoomTarget = 1;
  private focus = { x: 0, y: 0 };
  private burstAt: [number, number] = [-1, -1];
  private outAt: [number, number] = [-1, -1];
  private pocketFlash = { life: 0, dirX: 0, dirY: 1, color: "#ff7a2f" };

  constructor(
    private canvas: HTMLCanvasElement,
    private beys: [RenderBey, RenderBey],
    private options: RenderOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas 2D is not supported in this browser");
    this.ctx = ctx;
    this.gfx = beys.map<BeyGfx>((b) => ({
      blade: new Path2D(bladePath(b.type, b.visual.blades, b.spin)),
      teeth: new Path2D(ratchetTeethPath(b.ratchetTeeth)),
      bladeFill: null,
      coreFill: null,
      angle: Math.random() * Math.PI * 2,
      trail: [],
    })) as [BeyGfx, BeyGfx];
    this.createFills();
  }

  setOptions(options: RenderOptions) {
    this.options = options;
  }

  private createFills() {
    this.beys.forEach((b, i) => {
      const g = this.ctx.createRadialGradient(-0.3, -0.35, 0.05, 0, 0, 1.05);
      g.addColorStop(0, b.visual.secondary);
      g.addColorStop(0.35, b.visual.primary);
      g.addColorStop(1, "#05070b");
      this.gfx[i].bladeFill = g;
      const c = this.ctx.createRadialGradient(-0.08, -0.1, 0.01, 0, 0, 0.28);
      c.addColorStop(0, "#ffffff");
      c.addColorStop(0.4, b.visual.accent);
      c.addColorStop(1, b.visual.primary);
      this.gfx[i].coreFill = c;
    });
  }

  resize(cssSize: number, devicePixelRatio: number) {
    const dpr = Math.min(devicePixelRatio || 1, this.options.lite ? 1.25 : 2);
    if (cssSize === this.size && dpr === this.dpr && this.staticLayer) return;
    this.size = cssSize;
    this.dpr = dpr;
    this.canvas.width = Math.round(cssSize * dpr);
    this.canvas.height = Math.round(cssSize * dpr);
    this.scale = (cssSize / 2 / WORLD_EXTENT) * dpr;
    this.staticLayer = this.drawStadium();
  }

  reset() {
    this.particles = [];
    this.shake = 0;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.burstAt = [-1, -1];
    this.outAt = [-1, -1];
    this.pocketFlash.life = 0;
    this.gfx.forEach((g) => (g.trail = []));
  }

  // ---------- Stadium (static layer) ----------

  private drawStadium() {
    const layer = document.createElement("canvas");
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const ctx = layer.getContext("2d")!;
    const s = this.scale;
    ctx.translate(layer.width / 2, layer.height / 2);
    ctx.scale(s, s);
    ctx.lineWidth = 1 / s;

    // Housing
    const housing = ctx.createLinearGradient(-1.2, -1.2, 1.2, 1.2);
    housing.addColorStop(0, "#2a313c");
    housing.addColorStop(0.5, "#11151c");
    housing.addColorStop(1, "#1b212a");
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = housing;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 0.012;
    ctx.stroke();

    // Bolts around the housing
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 1.13, Math.sin(a) * 1.13, 0.018, 0, Math.PI * 2);
      ctx.fillStyle = "#56606f";
      ctx.fill();
    }

    // Pockets (Xtreme zone + two Over zones)
    for (const p of POCKETS) {
      const angle = Math.atan2(p.dirY, p.dirX);
      const half = Math.acos(p.minDot) + 0.06;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 1.235, angle - half, angle + half);
      ctx.arc(0, 0, 0.93, angle + half, angle - half, true);
      ctx.closePath();
      const pg = ctx.createRadialGradient(0, 0, 0.9, 0, 0, 1.24);
      pg.addColorStop(0, "#050608");
      pg.addColorStop(1, "#0d1016");
      ctx.fillStyle = pg;
      ctx.fill();
      ctx.strokeStyle = p.kind === "xtreme" ? "rgba(255,122,47,0.75)" : "rgba(56,211,245,0.45)";
      ctx.lineWidth = 0.012;
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.rotate(angle + Math.PI / 2);
      ctx.fillStyle = p.kind === "xtreme" ? "rgba(255,138,61,0.9)" : "rgba(160,220,240,0.55)";
      ctx.font = `700 ${p.kind === "xtreme" ? 0.085 : 0.05}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.kind === "xtreme" ? "X" : "OVER", 0, -1.14);
      ctx.restore();
    }

    // Outer wall ring (broken at pockets)
    const wall = typeof ctx.createConicGradient === "function" && !this.options.lite ? ctx.createConicGradient(-Math.PI / 4, 0, 0) : null;
    if (wall) {
      wall.addColorStop(0, "#d9dee6");
      wall.addColorStop(0.15, "#5d6674");
      wall.addColorStop(0.35, "#aeb6c2");
      wall.addColorStop(0.55, "#3c434e");
      wall.addColorStop(0.75, "#c3cad4");
      wall.addColorStop(1, "#d9dee6");
    }
    const segments: [number, number][] = [];
    const sorted = POCKETS.map((p) => ({ a: Math.atan2(p.dirY, p.dirX), h: Math.acos(p.minDot) + 0.06 })).sort((a, b) => a.a - b.a);
    for (let i = 0; i < sorted.length; i++) {
      const cur = sorted[i];
      const next = sorted[(i + 1) % sorted.length];
      segments.push([cur.a + cur.h, next.a - next.h + (i === sorted.length - 1 ? Math.PI * 2 : 0)]);
    }
    ctx.lineCap = "round";
    for (const [a0, a1] of segments) {
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, a0, a1);
      ctx.strokeStyle = wall ?? "#8a93a1";
      ctx.lineWidth = 0.065;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 0.968, a0, a1);
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 0.008;
      ctx.stroke();
    }

    // Xtreme Line rail with gear teeth
    const railIn = SIM_CONFIG.stadium.railRadius;
    ctx.beginPath();
    ctx.arc(0, 0, 0.965, 0, Math.PI * 2);
    ctx.arc(0, 0, railIn, 0, Math.PI * 2, true);
    const railGrad = ctx.createRadialGradient(0, 0, railIn, 0, 0, 0.965);
    railGrad.addColorStop(0, "#1a1f27");
    railGrad.addColorStop(0.5, "#262d38");
    railGrad.addColorStop(1, "#12161c");
    ctx.fillStyle = railGrad;
    ctx.fill("evenodd");
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 0.005;
    const teeth = this.options.lite ? 90 : 160;
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      ctx.moveTo(Math.cos(a) * (railIn + 0.045), Math.sin(a) * (railIn + 0.045));
      ctx.lineTo(Math.cos(a) * (railIn + 0.1), Math.sin(a) * (railIn + 0.1));
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, railIn + 0.02, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(56,211,245,0.28)";
    ctx.lineWidth = 0.008;
    if (!this.options.lite) {
      ctx.shadowColor = "rgba(56,211,245,0.8)";
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Bowl
    const bowl = ctx.createRadialGradient(-0.15, -0.2, 0.05, 0, 0, railIn);
    bowl.addColorStop(0, "#3a414d");
    bowl.addColorStop(0.55, "#232932");
    bowl.addColorStop(1, "#11151b");
    ctx.beginPath();
    ctx.arc(0, 0, railIn, 0, Math.PI * 2);
    ctx.fillStyle = bowl;
    ctx.fill();

    for (const r of [0.2, 0.42, 0.62]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 0.004;
      ctx.stroke();
    }

    // Subtle scratches (seeded so they never change between renders)
    const rng = createRng("stadium-scratches");
    const scratches = this.options.lite ? 30 : 90;
    for (let i = 0; i < scratches; i++) {
      const r = rng.range(0.05, railIn - 0.03);
      const a = rng.range(0, Math.PI * 2);
      const len = rng.range(0.04, 0.22);
      ctx.beginPath();
      ctx.arc(0, 0, r, a, a + len / r);
      ctx.strokeStyle = `rgba(255,255,255,${rng.range(0.02, 0.06).toFixed(3)})`;
      ctx.lineWidth = rng.range(0.001, 0.003);
      ctx.stroke();
    }

    // Centre emblem
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.04;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-0.1, -0.1);
    ctx.lineTo(0.1, 0.1);
    ctx.moveTo(0.1, -0.1);
    ctx.lineTo(-0.1, 0.1);
    ctx.stroke();
    ctx.restore();

    // Overhead light
    const light = ctx.createRadialGradient(-0.35, -0.45, 0.02, -0.35, -0.45, 0.9);
    light.addColorStop(0, "rgba(255,255,255,0.10)");
    light.addColorStop(1, "rgba(255,255,255,0)");
    ctx.beginPath();
    ctx.arc(0, 0, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = light;
    ctx.fill();
    return layer;
  }

  // ---------- Effects ----------

  impact(x: number, y: number, intensity: number, colors: [string, string]) {
    const lite = this.options.lite || this.options.reducedMotion;
    const count = Math.round((lite ? 6 : 16) * Math.min(2.5, 0.6 + intensity * 0.5));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 0.6 + Math.random() * 2.4 * Math.min(2, intensity * 0.6);
      this.particles.push({
        kind: "spark",
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        maxLife: 0.25 + Math.random() * 0.35,
        size: 0.006 + Math.random() * 0.008,
        color: Math.random() < 0.5 ? "#fff6d5" : Math.random() < 0.5 ? colors[0] : "#ffc14d",
      });
    }
    this.particles.push({ kind: "ring", x, y, vx: 0, vy: 0, life: 0, maxLife: 0.45, size: 0.08 + intensity * 0.05, color: "#ffffff" });
    this.particles.push({ kind: "flash", x, y, vx: 0, vy: 0, life: 0, maxLife: 0.18, size: 0.18 + intensity * 0.06, color: "#fff3c4" });
    if (!this.options.reducedMotion) {
      this.shake = Math.min(1, this.shake + intensity * (this.options.lite ? 0.12 : 0.22));
    }
  }

  heavyFocus(x: number, y: number) {
    if (this.options.reducedMotion) return;
    this.focus = { x, y };
    this.zoomTarget = this.options.lite ? 1.04 : 1.1;
  }

  releaseFocus() {
    this.zoomTarget = 1;
  }

  dashBurst(x: number, y: number, color: string) {
    const n = this.options.lite ? 4 : 10;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({ kind: "spark", x, y, vx: Math.cos(a) * 1.2, vy: Math.sin(a) * 1.2, life: 0, maxLife: 0.3, size: 0.006, color });
    }
    this.particles.push({ kind: "ring", x, y, vx: 0, vy: 0, life: 0, maxLife: 0.35, size: 0.1, color });
  }

  burst(index: 0 | 1, x: number, y: number, t: number) {
    this.burstAt[index] = t;
    const b = this.beys[index].visual;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      this.particles.push({
        kind: "shard",
        x,
        y,
        vx: Math.cos(a) * (0.7 + Math.random()),
        vy: Math.sin(a) * (0.7 + Math.random()),
        life: 0,
        maxLife: 1.4,
        size: 0.03 + Math.random() * 0.03,
        color: i % 2 ? b.primary : b.secondary,
        rot: Math.random() * 6,
        vrot: (Math.random() - 0.5) * 18,
      });
    }
    this.impact(x, y, 2.6, [b.accent, b.secondary]);
  }

  knockout(index: 0 | 1, x: number, y: number, t: number, xtreme: boolean) {
    this.outAt[index] = t;
    const r = Math.sqrt(x * x + y * y) || 1;
    this.pocketFlash = { life: 1, dirX: x / r, dirY: y / r, color: xtreme ? "#ff7a2f" : "#38d3f5" };
    this.impact(x, y, 2.2, ["#ffffff", xtreme ? "#ff7a2f" : "#38d3f5"]);
  }

  // ---------- Frame ----------

  /**
   * @param frame interpolated simulation frame (null before launch)
   * @param launch 0..1 launch animation progress (1 = in play)
   * @param dt seconds of simulated time since the previous render (for effects)
   */
  render(frame: BattleFrame | null, launch: number, dt: number) {
    const { ctx, canvas } = this;
    if (!this.staticLayer) return;
    const reduced = this.options.reducedMotion;
    const lite = this.options.lite;

    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 6);
    this.pocketFlash.life = Math.max(0, this.pocketFlash.life - dt * 1.2);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 14 * this.dpr : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 14 * this.dpr : 0;
    const z = this.zoom;
    const fx = this.focus.x * this.scale * (z - 1);
    const fy = this.focus.y * this.scale * (z - 1);

    ctx.translate(cx + sx - fx, cy + sy - fy);
    ctx.scale(z, z);
    ctx.drawImage(this.staticLayer, -cx, -cy);
    ctx.scale(this.scale, this.scale);

    if (this.pocketFlash.life > 0) {
      const { dirX, dirY, color, life } = this.pocketFlash;
      const g = ctx.createRadialGradient(dirX * 1.08, dirY * 1.08, 0, dirX * 1.08, dirY * 1.08, 0.5);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = life * 0.8;
      ctx.fillStyle = g;
      ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
      ctx.globalAlpha = 1;
    }

    if (frame) {
      for (const i of [0, 1] as const) this.drawShadowAndReflection(frame.beys[i], i, launch);
      if (!lite && !reduced) for (const i of [0, 1] as const) this.drawTrail(frame.beys[i], i);
      for (const i of [0, 1] as const) this.drawBey(frame.beys[i], i, launch, dt, frame.t);
    }
    this.drawParticles(dt);
  }

  private launchPose(b: BeyFrame, index: 0 | 1, launch: number) {
    if (launch >= 1) return { x: b.x, y: b.y, scale: 1, alpha: 1 };
    const e = easeOut(launch);
    const fromX = index === 0 ? -1.6 : 1.6;
    const fromY = -1.4;
    return {
      x: fromX + (b.x - fromX) * e,
      y: fromY + (b.y - fromY) * e,
      scale: 1 + (1 - e) * 0.9,
      alpha: Math.min(1, launch * 3),
    };
  }

  private drawShadowAndReflection(b: BeyFrame, index: 0 | 1, launch: number) {
    const { ctx } = this;
    const pose = this.launchPose(b, index, launch);
    if (b.state === BEY_STATE.Out && this.outAt[index] >= 0) return;
    const lift = (pose.scale - 1) * 0.35;
    const r = BEY_R * (1.05 + lift * 0.5);
    const g = ctx.createRadialGradient(pose.x + 0.03 + lift, pose.y + 0.05 + lift, r * 0.2, pose.x + 0.03 + lift, pose.y + 0.05 + lift, r * 1.25);
    g.addColorStop(0, `rgba(0,0,0,${0.55 * pose.alpha})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(pose.x - r * 2, pose.y - r * 2, r * 4.5, r * 4.5);

    const color = this.beys[index].visual.accent;
    const rg = ctx.createRadialGradient(pose.x, pose.y, 0, pose.x, pose.y, BEY_R * 2.2);
    rg.addColorStop(0, hexToRgba(color, 0.18 * b.spin));
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(pose.x - BEY_R * 2.2, pose.y - BEY_R * 2.2, BEY_R * 4.4, BEY_R * 4.4);
  }

  private drawTrail(b: BeyFrame, index: 0 | 1) {
    const { ctx } = this;
    const gfx = this.gfx[index];
    if (b.state !== BEY_STATE.Active && b.state !== BEY_STATE.Out) {
      gfx.trail.length = 0;
      return;
    }
    gfx.trail.push({ x: b.x, y: b.y });
    if (gfx.trail.length > (b.dashing ? 16 : 10)) gfx.trail.shift();
    if (gfx.trail.length < 2) return;
    const color = this.beys[index].visual.accent;
    for (let k = 1; k < gfx.trail.length; k++) {
      const p = gfx.trail[k - 1];
      const q = gfx.trail[k];
      const f = k / gfx.trail.length;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = hexToRgba(color, f * (b.dashing ? 0.7 : 0.3));
      ctx.lineWidth = BEY_R * (b.dashing ? 1.1 : 0.7) * f;
      ctx.lineCap = "round";
      ctx.stroke();
    }
    if (b.dashing) {
      const first = gfx.trail[0];
      const dx = b.x - first.x;
      const dy = b.y - first.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 0.004;
      for (const off of [-1, -0.4, 0.4, 1]) {
        ctx.beginPath();
        ctx.moveTo(b.x - (dx / len) * 0.12 + nx * off * BEY_R, b.y - (dy / len) * 0.12 + ny * off * BEY_R);
        ctx.lineTo(b.x - (dx / len) * 0.38 + nx * off * BEY_R, b.y - (dy / len) * 0.38 + ny * off * BEY_R);
        ctx.stroke();
      }
    }
  }

  private drawBey(b: BeyFrame, index: 0 | 1, launch: number, dt: number, t: number) {
    const { ctx } = this;
    const gfx = this.gfx[index];
    const bey = this.beys[index];
    const pose = this.launchPose(b, index, launch);
    const dir = bey.spin === "right" ? 1 : -1;
    gfx.angle += dir * (2 + b.spin * 40) * dt;

    let scale = pose.scale;
    let alpha = pose.alpha;
    if (b.state === BEY_STATE.Out && this.outAt[index] >= 0) {
      const since = Math.max(0, t - this.outAt[index]);
      scale *= Math.max(0.55, 1 - since * 0.5);
      alpha *= Math.max(0.35, 1 - since * 0.5);
    }
    const bursting = b.state === BEY_STATE.Burst && this.burstAt[index] >= 0;
    const r = BEY_R * scale;

    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.globalAlpha = alpha;
    // Wobble: precessing tilt rendered as a squash toward a rotating axis.
    if (b.wobble > 0.02) {
      const pa = t * (3 + b.wobble * 6);
      ctx.rotate(pa);
      ctx.scale(1, 1 - Math.min(0.28, b.wobble * 0.3));
      ctx.rotate(-pa);
      ctx.translate(Math.cos(pa) * b.wobble * 0.02, Math.sin(pa) * b.wobble * 0.02);
    }
    ctx.scale(r, r);

    if (bursting) {
      this.drawBurstPieces(index, t - this.burstAt[index]);
    } else {
      ctx.save();
      ctx.rotate(gfx.angle);
      const blur = !this.options.lite && !this.options.reducedMotion && b.spin > 0.25;
      if (blur) {
        ctx.fillStyle = hexToRgba(bey.visual.primary, 0.22 * b.spin);
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        for (const [off, a] of [
          [-0.35, 0.22],
          [-0.7, 0.1],
        ] as const) {
          ctx.save();
          ctx.rotate(off * dir);
          ctx.globalAlpha = alpha * a;
          ctx.fillStyle = gfx.bladeFill!;
          ctx.fill(gfx.blade);
          ctx.restore();
        }
        ctx.globalAlpha = alpha;
      }
      ctx.fillStyle = gfx.bladeFill!;
      ctx.fill(gfx.blade);
      ctx.strokeStyle = bey.visual.secondary;
      ctx.lineWidth = 0.035;
      ctx.lineJoin = "round";
      ctx.stroke(gfx.blade);
      this.drawCore(index);
      ctx.restore();
    }

    // Static specular highlight (the light source does not rotate with the Bey).
    ctx.beginPath();
    ctx.arc(0, 0, 0.92, Math.PI * 1.05, Math.PI * 1.55);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 0.06;
    ctx.lineCap = "round";
    ctx.stroke();

    if (b.dashing && !bursting) {
      ctx.beginPath();
      ctx.arc(0, 0, 1.18, 0, Math.PI * 2);
      ctx.strokeStyle = hexToRgba(bey.visual.accent, 0.8);
      ctx.lineWidth = 0.08;
      if (!this.options.lite) {
        ctx.shadowColor = bey.visual.accent;
        ctx.shadowBlur = 18;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  private drawCore(index: 0 | 1) {
    const { ctx } = this;
    const gfx = this.gfx[index];
    const bey = this.beys[index];
    ctx.beginPath();
    ctx.arc(0, 0, 0.6, 0, Math.PI * 2);
    ctx.strokeStyle = "#b8c0cc";
    ctx.lineWidth = 0.09;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 0.47, 0, Math.PI * 2);
    ctx.fillStyle = "#0b0e14";
    ctx.fill();
    ctx.strokeStyle = bey.visual.secondary;
    ctx.lineWidth = 0.05;
    ctx.lineCap = "round";
    ctx.stroke(gfx.teeth);
    ctx.beginPath();
    ctx.arc(0, 0, 0.26, 0, Math.PI * 2);
    ctx.fillStyle = gfx.coreFill!;
    ctx.fill();
  }

  private drawBurstPieces(index: 0 | 1, since: number) {
    const { ctx } = this;
    const gfx = this.gfx[index];
    const spread = easeOut(Math.min(1, since * 1.5)) * 1.6;
    const fade = Math.max(0, 1 - since * 0.7);
    for (let k = 0; k < 3; k++) {
      const a0 = (k / 3) * Math.PI * 2 + gfx.angle;
      const mid = a0 + Math.PI / 3;
      ctx.save();
      ctx.globalAlpha *= fade;
      ctx.translate(Math.cos(mid) * spread, Math.sin(mid) * spread);
      ctx.rotate(gfx.angle + since * (k - 1) * 4);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 1.2, a0 - gfx.angle, a0 - gfx.angle + (Math.PI * 2) / 3);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = gfx.bladeFill!;
      ctx.fill(gfx.blade);
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha *= 0.9;
    this.drawCore(index);
    ctx.restore();
  }

  private drawParticles(dt: number) {
    const { ctx } = this;
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      if (p.life >= p.maxLife) continue;
      next.push(p);
      const k = 1 - p.life / p.maxLife;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 3;
      p.vy *= 1 - dt * 3;
      if (p.kind === "spark") {
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = k;
        ctx.lineWidth = p.size;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if (p.kind === "ring") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * 2.5), 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = k * 0.7;
        ctx.lineWidth = 0.012 * k + 0.002;
        ctx.stroke();
      } else if (p.kind === "flash") {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, hexToRgba(p.color, 0.9 * k));
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      } else {
        p.rot = (p.rot ?? 0) + (p.vrot ?? 0) * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = k;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(-p.size, -p.size * 0.4);
        ctx.lineTo(p.size, 0);
        ctx.lineTo(-p.size * 0.6, p.size * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    this.particles = next;
  }
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, "$1$1") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}
