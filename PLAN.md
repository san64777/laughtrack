# laughtrack - build plan

**Name:** `laughtrack` (npm free; GitHub org taken, so host the repo under your own user - fine; alt clean-sweep: `liveaudience`, `theclaque`). "A laugh track for your real life." Verify trademark glance before locking.
**One-liner:** a tiny on-screen pixel crowd that WATCHES your webcam live and reacts out loud in real time - gasps when you spill coffee, cheers when you nail a riff, heckles your outfit. A live studio audience for your life.
**Why second:** bigger swing + broader (normal-people) audience + higher ceiling, BUT it depends on a paid API (Gemini Live) and the proactive see-and-react loop is harder. Ship buildbeat first, apply the launch lessons here.

## VERIFIED 2026-06-08 (run wl97cvl50, GO with changes) - read this first
A 12-agent verification against live Google docs confirmed the engine works, and corrected our notes. The deltas that change this plan:
- **Model PINNED: `gemini-2.5-flash-native-audio-preview-12-2025` on `v1alpha`.** Only model with proactive audio + native voice + video frames; the newer 3.1 lacks proactive audio. PREVIEW, not "GA at I/O 2026" (that was memory). Keep a model-id switch.
- **Video input caps at ~1 frame/sec.** The change-gate sends the one salient frame on change; we cannot stream high-FPS. The "600ms" targets below are aspirational - no official latency number exists, so MEASURE on Day 1.
- **`proactiveAudio` lets the model stay SILENT on irrelevant input; it does NOT self-narrate.** The heckle cadence is UNVERIFIED by docs and is the Day-1 make-or-break spike.
- **Audio+video sessions die at ~2 min** (socket at ~10 min). Architect around short record-a-clip sessions + reconnect (this is also the product), or enable context-window compression + resumption.
- **BYO-key confirmed:** browser opens the Live WebSocket directly; raw user key works (each user burns own quota, killing the 429), Google prefers a tiny ephemeral-token backend. Cost (2.5 native-audio, per 1M): audio+video in $3, audio out $12, free tier exists.
Full verified facts + sources: [verified-stack.md](.claude/memory/verified-stack.md).

## The demo clip IS the product - build this first
Target: one 15-20s clip. Pixel crowd at the bottom of the screen, you on webcam, doing everyday things; the crowd reacts unprompted each time.
- hold up a sandwich -> a voice: "ooooh, gourmet."
- knock your water over -> collective "GASP," someone yells "classic."
- show a new haircut -> applause + a wolf-whistle.
- make a dumb face -> the crowd cracks up.
- Each reaction lands within ~600ms of the thing happening, unprompted. Caption/hook: "I gave myself a live studio audience."
**Reverse-engineer the app from this clip.** A one-tap "record 15s -> MP4" button is non-negotiable: the user's own clip is the distribution.

## Tech stack
| Layer | Choice | Note |
|---|---|---|
| Frontend | **Next.js (App Router) + TypeScript**, single page | no auth, no DB |
| Webcam | `getUserMedia` -> sample frames | client-side change-gate before sending (saves cost + avoids reacting to nothing) |
| **Engine** | **Gemini Live API**, model `gemini-2.5-flash-native-audio-preview-12-2025` on `v1alpha`, over one WebSocket: webcam JPEG frames IN (max ~1 FPS) + streaming PCM voice OUT, with `proactivity:{proactiveAudio:true}` | VERIFIED 2026-06-08; PREVIEW; proactive audio is NOT on the newer 3.1 model. See verified-stack.md |
| Voice / SFX | Gemini streaming voice for the spoken reactions + a small **SFX bank** (gasp/cheer/laugh/applause/boo) layered via **Web Audio** | |
| Crowd visual | a **pixel-art sprite sheet** (~6 states: idle/cheer/gasp/laugh/boo/applause) on a `<canvas>`; trigger the state that matches the reaction tag | cute + readable |
| Key handling | **BYO-key** (user pastes their own Gemini key) for viral scale, OR a server proxy with your key + a hard 60s session cap | decide up front - it shapes the UI |
| Record | **MediaRecorder** (canvas + webcam + audio) -> one-tap MP4/webm | the share engine |

## Architecture
```
[webcam getUserMedia] -> frames -> [client change-gate: send only on visible change]
        |
        v
[Gemini Live WebSocket]  <- persona system prompt:
   frames IN, proactive       "you are a rowdy studio audience. React in 1-3 words.
   VOICE OUT                    NEVER narrate. Only react to what CHANGED."
        |
        v
[reaction event: audio + a reaction tag] -> [render pixel crowd state (canvas) + play voice/SFX (Web Audio)]
        |
[one-tap record: MediaRecorder(canvas+cam+audio) -> MP4]
[3-4 swappable personas: hype crowd | posh gallery | heckler pit = different prompt + sprites + voice]
```
- **The proactive see-and-react loop is the product.** It must fire ONLY on a real visual change, FAST (~600ms), saying something apt in 1-3 words, never narrating. The change-gate + the persona prompt + latency tuning ARE the engineering bet.

## Build sequence (~4-5 focused days)
1. **Day 1 - prove the proactive loop (make-or-break, do first).** Connect Gemini Live over WebSocket, stream webcam frames in, get proactive voice out, sub-second. Prove it reacts to what it SEES, unprompted, at all. Confirm the exact API surface (video input, proactive audio config) against current Google docs - do not trust memory.
2. **Day 2 - the persona prompt + change-gate (the wow-loop taste).** "React to changes only, 1-3 words, never narrate." Add a cheap client-side motion/change check so it does not fire on nothing and to cut cost. Tune latency to ~600ms. Over-invest here.
3. **Day 3 - the pixel crowd visual + SFX.** Sprite sheet + animation states bound to reaction tags; layer SFX under the Gemini voice. Make it cute and instantly readable.
4. **Day 4 - personas + record button + key handling.** 3-4 crowds; the one-tap record->MP4; BYO-key input (or proxy + 60s cap).
5. **Day 5 - cut the clip, polish, ship.** Record yourself doing everyday "chaos," post on X/TikTok.

## Cost / scale (decide UP FRONT - it is an architecture choice)
Gemini Live is a **paid** API. To be free at viral scale you need **BYO-key** (each user uses their own free key, so the quota is distributed) OR a server proxy with your key + a hard session cap (e.g. 60s) + graceful "we are slammed, try later" degrade, OR a small capped launch budget (~$50-200) then flip to BYO-key. A shared free key will 429 the whole crowd the moment it goes viral (the hug of death). BYO-key adds a key-input screen; on-device is not an option here (no local equivalent for proactive realtime vision+voice in mid-2026).

## Distribution
Post ONE flawless clip of your own real chaos on X + TikTok: "I gave myself a live studio audience." Seed to the Gemini Live / Google AI dev community (they amplify Live-API demos) + #AIRoastMe / reaction-content creators - hand them the link, let them make their own clips. Self-distributes because every user's recording is new content. Pin a "tag me in your crowd's worst reaction" challenge.

## Risks
- **The proactive loop (latency + react-only-to-change + apt 1-3 words) is the whole bet** and is genuinely hard; fire on nothing or lag 2s and the magic dies.
- **Cost on a spike** - needs BYO-key/cap built BEFORE launch.
- Demo can read as staged (you perform "chaos" for the camera).
- Novelty fatigue after a few clips - persona variety is load-bearing.

## Definition of done (v1)
The crowd reacts to real webcam events within ~600ms, only to changes, with apt 1-3 word reactions; 3+ personas; one-tap record->MP4 works; BYO-key (or proxy+cap) is in place; the launch clip is cut. Then ship.
