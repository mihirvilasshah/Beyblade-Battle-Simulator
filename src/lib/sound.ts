/** Procedural Web Audio sound effects — no audio assets required. */
export type SoundName =
  | "countdown"
  | "go"
  | "launch"
  | "collision"
  | "heavy"
  | "dash"
  | "burst"
  | "knockout"
  | "victory";

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode; osc2: OscillatorNode } | null = null;

  /** Must be called from a user gesture. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const length = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running";
  }

  private tone(freq: number, duration: number, type: OscillatorType, volume: number, endFreq?: number, delay = 0) {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  private burstNoise(duration: number, volume: number, filterFreq: number, q = 1, sweepTo?: number) {
    if (!this.ctx || !this.master || !this.noise) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(filterFreq, t);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, t + duration);
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + duration + 0.05);
  }

  play(name: SoundName, intensity = 1) {
    if (!this.ready) return;
    const v = Math.min(1.5, Math.max(0.3, intensity));
    switch (name) {
      case "countdown":
        this.tone(660, 0.14, "square", 0.12);
        break;
      case "go":
        this.tone(880, 0.35, "sawtooth", 0.14, 1320);
        this.burstNoise(0.4, 0.2, 2000, 0.8, 6000);
        break;
      case "launch":
        this.burstNoise(0.7, 0.35, 600, 0.7, 5000);
        this.tone(180, 0.6, "sawtooth", 0.08, 520);
        break;
      case "collision":
        this.burstNoise(0.12, 0.3 * v, 3200, 2);
        this.tone(1800 + Math.random() * 800, 0.06, "triangle", 0.06 * v);
        break;
      case "heavy":
        this.burstNoise(0.35, 0.55, 1200, 0.9, 300);
        this.tone(90, 0.4, "sine", 0.35, 40);
        break;
      case "dash":
        this.tone(320, 0.45, "sawtooth", 0.08, 1600);
        this.burstNoise(0.45, 0.18, 1500, 1.2, 7000);
        break;
      case "burst":
        this.burstNoise(0.6, 0.6, 900, 0.6, 150);
        this.tone(140, 0.5, "square", 0.12, 50);
        for (let i = 0; i < 4; i++) this.tone(2400 - i * 300, 0.05, "triangle", 0.05, undefined, 0.05 + i * 0.07);
        break;
      case "knockout":
        this.burstNoise(0.6, 0.4, 3000, 0.8, 200);
        this.tone(70, 0.5, "sine", 0.4, 35, 0.12);
        break;
      case "victory":
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.5, "triangle", 0.12, undefined, i * 0.12));
        break;
    }
  }

  /** Continuous spin hum; level 0-1. */
  setSpinHum(level: number) {
    if (!this.ctx || !this.master) return;
    if (level <= 0.01) {
      if (this.hum) {
        const { osc, osc2, gain } = this.hum;
        gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
        osc.stop(this.ctx.currentTime + 0.4);
        osc2.stop(this.ctx.currentTime + 0.4);
        this.hum = null;
      }
      return;
    }
    if (!this.ready) return;
    if (!this.hum) {
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc2.type = "sine";
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      gain.gain.value = 0.0001;
      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain).connect(this.master);
      osc.start();
      osc2.start();
      this.hum = { osc, osc2, gain };
    }
    const t = this.ctx.currentTime;
    this.hum.osc.frequency.setTargetAtTime(70 + level * 160, t, 0.1);
    this.hum.osc2.frequency.setTargetAtTime(140 + level * 320, t, 0.1);
    this.hum.gain.gain.setTargetAtTime(0.025 + level * 0.035, t, 0.1);
  }
}
