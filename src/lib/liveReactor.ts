import type { Persona, ReactorEvents } from "./types";

export const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const API_VERSION = "v1alpha";

type ConnectFn = (params: any) => Promise<any>;

async function defaultConnect(params: any): Promise<any> {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new (GoogleGenAI as any)({
    apiKey: params.apiKey,
    httpOptions: { apiVersion: API_VERSION },
  });
  return ai.live.connect({
    model: params.model,
    config: params.config,
    callbacks: params.callbacks,
  });
}

function b64ToFloat32(b64: string): Float32Array {
  const bin = atob(b64);
  const n = bin.length / 2;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
    if (s >= 32768) s -= 65536;
    out[i] = s / 32768;
  }
  return out;
}

export class LiveReactor {
  private session: any = null;
  private caption = "";
  private stopped = false;
  private gotAudio = false;
  private everLive = false;
  constructor(private deps: { connect?: ConnectFn } = {}) {}

  async start(apiKey: string, persona: Persona, events: ReactorEvents): Promise<void> {
    this.stopped = false;
    this.everLive = false;
    const connect = this.deps.connect ?? defaultConnect;
    events.onStatus("connecting");
    const config = {
      responseModalities: ["AUDIO"],
      proactivity: { proactiveAudio: true },
      thinkingConfig: { thinkingBudget: 0 },
      mediaResolution: "MEDIA_RESOLUTION_LOW",
      outputAudioTranscription: {},
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: persona.voiceName } } },
      systemInstruction: { parts: [{ text: persona.systemInstruction }] },
    };
    this.session = await connect({
      apiKey,
      model: LIVE_MODEL,
      config,
      callbacks: {
        onopen: () => {
          this.everLive = true;
          events.onStatus("live");
        },
        onmessage: (m: any) => this.onMessage(m, events),
        onerror: (e: any) => events.onError(e?.message ?? String(e)),
        onclose: (e: any) => {
          events.onStatus("idle", e?.reason);
          if (this.stopped) return;
          // surface ANY non-deliberate close, including a drop AFTER going live (iOS suspends and
          // closes the socket on screen-lock/app-switch, often without warning) so the UI can react
          events.onError(
            this.everLive
              ? `the live connection dropped${e?.reason ? `: ${e.reason}` : ""}`
              : `connection closed${e?.reason ? `: ${e.reason}` : ""}`,
          );
        },
      },
    });
    if (this.stopped) {
      try {
        this.session?.close();
      } catch {}
      this.session = null;
    }
  }

  private onMessage(message: any, events: ReactorEvents): void {
    const sc = message?.serverContent;
    if (!sc) return;
    if (sc.interrupted) {
      this.caption = "";
      this.gotAudio = false;
      return;
    }
    if (sc.outputTranscription?.text) this.caption += sc.outputTranscription.text;
    for (const part of sc.modelTurn?.parts ?? []) {
      if (part.inlineData?.data) {
        events.onAudioChunk(b64ToFloat32(part.inlineData.data));
        this.gotAudio = true;
      }
    }
    if (sc.turnComplete) {
      const said = this.caption.trim();
      if (said || this.gotAudio) events.onReaction(said);
      this.caption = "";
      this.gotAudio = false;
    }
  }

  sendFrame(jpegBase64: string): void {
    this.session?.sendClientContent({
      turns: [
        { role: "user", parts: [{ inlineData: { mimeType: "image/jpeg", data: jpegBase64 } }] },
      ],
      turnComplete: true,
    });
  }

  stop(): void {
    this.stopped = true;
    try {
      this.session?.close();
    } catch {}
    this.session = null;
    this.caption = "";
  }
}
