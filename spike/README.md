# laughtrack - Day 1 spike

The smallest thing that answers the make-or-break question: **does the crowd react out loud to what it SEES, unprompted, or does it sit silent?** One static page, no build, no framework. If this works, we build the real app around it. If it does not, we tune the loop before writing a line of Next.js.

## Run it
`getUserMedia` needs a secure context, so serve it over `localhost` (not `file://`). From the repo root, pick one:

```bash
# option A - python (no install)
python3 -m http.server 8000 --directory spike
# then open http://localhost:8000

# option B - node
npx serve spike
# then open the URL it prints
```

Then in the page:
1. Paste your **Gemini API key** (free at https://aistudio.google.com/apikey) and press **Save key**. It is stored only in your browser and goes straight to Google (this is the BYO-key model laughtrack ships).
2. Pick a persona, press **Start**, allow the camera.
3. Do something visual: hold up a sandwich, knock a cup over, make a face, change your shirt.

## What success looks like
- A short spoken reaction (1 to 3 words) fires within a second or two of a real visual change, unprompted.
- The **Live log** shows `frame sent` (outbound) and `REACTION:` (inbound, with the transcribed words).
- The crowd emoji pop and a caption shows what they said.

## If it stays silent (this is the real experiment)
The pinned model supports `proactiveAudio`, but Google documents that flag as letting the model **stay silent on irrelevant input**, not as "narrate unprompted." So silence is a real possible outcome, and it is exactly what we are here to find out.
- Tap **Nudge** once. If it reacts to the nudge, the audio pipe works and the problem is *triggering* (we tune the prompt / try enabling mic audio / adjust how frames are framed), not a broken connection.
- Toggle **send mic audio** on - the model's voice-activity detection may need an audio stream to decide when to speak.
- Toggle **send a frame every second** to rule out the change-gate.
- Lower **change sensitivity** if frames are not being sent on movement.

## Knobs in the page
- **Persona** - hype crowd / posh gallery / heckler pit (different prompt + voice).
- **Change sensitivity** - the client-side luma-diff change-gate threshold (lower = more frames sent).
- **send a frame every second** - bypass the gate, send at the 1 FPS cap.
- **send mic audio** - include microphone (off by default, to test pure visual reaction first).
- **Nudge** - send a one-off text prompt (diagnostic only).

## Verified facts this is built on
Model `gemini-2.5-flash-native-audio-preview-12-2025` on `v1alpha`; frames via `sendRealtimeInput({video:{data,mimeType:'image/jpeg'}})` at max ~1 FPS; output audio is 16-bit PCM @ 24kHz. Full detail and sources: [../.claude/memory/verified-stack.md](../.claude/memory/verified-stack.md).

## Notes / known sharp edges
- Loads `@google/genai` from `https://esm.sh/@google/genai` (latest). If an import error appears in the browser console, pin a version, e.g. `https://esm.sh/@google/genai@2`.
- Audio+video sessions cap at ~2 min; this spike does not yet handle reconnect, so just press Stop/Start for another run.
- Not committed as "working" until you confirm it runs. Report what you see and we iterate.
