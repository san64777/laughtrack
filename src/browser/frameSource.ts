export type SourceMode = "webcam" | "demo";

const GW = 32;
const GH = 24;

export class FrameSource {
  private video = document.createElement("video");
  private board = document.createElement("canvas");
  private cap = document.createElement("canvas");
  private gray = document.createElement("canvas");
  private stream: MediaStream | null = null;
  private demoIdx = 0;
  private demo = [
    { bg: "#3b2f1e", emoji: "🥪" },
    { bg: "#1e3b39", emoji: "💦" },
    { bg: "#2a1e3b", emoji: "💇" },
    { bg: "#3b1e2a", emoji: "🤪" },
  ];

  constructor(private mode: SourceMode) {
    this.video.autoplay = true;
    this.video.muted = true;
    this.video.playsInline = true;
    this.cap.width = 640;
    this.cap.height = 480;
    this.board.width = 640;
    this.board.height = 480;
    this.gray.width = GW;
    this.gray.height = GH;
  }

  async start(): Promise<void> {
    if (this.mode === "webcam") {
      this.stream = await navigator.mediaDevices.getUserMedia({
        // facingMode "user" so iOS opens the FRONT (selfie) camera - the preview + recording are
        // both mirrored, which only makes sense for the front camera; "ideal" still resolves on a
        // single-camera device instead of throwing
        video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
      // play() resolving only means playback was permitted, not that a frame is decoded; wait for
      // real pixels so the first frames streamed to the model are not black (iOS camera warms slowly)
      await this.videoReady();
    } else {
      this.renderDemo();
    }
  }

  el(): HTMLVideoElement | HTMLCanvasElement {
    return this.mode === "webcam" ? this.video : this.board;
  }

  /** true once there is a real frame to draw (demo is always ready) */
  private ready(): boolean {
    return this.mode === "demo" || (this.video.readyState >= 2 && this.video.videoWidth > 0);
  }

  private videoReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.ready()) return resolve();
      const done = () => {
        this.video.removeEventListener("loadeddata", done);
        resolve();
      };
      this.video.addEventListener("loadeddata", done);
      // never hang the go-live flow if the event is missed
      setTimeout(done, 1500);
    });
  }

  nextDemo(): void {
    this.demoIdx++;
    this.renderDemo();
  }

  private renderDemo(): void {
    const c = this.board.getContext("2d")!;
    const s = this.demo[this.demoIdx % this.demo.length];
    c.fillStyle = s.bg;
    c.fillRect(0, 0, this.board.width, this.board.height);
    c.font = "220px serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(s.emoji, this.board.width / 2, this.board.height / 2);
  }

  graySample(): Float32Array {
    // skip black/garbage frames before the camera has decoded a frame (the all-zero sample reads
    // as "no change" to the gate, so no empty frame gets sent to the model)
    if (!this.ready()) return new Float32Array(GW * GH);
    const g = this.gray.getContext("2d")!;
    g.drawImage(this.el(), 0, 0, GW, GH);
    const d = g.getImageData(0, 0, GW, GH).data;
    const out = new Float32Array(GW * GH);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) {
      out[j] = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
    }
    return out;
  }

  captureJpeg(): string {
    const c = this.cap.getContext("2d")!;
    c.drawImage(this.el(), 0, 0, this.cap.width, this.cap.height);
    return this.cap.toDataURL("image/jpeg", 0.6).split(",")[1];
  }

  stop(): void {
    this.stream?.getTracks().forEach((t) => {
      t.stop();
    });
    this.stream = null;
  }
}
