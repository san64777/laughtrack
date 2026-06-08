import type { Emotion } from "../lib/types";

interface Blob {
  x: number;
  phase: number;
  color: string;
}

export class Crowd {
  private ctx: CanvasRenderingContext2D;
  private blobs: Blob[] = [];
  private emotion: Emotion = "idle";

  constructor(
    private canvas: HTMLCanvasElement,
    palette: string[],
    count = 7,
  ) {
    this.ctx = canvas.getContext("2d")!;
    for (let i = 0; i < count; i++) {
      this.blobs.push({ x: (i + 0.5) / count, phase: i * 1.3, color: palette[i % palette.length] });
    }
  }

  setEmotion(e: Emotion): void {
    this.emotion = e;
  }

  tick(amplitude: number, timeMs: number): void {
    const { width: W, height: H } = this.canvas;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    const reacting = this.emotion !== "idle";
    const r = W / (this.blobs.length * 1.8);
    for (const b of this.blobs) {
      const bob = Math.sin(timeMs / 380 + b.phase) * (reacting ? 6 : 2);
      const pop = reacting ? 6 + amplitude * 26 : 0;
      const cx = b.x * W;
      const baseY = H - r - 6;
      const cy = baseY - bob - pop;
      this.drawBlob(cx, cy, r, b.color, this.emotion, amplitude);
    }
  }

  private drawBlob(
    cx: number,
    cy: number,
    r: number,
    color: string,
    e: Emotion,
    amp: number,
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 1.1, 0, 0, Math.PI * 2);
    ctx.fill();
    const wide = e === "gasp" || e === "boo";
    const ew = r * (wide ? 0.34 : 0.26);
    const eh = r * (wide ? 0.42 : 0.3);
    for (const dx of [-r * 0.32, r * 0.32]) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy - r * 0.18, ew, eh, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#16181f";
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy - r * 0.14, ew * 0.42, eh * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const open = e === "idle" ? 1.5 : 3 + amp * r * 0.9;
    ctx.fillStyle = "#14060a";
    ctx.beginPath();
    if (e === "laugh" || e === "cheer") {
      ctx.ellipse(cx, cy + r * 0.34, r * 0.32, open, 0, 0, Math.PI);
    } else {
      ctx.ellipse(cx, cy + r * 0.36, r * 0.2, open, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}
