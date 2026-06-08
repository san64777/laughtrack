import { expect, test } from "bun:test";
import { LiveReactor } from "./liveReactor";
import { personaById } from "./personas";

function fakeConnect() {
  const calls: any[] = [];
  let cbs: any;
  const session = {
    sent: [] as any[],
    sendClientContent: (m: any) => session.sent.push(m),
    close: () => calls.push("close"),
  };
  return {
    calls,
    session,
    connect: async (params: any) => {
      cbs = params.callbacks;
      calls.push(params);
      queueMicrotask(() => cbs.onopen?.());
      return session;
    },
    emit: (msg: any) => cbs.onmessage(msg),
  };
}

test("connects with the proven config and reports live", async () => {
  const f = fakeConnect();
  const statuses: string[] = [];
  const r = new LiveReactor({ connect: f.connect });
  await r.start("KEY", personaById("heckle"), {
    onStatus: (s) => statuses.push(s),
    onReaction: () => {},
    onAudioChunk: () => {},
    onError: () => {},
  });
  const cfg = f.calls[0].config;
  expect(f.calls[0].model).toBe("gemini-2.5-flash-native-audio-preview-12-2025");
  expect(cfg.proactivity.proactiveAudio).toBe(true);
  expect(cfg.thinkingConfig.thinkingBudget).toBe(0);
  expect(cfg.outputAudioTranscription).toBeDefined();
  expect(statuses).toContain("live");
});

test("sendFrame sends a completed-turn image", async () => {
  const f = fakeConnect();
  const r = new LiveReactor({ connect: f.connect });
  await r.start("KEY", personaById("hype"), {
    onStatus: () => {},
    onReaction: () => {},
    onAudioChunk: () => {},
    onError: () => {},
  });
  r.sendFrame("BASE64JPEG");
  const sent = f.session.sent[0];
  expect(sent.turnComplete).toBe(true);
  expect(sent.turns[0].parts[0].inlineData.mimeType).toBe("image/jpeg");
  expect(sent.turns[0].parts[0].inlineData.data).toBe("BASE64JPEG");
});

test("routes transcription to onReaction on turnComplete", async () => {
  const f = fakeConnect();
  const reactions: string[] = [];
  const r = new LiveReactor({ connect: f.connect });
  await r.start("KEY", personaById("hype"), {
    onStatus: () => {},
    onReaction: (t) => reactions.push(t),
    onAudioChunk: () => {},
    onError: () => {},
  });
  f.emit({ serverContent: { outputTranscription: { text: "Boo" } } });
  f.emit({ serverContent: { turnComplete: true } });
  expect(reactions).toEqual(["Boo"]);
});
