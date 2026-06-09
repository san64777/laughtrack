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
    const chunks: BlobPart[] = [];

    return await new Promise<Blob>((resolve, reject) => {
      let rec: MediaRecorder;
      try {
        // Safari can report isTypeSupported() true yet throw at construction; treat as unsupported
        rec = new MediaRecorder(stream, { mimeType: mime });
      } catch (e) {
        cancelAnimationFrame(this.raf);
        reject(e instanceof Error ? e : new Error("recording is not supported on this browser"));
        return;
      }
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      // iOS pauses the canvas draw loop when the page hides; stop early so the user keeps the good
      // prefix instead of a frozen or never-finalized clip
      const onHide = () => {
        if (document.hidden && rec.state !== "inactive") rec.stop();
      };
      document.addEventListener("visibilitychange", onHide);
      const cleanup = () => {
        cancelAnimationFrame(this.raf);
        document.removeEventListener("visibilitychange", onHide);
      };
      rec.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: mime });
        // a 0-byte blob is the documented iOS MediaRecorder failure; fail loudly, do not "save" it
        if (blob.size === 0) {
          reject(new Error("the recorder produced an empty clip"));
          return;
        }
        resolve(blob);
      };
      try {
        // a 250ms timeslice makes iOS flush data incrementally and write a valid moov atom
        rec.start(250);
      } catch (e) {
        cleanup();
        reject(e instanceof Error ? e : new Error("could not start recording"));
        return;
      }
      setTimeout(() => {
        if (rec.state !== "inactive") {
          try {
            rec.requestData();
          } catch {}
          rec.stop();
        }
      }, ms);
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
