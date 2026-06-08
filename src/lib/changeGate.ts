export interface ChangeGateOptions {
  threshold: number;
  minIntervalMs: number;
}

export class ChangeGate {
  private prev: Float32Array | null = null;
  private lastSentAt = -Infinity;
  constructor(private opts: ChangeGateOptions) {}

  shouldSend(gray: Float32Array, nowMs: number): boolean {
    if (nowMs - this.lastSentAt < this.opts.minIntervalMs) return false;
    if (this.prev === null) return this.accept(gray, nowMs);
    let sum = 0;
    for (let i = 0; i < gray.length; i++) sum += Math.abs(gray[i] - this.prev[i]);
    if (sum / gray.length < this.opts.threshold) return false;
    return this.accept(gray, nowMs);
  }

  private accept(gray: Float32Array, nowMs: number): boolean {
    this.prev = gray;
    this.lastSentAt = nowMs;
    return true;
  }

  reset(): void {
    this.prev = null;
    this.lastSentAt = -Infinity;
  }
}
