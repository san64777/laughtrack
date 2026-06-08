function pickMime(): string {
  const candidates = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  for (const m of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(m)) return m;
  }
  return "video/webm";
}

export interface RecordSources {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
  audio: MediaStream;
}

export class Recorder {
  private canvas = document.createElement("canvas");
  private raf = 0;
  private rec: MediaRecorder | null = null;

  async record(src: RecordSources, ms = 15000): Promise<Blob> {
    this.canvas.width = src.width;
    this.canvas.height = src.height;
    const ctx = this.canvas.getContext("2d")!;
    const loop = () => {
      src.draw(ctx);
      this.raf = requestAnimationFrame(loop);
    };
    loop();

    const mime = pickMime();
    const stream = this.canvas.captureStream(30);
    for (const tr of src.audio.getAudioTracks()) stream.addTrack(tr);
    const rec = new MediaRecorder(stream, { mimeType: mime });
    this.rec = rec;
    const chunks: BlobPart[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    return await new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        cancelAnimationFrame(this.raf);
        resolve(new Blob(chunks, { type: mime }));
      };
      rec.start();
      setTimeout(() => rec.state !== "inactive" && rec.stop(), ms);
    });
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
