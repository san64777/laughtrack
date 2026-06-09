"use client";
import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "@/src/browser/audioPlayer";
import { Crowd } from "@/src/browser/crowd";
import { FrameSource } from "@/src/browser/frameSource";
import { downloadBlob, Recorder } from "@/src/browser/recorder";
import { SfxBank } from "@/src/browser/sfx";
import { ChangeGate } from "@/src/lib/changeGate";
import { LiveReactor } from "@/src/lib/liveReactor";
import { PERSONAS, personaById } from "@/src/lib/personas";
import { reactionToEmotion } from "@/src/lib/reactionToEmotion";
import type { Emotion, PersonaId } from "@/src/lib/types";

export default function Page() {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [live, setLive] = useState(false);
  const [pid, setPid] = useState<PersonaId>("heckle");
  const [caption, setCaption] = useState("");
  const [recLeft, setRecLeft] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [dev, setDev] = useState(false);
  const [reacted, setReacted] = useState(false);
  const [teaser, setTeaser] = useState("ooh");

  const camRef = useRef<HTMLDivElement>(null);
  const crowdCanvas = useRef<HTMLCanvasElement>(null);
  const landingCanvas = useRef<HTMLCanvasElement>(null);
  const refs = useRef<any>({});

  useEffect(() => {
    const k = localStorage.getItem("lt_key");
    if (k) {
      setKey(k);
      setHasKey(true);
    }
  }, []);

  useEffect(() => {
    setDev(new URLSearchParams(location.search).has("dev"));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: stopLive only touches the refs object and stable state setters
  useEffect(() => {
    return () => {
      if (refs.current.reactor) stopLive();
    };
  }, []);

  // a live teaser crowd on the landing: emotes on a loop so you see the magic before committing
  useEffect(() => {
    if (hasKey || !landingCanvas.current) return;
    const palette = ["#ffd23f", "#ff5d73", "#4fd6a3", "#7aa2ff", "#c98bff", "#ff9f43"];
    const crowd = new Crowd(landingCanvas.current, palette, 6);
    const beats: Array<[Emotion, string]> = [
      ["cheer", "yesss"],
      ["gasp", "no way"],
      ["laugh", "haha"],
      ["applause", "bravo"],
      ["boo", "booo"],
    ];
    let i = 0;
    crowd.setEmotion(beats[0][0]);
    setTeaser(beats[0][1]);
    const cycle = setInterval(() => {
      i = (i + 1) % beats.length;
      crowd.setEmotion(beats[i][0]);
      setTeaser(beats[i][1]);
    }, 1700);
    let raf = 0;
    const t0 = performance.now();
    const loop = () => {
      const t = performance.now();
      const amp = 0.26 * (0.5 + 0.5 * Math.sin((t - t0) / 130));
      crowd.tick(amp, t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      clearInterval(cycle);
      cancelAnimationFrame(raf);
    };
  }, [hasKey]);

  function cyclePersona(d: number) {
    const i = PERSONAS.findIndex((p) => p.id === pid);
    setPid(PERSONAS[(i + d + PERSONAS.length) % PERSONAS.length].id);
  }

  async function startLive() {
    const source = new FrameSource(dev ? "demo" : "webcam");
    await source.start();
    const el = source.el();
    el.className = "";
    if (camRef.current) {
      camRef.current.innerHTML = "";
      camRef.current.appendChild(el);
    }

    const player = new AudioPlayer();
    player.start();
    const sfx = new SfxBank(
      player.context()!,
      [player.context()!.destination, player.recordNode()!].filter(Boolean) as AudioNode[],
      muted,
    );
    const persona = personaById(pid);
    if (!crowdCanvas.current) return;
    const crowd = new Crowd(crowdCanvas.current, persona.palette);
    const gate = new ChangeGate({ threshold: 6, minIntervalMs: 1000 });
    const reactor = new LiveReactor();

    refs.current = { source, player, sfx, crowd, reactor, sampleTimer: null, raf: 0, persona };
    const animate = () => {
      crowd.tick(player.amplitude(), performance.now());
      refs.current.raf = requestAnimationFrame(animate);
    };
    refs.current.raf = requestAnimationFrame(animate);
    refs.current.sampleTimer = setInterval(() => {
      if (gate.shouldSend(source.graySample(), performance.now()))
        reactor.sendFrame(source.captureJpeg());
    }, 250);

    await reactor.start(key, persona, {
      onStatus: (s) => setLive(s === "live"),
      onReaction: (text) => {
        const emotion = text ? reactionToEmotion(text) : "gasp";
        crowd.setEmotion(emotion);
        refs.current.sfx?.play(emotion);
        setReacted(true);
        if (text) {
          setCaption(text);
          setTimeout(() => setCaption(""), 2200);
        }
      },
      onAudioChunk: (pcm) => player.play(pcm),
      onError: (m) => console.error("reactor:", m),
    });
  }

  function stopLive() {
    const r = refs.current;
    if (!r.reactor) return;
    clearInterval(r.sampleTimer);
    cancelAnimationFrame(r.raf);
    r.reactor.stop();
    r.player.stop();
    r.source.stop();
    setLive(false);
    setReacted(false);
  }

  async function record() {
    const r = refs.current;
    if (!r.source) return;
    const rec = new Recorder();
    setRecLeft(15);
    const countdown = setInterval(() => setRecLeft((n) => (n && n > 1 ? n - 1 : null)), 1000);
    const W = 540;
    const H = 960;
    const blob = await rec.record(
      {
        width: W,
        height: H,
        audio: r.player.stream(),
        draw: (ctx) => {
          ctx.fillStyle = "#0c0913";
          ctx.fillRect(0, 0, W, H);
          const camH = H * 0.66;
          ctx.save();
          ctx.translate(W, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(r.source.el(), 0, 0, W, camH);
          ctx.restore();
          if (crowdCanvas.current) ctx.drawImage(crowdCanvas.current, 0, camH, W, H - camH);
        },
      },
      15000,
    );
    clearInterval(countdown);
    setRecLeft(null);
    downloadBlob(blob, `laughtrack-${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`);
  }

  if (!hasKey) {
    return (
      <main className="lt-landing">
        <div className="tally" data-on="true">
          <span className="dot" /> on air
        </div>
        <h1 className="lt-word">
          laugh<b>track</b>
        </h1>
        <p className="lt-tag">a live studio audience for your life</p>
        <p className="lt-sub">
          a tiny pixel crowd watches your camera and reacts out loud - gasp, cheer, heckle. all
          live.
        </p>
        <div className="lt-teaser">
          <div className="lt-teaser-cap">{teaser}</div>
          <canvas ref={landingCanvas} width={420} height={150} />
        </div>
        <div className="lt-key">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="paste your Gemini key"
          />
          <button
            type="button"
            className="go"
            onClick={() => {
              localStorage.setItem("lt_key", key.trim());
              setHasKey(!!key.trim());
            }}
          >
            Enter the studio
          </button>
        </div>
        <p className="lt-note">
          free Gemini key, stays in your browser, never leaves your device.{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            grab one in 60s
          </a>
        </p>
      </main>
    );
  }

  return (
    <div className="lt-root">
      <div className="lt-frame">
        <div className="lt-cam mirror" ref={camRef} />
        <div className="lt-chip">{personaById(pid).label}</div>
        {recLeft !== null ? (
          <div className="lt-status rec">
            <span className="dot" /> REC 0:{String(recLeft).padStart(2, "0")}
          </div>
        ) : (
          <div className="lt-status">
            <span className="tally" data-on={live ? "true" : "false"}>
              <span className="dot" /> {live ? "on air" : "off air"}
            </span>
          </div>
        )}
        <div className={`lt-caption ${caption ? "show" : ""}`}>{caption}</div>
        {live && !reacted && <div className="lt-nudge">do something - they're watching</div>}
        <div className="lt-pit">
          <canvas ref={crowdCanvas} width={420} height={150} />
        </div>
      </div>

      <div className="lt-controls">
        <div className="lt-persona">
          <button type="button" className="arrow" onClick={() => cyclePersona(-1)} disabled={live}>
            {"‹"}
          </button>
          <span>{personaById(pid).label}</span>
          <button type="button" className="arrow" onClick={() => cyclePersona(1)} disabled={live}>
            {"›"}
          </button>
        </div>

        {!live ? (
          <button type="button" className="lt-go" onClick={startLive}>
            <span className="tri" /> go live
          </button>
        ) : (
          <>
            <button
              type="button"
              className="lt-ghost"
              data-on={muted ? "false" : "true"}
              onClick={() => {
                const m = !muted;
                setMuted(m);
                refs.current.sfx?.setMuted(m);
              }}
            >
              SFX {muted ? "off" : "on"}
            </button>
            {dev && (
              <button
                type="button"
                className="lt-ghost"
                onClick={() => refs.current.source?.nextDemo()}
              >
                next scene
              </button>
            )}
            <button
              type="button"
              className="lt-record"
              data-rec={recLeft !== null ? "true" : "false"}
              onClick={record}
              disabled={recLeft !== null}
            >
              <span className="glyph" />{" "}
              {recLeft !== null ? `0:${String(recLeft).padStart(2, "0")}` : "REC 15s"}
            </button>
            <button
              type="button"
              className="lt-ghost"
              onClick={stopLive}
              disabled={recLeft !== null}
            >
              stop
            </button>
          </>
        )}
      </div>
    </div>
  );
}
