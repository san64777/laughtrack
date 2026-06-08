import { rms } from "./pcm";

export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private nextStart = 0;
  private live: AudioBufferSourceNode[] = [];
  private amp = 0;

  start(): MediaStream {
    this.ctx = new AudioContext();
    this.dest = this.ctx.createMediaStreamDestination();
    this.nextStart = this.ctx.currentTime;
    return this.dest.stream;
  }

  play(f: Float32Array): void {
    if (!this.ctx || !this.dest) return;
    const buf = this.ctx.createBuffer(1, f.length, 24000);
    buf.copyToChannel(new Float32Array(f), 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    src.connect(this.dest);
    if (this.nextStart < this.ctx.currentTime) this.nextStart = this.ctx.currentTime;
    src.start(this.nextStart);
    this.nextStart += buf.duration;
    this.amp = rms(f);
    this.live.push(src);
    src.onended = () => {
      this.live = this.live.filter((s) => s !== src);
    };
    setTimeout(
      () => {
        this.amp = 0;
      },
      Math.max(0, buf.duration * 1000),
    );
  }

  amplitude(): number {
    return this.amp;
  }

  /** the recorder taps this stream so the MP4 carries the crowd's voice */
  stream(): MediaStream {
    return this.dest?.stream ?? new MediaStream();
  }

  stop(): void {
    this.live.forEach((s) => {
      try {
        s.stop();
      } catch {}
    });
    this.live = [];
    this.amp = 0;
    if (this.ctx) this.nextStart = this.ctx.currentTime;
  }
}
