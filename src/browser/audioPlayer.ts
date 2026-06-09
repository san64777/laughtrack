export class AudioPlayer {
  private ctx: AudioContext | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private nextStart = 0;
  private live: AudioBufferSourceNode[] = [];
  private analyser: AnalyserNode | null = null;
  private ampBuf = new Float32Array(0);

  start(): MediaStream {
    // iOS Safari historically only exposes webkitAudioContext
    const Ctor: typeof AudioContext = window.AudioContext ?? (window as any).webkitAudioContext;
    this.ctx = new Ctor();
    // iOS: route Web Audio to the speaker even when the mute/ring switch is on
    this.applyPlaybackSession();
    // iOS Safari starts the AudioContext suspended; resume it within the go-live gesture
    void this.ctx.resume();
    // iOS drops the context into "suspended"/"interrupted" on lock, calls, Control Center or app
    // switch and never auto-resumes; re-resume (and re-assert playback) whenever that happens
    this.ctx.onstatechange = () => {
      const st = this.ctx?.state;
      if (st && st !== "running" && st !== "closed") {
        this.applyPlaybackSession();
        void this.ctx?.resume();
      }
    };
    // unlock speaker output inside the gesture with a 1-sample silent blip
    try {
      const blip = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = blip;
      src.connect(this.ctx.destination);
      src.start(0);
    } catch {}
    // createMediaStreamDestination + createAnalyser can be unavailable/flaky on iOS Safari;
    // degrade gracefully so live voice still plays even if these fail (only recording-audio + bounce are lost)
    try {
      this.dest = this.ctx.createMediaStreamDestination();
    } catch {
      this.dest = null;
    }
    try {
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.ampBuf = new Float32Array(this.analyser.fftSize);
    } catch {
      this.analyser = null;
    }
    this.nextStart = this.ctx.currentTime;
    return this.dest?.stream ?? new MediaStream();
  }

  /** "running" | "suspended" | "interrupted" | "closed" | "none" - shown in the on-screen diagnostic */
  state(): string {
    return this.ctx?.state ?? "none";
  }

  /** iOS: play Web Audio through the speaker even with the mute/ring switch on */
  private applyPlaybackSession(): void {
    try {
      (navigator as any).audioSession.type = "playback";
    } catch {}
  }

  /** wake the speaker when the page returns to the foreground (call on visibilitychange) */
  resume(): void {
    if (!this.ctx) return;
    this.applyPlaybackSession();
    void this.ctx.resume();
    if (this.nextStart < this.ctx.currentTime) this.nextStart = this.ctx.currentTime;
  }

  play(f: Float32Array): void {
    if (!this.ctx) return;
    void this.ctx.resume();
    const buf = this.ctx.createBuffer(1, f.length, 24000);
    buf.copyToChannel(new Float32Array(f), 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);
    if (this.dest) src.connect(this.dest);
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
