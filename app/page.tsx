"use client";
import { useEffect, useRef, useState } from "react";
import { AudioPlayer } from "@/src/browser/audioPlayer";
import { Crowd } from "@/src/browser/crowd";
import { FrameSource } from "@/src/browser/frameSource";
import { downloadBlob, Recorder } from "@/src/browser/recorder";
import { ChangeGate } from "@/src/lib/changeGate";
import { LiveReactor } from "@/src/lib/liveReactor";
import { PERSONAS, personaById } from "@/src/lib/personas";
import { reactionToEmotion } from "@/src/lib/reactionToEmotion";
import type { PersonaId } from "@/src/lib/types";

export default function Page() {
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [live, setLive] = useState(false);
  const [pid, setPid] = useState<PersonaId>("heckle");
  const [caption, setCaption] = useState("");
  const [recLeft, setRecLeft] = useState<number | null>(null);

  const camRef = useRef<HTMLDivElement>(null);
  const crowdCanvas = useRef<HTMLCanvasElement>(null);
  const refs = useRef<any>({});

  useEffect(() => {
    const k = localStorage.getItem("lt_key");
    if (k) {
      setKey(k);
      setHasKey(true);
    }
  }, []);

  function cyclePersona(d: number) {
    const i = PERSONAS.findIndex((p) => p.id === pid);
    setPid(PERSONAS[(i + d + PERSONAS.length) % PERSONAS.length].id);
  }

  async function startLive() {
    const dev = new URLSearchParams(location.search).has("dev");
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
    const persona = personaById(pid);
    if (!crowdCanvas.current) return;
    const crowd = new Crowd(crowdCanvas.current, persona.palette);
    const gate = new ChangeGate({ threshold: 6, minIntervalMs: 1000 });
    const reactor = new LiveReactor();

    let raf = 0;
    const animate = () => {
      crowd.tick(player.amplitude(), performance.now());
      raf = requestAnimationFrame(animate);
    };
    animate();

    const sampleTimer = setInterval(() => {
      if (gate.shouldSend(source.graySample(), performance.now()))
        reactor.sendFrame(source.captureJpeg());
    }, 250);

    await reactor.start(key, persona, {
      onStatus: (s) => setLive(s === "live"),
      onReaction: (text) => {
        crowd.setEmotion(reactionToEmotion(text));
        setCaption(text);
        setTimeout(() => setCaption(""), 2200);
      },
      onAudioChunk: (pcm) => player.play(pcm),
      onError: (m) => console.error("reactor:", m),
    });

    refs.current = { source, player, crowd, reactor, sampleTimer, raf, persona };
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
          ctx.fillStyle = "#0c0d12";
          ctx.fillRect(0, 0, W, H);
          const camH = H * 0.64;
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
      <div className="lt-root">
        <h1>laughtrack</h1>
        <div className="lt-key">
          <p className="lt-note">
            Paste your Gemini API key (free at aistudio.google.com/apikey). It stays in this browser
            and goes straight to Google.
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Gemini API key"
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
      </div>
    );
  }

  return (
    <div className="lt-root">
      <div className="lt-frame">
        <div className="lt-cam mirror" ref={camRef} />
        <div className="lt-chip">{personaById(pid).label}</div>
        {recLeft !== null && (
          <div className="lt-timer">rec 0:{String(recLeft).padStart(2, "0")}</div>
        )}
        <div className={`lt-caption ${caption ? "show" : ""}`}>{caption}</div>
        <div className="lt-pit">
          <canvas ref={crowdCanvas} width={420} height={150} />
        </div>
      </div>
      <div className="lt-controls">
        <div className="lt-persona">
          <button type="button" onClick={() => cyclePersona(-1)} disabled={live}>
            {"<"}
          </button>
          <span>{personaById(pid).label}</span>
          <button type="button" onClick={() => cyclePersona(1)} disabled={live}>
            {">"}
          </button>
        </div>
        {!live ? (
          <button type="button" className="lt-rec" onClick={startLive} title="start" />
        ) : (
          <button
            type="button"
            className="lt-rec"
            onClick={record}
            disabled={recLeft !== null}
            title="record 15s"
          />
        )}
        {live && (
          <button type="button" onClick={stopLive}>
            stop
          </button>
        )}
      </div>
    </div>
  );
}
