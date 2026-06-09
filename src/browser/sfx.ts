import type { Emotion } from "../lib/types";

// Asset-free synthesized crowd SFX, layered under the Gemini voice. Subtle by design and
// default-muted; the voice is the real reaction, this is just a little extra juice.
export class SfxBank {
  private master: GainNode;
  private baseGain = 0.22;

  constructor(
    private ctx: AudioContext,
    outs: AudioNode[],
    muted = true,
  ) {
    this.master = ctx.createGain();
    this.master.gain.value = muted ? 0 : this.baseGain;
    for (const o of outs) this.master.connect(o);
  }

  setMuted(m: boolean): void {
    this.master.gain.setTargetAtTime(m ? 0 : this.baseGain, this.ctx.currentTime, 0.01);
  }

  play(e: Emotion): void {
    switch (e) {
      case "cheer":
        this.whoop();
        break;
      case "applause":
        this.noiseBurst(0.55, 1400);
        break;
      case "laugh":
        this.blips([440, 540, 480, 600]);
        break;
      case "gasp":
        this.sweep(280, 920, 0.2);
        break;
      case "boo":
        this.tone(150, 0.4, "sawtooth", true);
        break;
      default:
        break;
    }
  }

  private env(node: AudioNode, dur: number, peak = 1): GainNode {
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g);
    g.connect(this.master);
    return g;
  }

  private tone(freq: number, dur: number, type: OscillatorType, descend = false): void {
    const o = this.ctx.createOscillator();
    o.type = type;
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(freq, t);
    if (descend) o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur);
    this.env(o, dur, 0.8);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private whoop(): void {
    const t = this.ctx.currentTime;
    for (const base of [330, 440]) {
      const o = this.ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.25);
      this.env(o, 0.35, 0.6);
      o.start(t);
      o.stop(t + 0.4);
    }
    this.noiseBurst(0.3, 2200);
  }

  private blips(freqs: number[]): void {
    let t = this.ctx.currentTime;
    for (const f of freqs) {
      const o = this.ctx.createOscillator();
      o.type = "square";
      o.frequency.setValueAtTime(f, t);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.1);
      t += 0.09;
    }
  }

  private sweep(f0: number, f1: number, dur: number): void {
    const o = this.ctx.createOscillator();
    o.type = "sine";
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    this.env(o, dur, 0.5);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseBurst(dur: number, lpHz: number): void {
    const sr = this.ctx.sampleRate;
    const n = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = lpHz;
    src.connect(lp);
    this.env(lp, dur, 0.5);
    src.start(this.ctx.currentTime);
  }
}
