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
        video: { width: 640, height: 480 },
        audio: false,
      });
      this.video.srcObject = this.stream;
      await this.video.play();
    } else {
      this.renderDemo();
    }
  }

  el(): HTMLVideoElement | HTMLCanvasElement {
    return this.mode === "webcam" ? this.video : this.board;
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
