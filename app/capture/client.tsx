"use client";

// Capture: idle → recording → filed. Live text comes from the browser's speech
// recognition where it exists; the recording also goes to the server, which uses
// Whisper when OPENAI_API_KEY is set (Whisper result wins).

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { confirmCapture, fixCapture } from "@/app/actions";
import { Card } from "@/components/Card";
import type { Applied } from "@/lib/capture";
import { Mic, Tick } from "@/lib/icons";

type Phase = "idle" | "rec" | "filing" | "filed";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
};

const LABEL: Record<Applied["type"], string> = { log: "LOG", next_up: "NEXT UP", task: "TASK", progress: "PROGRESS", idea: "IDEA" };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function Capture({ cardId, briefId, questionId }: { cardId: string | null; briefId: string | null; questionId: string | null }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [text, setText] = useState("");
  const [live, setLive] = useState("");
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string>();
  const [filed, setFiled] = useState<{ captureId: string; items: Applied[] }>();

  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recog = useRef<Recognition | null>(null);
  const liveRef = useRef("");

  // Closing the sheet mid-recording must release the mic.
  useEffect(
    () => () => {
      recog.current?.stop();
      const rec = recorder.current;
      if (rec) {
        rec.onstop = null;
        if (rec.state !== "inactive") rec.stop();
        rec.stream.getTracks().forEach((t) => t.stop());
      }
    },
    [],
  );

  useEffect(() => {
    if (phase !== "rec") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const send = async (transcript: string, audio?: Blob) => {
    setPhase("filing");
    setError(undefined);
    const form = new FormData();
    form.append("transcript", transcript);
    if (audio) form.append("audio", audio);
    if (cardId) form.append("card_id", cardId);
    if (briefId && questionId) {
      form.append("brief_id", briefId);
      form.append("question_id", questionId);
    }
    const res = await fetch("/api/capture", { method: "POST", body: form });
    const body = await res.json().catch(() => ({ error: "Filing failed" }));
    if (!res.ok) {
      setText(body.transcript ?? transcript);
      setError(body.error ?? "Filing failed");
      setPhase("idle");
      return;
    }
    setText(body.transcript);
    setFiled({ captureId: body.captureId, items: body.items });
    setPhase("filed");
  };

  const start = async () => {
    setError(undefined);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("No microphone access. Type it instead.");
      return;
    }
    chunks.current = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.start();
    recorder.current = rec;

    liveRef.current = "";
    setLive("");
    const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = "en-IE";
      r.continuous = true;
      r.interimResults = true;
      r.onresult = (e) => {
        liveRef.current = Array.from(e.results, (res) => res[0].transcript).join(" ");
        setLive(liveRef.current);
      };
      r.onerror = () => {};
      r.start();
      recog.current = r;
    }
    setSecs(0);
    setPhase("rec");
  };

  const stop = () => {
    recog.current?.stop();
    const rec = recorder.current;
    if (!rec) return;
    rec.onstop = () => {
      rec.stream.getTracks().forEach((t) => t.stop());
      const audio = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      // Give recognition a beat to deliver its final result.
      setTimeout(() => send(liveRef.current.trim(), audio), 300);
    };
    rec.stop();
  };

  const fix = async () => {
    if (filed) await fixCapture(filed.captureId);
    setFiled(undefined);
    setPhase("idle");
  };

  const looksRight = async () => {
    if (filed) await confirmCapture(filed.captureId);
    if (history.length > 1) router.back();
    else router.push("/");
  };

  if (phase === "filed" && filed) {
    return (
      <div className="fade flex flex-col gap-3">
        <div className="flex items-center gap-2 font-mono text-xs text-up">
          <Tick />
          Claude filed {filed.items.length} {filed.items.length === 1 ? "thing" : "things"}
        </div>
        {filed.items.map((f, i) => (
          <Card key={i} className="flex flex-col gap-1.5 p-3.5">
            <div className="flex justify-between gap-2 font-mono text-[11px] text-muted">
              <span>
                {LABEL[f.type]} · {f.type === "idea" ? "new" : f.card_name}
              </span>
              {f.progress && (
                <span className="text-building">
                  + progress {f.progress.from} → {f.progress.to}%
                </span>
              )}
            </div>
            <div className="text-sm leading-[1.45]">{f.body}</div>
          </Card>
        ))}
        {!filed.items.length && <div className="text-sm text-muted">Nothing to file in that one.</div>}
        <div className="mt-1 flex gap-2">
          <button onClick={fix} className="min-h-12 flex-1 basis-0 rounded-btn-lg border border-card-border bg-card p-[13px] text-sm font-medium text-fg">
            Fix something
          </button>
          <button onClick={looksRight} className="min-h-12 flex-1 basis-0 rounded-btn-lg bg-fg p-[13px] text-sm font-semibold text-bg">
            Looks right
          </button>
        </div>
      </div>
    );
  }

  const recording = phase === "rec" || phase === "filing";
  return (
    <div className="flex flex-auto flex-col items-center justify-center gap-6 pb-10 pt-[60px]">
      {recording ? (
        <>
          <button
            onClick={stop}
            disabled={phase === "filing"}
            aria-label="Stop recording"
            className="fade flex size-[120px] items-center justify-center rounded-full border-2 border-attn bg-attn-bg"
          >
            <span className="block size-9 rounded-pill bg-attn" />
          </button>
          <div className="font-mono text-sm text-attn">{phase === "filing" ? "Filing…" : clock(secs)}</div>
          {live && <div className="max-w-[280px] text-center text-sm leading-normal text-muted">“…{live.slice(-160)}…”</div>}
        </>
      ) : (
        <>
          <button onClick={start} aria-label="Start recording" className="fade flex size-[120px] items-center justify-center rounded-full bg-fg text-bg">
            <Mic size={44} strokeWidth={1.8} />
          </button>
          <div className="flex flex-col gap-1.5 text-center">
            <div className="text-lg font-semibold">Just talk.</div>
            <div className="max-w-[260px] text-sm leading-normal text-muted">
              An idea, a thing you did, a thing to do next. Claude files it to the right card.
            </div>
          </div>
          <form
            className="w-full"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) send(text.trim());
            }}
          >
            <label className="flex w-full flex-col gap-1.5 text-xs text-muted">
              or type
              <input
                type="text"
                enterKeyHint="send"
                placeholder="Quick note…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-12 w-full rounded-btn-lg border border-card-border bg-card px-3.5 py-[13px] text-sm text-fg placeholder:text-muted"
              />
            </label>
          </form>
          {error && <div className="font-mono text-xs text-attn">{error}</div>}
        </>
      )}
    </div>
  );
}
