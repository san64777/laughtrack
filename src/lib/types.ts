export type Emotion = "idle" | "cheer" | "gasp" | "laugh" | "boo" | "applause";

export type PersonaId = "hype" | "posh" | "heckle";

export interface Persona {
  id: PersonaId;
  label: string;
  systemInstruction: string;
  voiceName: string;
  palette: string[];
}

export type ReactorStatus = "idle" | "connecting" | "live" | "error";

export interface ReactorEvents {
  onStatus: (s: ReactorStatus, detail?: string) => void;
  onReaction: (text: string) => void;
  onAudioChunk: (pcm: Float32Array) => void;
  onError: (message: string) => void;
}
