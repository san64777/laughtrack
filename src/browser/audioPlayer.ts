export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private nextStart = 0;
  private live: AudioBufferSourceNode[] = [];
  private analyser: AnalyserNode | null = null;
  private ampBuf = new Float32Array(0);

  start(): MediaStream {
    this.ctx = new AudioContext();
    // iOS Safari starts the AudioContext suspended; resume it within the go-live gesture
    void this.ctx.resume();
    this.dest = this.ctx.createMediaStreamDestination();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.ampBuf = new Float32Array(this.analyser.fftSize);
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
    if (this.analyser) src.connect(this.analyser);
    if (this.nextStart < this.ctx.currentTime) this.nextStart = this.ctx.currentTime;
    src.start(this.nextStart);
    this.nextStart += buf.duration;
    this.live.push(src);
    src.onended = () => {
      this.live = this.live.filter((s) => s !== src);
    };
  }

  amplitude(): number {
    if (!this.analyser) return 0;
    this.analyser.getFloatTimeDomainData(this.ampBuf);
    let sum = 0;
    for (let i = 0; i < this.ampBuf.length; i++) sum += this.ampBuf[i] * this.ampBuf[i];
    return Math.sqrt(sum / this.ampBuf.length);
  }

  context(): AudioContext | null {
    return this.ctx;
  }

  recordNode(): AudioNode | null {
    return this.dest;
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
    if (this.ctx) this.nextStart = this.ctx.currentTime;
    this.ctx?.close();
    this.ctx = null;
    this.dest = null;
    this.analyser = null;
  }
}
