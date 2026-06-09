import type { Emotion } from "../lib/types";

interface Blob {
  x: number;
  phase: number;
  color: string;
  scale: number;
  blink: number;
}

// lighten (amt > 0) or darken (amt < 0) a #rrggbb color
function shade(hex: string, amt: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  const r = clamp((n >> 16) & 255);
  const g = clamp((n >> 8) & 255);
  const b = clamp(n & 255);
  return `rgb(${r},${g},${b})`;
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
      this.blobs.push({
        x: (i + 0.5) / count,
        phase: i * 1.3,
        color: palette[i % palette.length],
        scale: 0.84 + ((i * 7) % 5) * 0.07,
        blink: (i * 1.7) % 4,
      });
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
    const base = W / (this.blobs.length * 1.8);
    const t = timeMs / 1000;
    for (const b of this.blobs) {
      const r = base * b.scale;
      const bob = Math.sin(timeMs / 380 + b.phase) * (reacting ? 6 : 2.2);
      const pop = reacting ? 6 + amplitude * 30 : 0;
      const lift = bob + pop;
      const cx = b.x * W;
      const groundY = H - 4;
      const cy = groundY - r - lift;
      const sx = 1 - lift * 0.006;
      const sy = 1 + lift * 0.008;
      const blinkOpen = (t + b.blink) % 4 > 0.13 ? 1 : 0.12;
      this.drawBlob(cx, cy, r, sx, sy, b.color, this.emotion, amplitude, blinkOpen, groundY);
    }
  }

  private drawBlob(
    cx: number,
    cy: number,
    r: number,
    sx: number,
    sy: number,
    color: string,
    e: Emotion,
    amp: number,
    blinkOpen: number,
    groundY: number,
  ): void {
    const ctx = this.ctx;
    const bw = r * sx;
    const bh = r * 1.12 * sy;
    const wide = e === "gasp" || e === "boo";

    // ground shadow
    ctx.fillStyle = "rgba(0,0,0,0.26)";
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 2, r * 0.8 * sx, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // arms thrown up on a cheer
    if (e === "cheer" || e === "applause") {
      ctx.strokeStyle = shade(color, -0.08);
      ctx.lineWidth = r * 0.22;
      ctx.lineCap = "round";
      const raise = Math.min(0.55, 0.42 + amp * 2);
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * bw * 0.7, cy + bh * 0.1);
        ctx.lineTo(cx + s * bw * 1.05, cy - bh * (0.35 + raise));
        ctx.stroke();
      }
    }

    // body with soft top-to-bottom shading
    const grad = ctx.createLinearGradient(cx, cy - bh, cx, cy + bh);
    grad.addColorStop(0, shade(color, 0.17));
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, shade(color, -0.15));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bw, bh, 0, 0, Math.PI * 2);
    ctx.fill();

    // glossy highlight
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(cx - bw * 0.28, cy - bh * 0.46, bw * 0.34, bh * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // blush
    ctx.fillStyle = "rgba(255,120,120,0.22)";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + s * r * 0.46, cy + r * 0.12, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // eyes
    const ew = r * (wide ? 0.32 : 0.25);
    const eh = r * (wide ? 0.4 : 0.3) * blinkOpen;
    for (const dx of [-r * 0.32, r * 0.32]) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(cx + dx, cy - r * 0.16, ew, eh, 0, 0, Math.PI * 2);
      ctx.fill();
      if (blinkOpen > 0.5) {
        ctx.fillStyle = "#16181f";
        ctx.beginPath();
        ctx.ellipse(cx + dx, cy - r * 0.12, ew * 0.5, eh * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.ellipse(cx + dx - ew * 0.2, cy - r * 0.19, ew * 0.16, eh * 0.16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // eyebrows convey the emotion
    ctx.strokeStyle = shade(color, -0.32);
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.lineCap = "round";
    const browY = cy - r * 0.5;
    for (const s of [-1, 1]) {
      const bx = cx + s * r * 0.32;
      ctx.beginPath();
      if (e === "boo") {
        ctx.moveTo(bx - s * r * 0.16, browY - r * 0.05);
        ctx.lineTo(bx + s * r * 0.14, browY + r * 0.08);
      } else if (e === "gasp") {
        ctx.moveTo(bx - r * 0.14, browY - r * 0.07);
        ctx.lineTo(bx + r * 0.14, browY - r * 0.07);
      } else if (e === "cheer" || e === "laugh") {
        ctx.moveTo(bx - r * 0.14, browY);
        ctx.quadraticCurveTo(bx, browY - r * 0.11, bx + r * 0.14, browY);
      } else {
        continue;
      }
      ctx.stroke();
    }

    // mouth
    const open = e === "idle" ? r * 0.06 : r * (0.18 + amp * 0.7);
    ctx.fillStyle = "#3a0a12";
    ctx.beginPath();
    if (e === "laugh" || e === "cheer") {
      ctx.ellipse(cx, cy + r * 0.34, r * 0.34, open, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#ff6b8a";
      ctx.beginPath();
      ctx.ellipse(cx, cy + r * 0.34 + open * 0.45, r * 0.2, open * 0.5, 0, 0, Math.PI);
      ctx.fill();
    } else if (e === "boo") {
      ctx.ellipse(cx, cy + r * 0.42, r * 0.22, open, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.ellipse(cx, cy + r * 0.4, r * 0.16, open, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
