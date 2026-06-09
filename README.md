# laughtrack

[![CI](https://github.com/san64777/laughtrack/actions/workflows/ci.yml/badge.svg)](https://github.com/san64777/laughtrack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![demo: live](https://img.shields.io/badge/demo-live-ff4a6b.svg)](https://laughtrack-delta.vercel.app)

**a live studio audience for your life.** A tiny pixel crowd watches your webcam and reacts out loud in real time: it gasps when you spill coffee, cheers when you nail a riff, heckles your outfit. Every reaction is unprompted, lands in about a second, and the whole thing records to a shareable clip.

**[Try it live -> laughtrack-delta.vercel.app](https://laughtrack-delta.vercel.app)**

## How to use

1. Open [laughtrack-delta.vercel.app](https://laughtrack-delta.vercel.app) (works great on a phone).
2. Paste a free Gemini API key ([grab one in 60s](https://aistudio.google.com/apikey)). It stays in your browser and never touches a server of ours.
3. Allow the camera, pick a crowd (hype crowd / posh gallery / heckler pit), and press **go live**.
4. Do something: hold up a snack, knock something over, make a face. The crowd reacts on its own.
5. Tap **record** for a 15-second MP4 to post.

## What it is

A single-page web toy. Webcam frames stream straight from your browser to the Gemini Live API, which decides *when* to react and speaks a short line; a canvas pixel-crowd animates and the voice plays, all in real time. There is no backend and no account: you bring your own key, so it costs you nothing to run and there is no shared quota to exhaust.

- **The magic is proactive reaction.** It reacts to what it SEES, unprompted, in 1 to 3 words, never narrating. A client-side change-gate sends only the frame that actually changed.
- **Three crowds.** Hype crowd, posh gallery, heckler pit: each is a different prompt, voice, and palette.
- **The clip is the product.** One tap composites you, the crowd, and the audio into a 15-second MP4.

## How it works

- **See.** `getUserMedia` samples webcam frames; a small luma-diff change-gate (`src/lib/changeGate.ts`) forwards a frame only when something changes.
- **React.** `src/lib/liveReactor.ts` holds one WebSocket to the Gemini Live API (`gemini-2.5-flash-native-audio-preview`, `v1alpha`, with `proactiveAudio`). Each changed frame is sent as a completed turn, and the model proactively replies with native-audio voice.
- **Show.** `src/browser/crowd.ts` draws the cute-blob crowd on a canvas, syncing mouths and bounce to the live audio; `src/browser/recorder.ts` composites the share frame and records it with `MediaRecorder`.

## What it is, and is not

- It is a toy: a live audience reacting to your real life, made to produce one funny, shareable clip.
- It is not a backend service. Everything runs in your browser on your own Gemini key (raw key, client-side; a small ephemeral-token proxy is the documented upgrade path). The model is a preview, so expect it to change.

## Develop

```bash
bun install
bun run dev        # http://localhost:3000  (add ?dev for a no-camera demo source)
bun test           # unit tests
bun run typecheck
bun run build
```

Next.js (App Router) + TypeScript, Bun, Biome. The reaction logic lives in framework-agnostic modules under `src/lib`; the browser-only pieces (audio, canvas crowd, recorder, webcam) are under `src/browser`.

## License

MIT.
