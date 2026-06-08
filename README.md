# laughtrack

**A live studio audience for your life.** A tiny pixel crowd watches your webcam and reacts out loud in real time - gasps when you spill coffee, cheers when you nail a riff, heckles your outfit. Unprompted, in ~600ms.

A viral toy on the hottest new realtime-multimodal capability (Gemini Live "proactive audio"). Status: planning -> build. Full plan: [PLAN.md](PLAN.md). Rules: [CLAUDE.md](CLAUDE.md).

- **Engine:** Gemini Live API (webcam frames in + proactive voice out over one WebSocket).
- **The point:** every clip is unique to the user and natively shareable. One-tap record -> MP4 is the distribution. Build the clip first.
- **Cost:** paid API -> ship BYO-key (each user's own key) or proxy + a session cap.
