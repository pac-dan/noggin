import { NextResponse, type NextRequest } from "next/server";
import { fileTranscript } from "@/lib/capture";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Whisper transcription. Optional: without OPENAI_API_KEY the browser's live transcript is used.
async function whisper(audio: Blob): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY || !audio.size) return null;
  const form = new FormData();
  form.append("file", audio, audio.type.includes("mp4") ? "note.mp4" : "note.webm");
  form.append("model", "whisper-1");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!res.ok) return null;
  const { text } = (await res.json()) as { text?: string };
  return text?.trim() || null;
}

// POST multipart: transcript (live text or typed), audio? (recording), card_id?, brief_id? + question_id?
export async function POST(request: NextRequest) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "signed out" }, { status: 401 });

  const form = await request.formData();
  const audio = form.get("audio");
  const live = String(form.get("transcript") ?? "").trim();
  const cardHint = (form.get("card_id") as string) || null;
  const briefId = (form.get("brief_id") as string) || null;
  const questionId = (form.get("question_id") as string) || null;

  const heard = audio instanceof Blob ? await whisper(audio) : null; // Whisper result wins
  const transcript = heard ?? live;
  if (!transcript) return NextResponse.json({ error: "Nothing heard. Try again or type it." }, { status: 400 });

  const { data: capture, error } = await db.from("captures").insert({ owner: user.id, transcript }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // "Answer by voice" on a brief/review question: the transcript is the answer.
  if (briefId && questionId) {
    const { data: brief } = await db.from("briefs").select("id, questions").eq("id", briefId).maybeSingle();
    const q = (Array.isArray(brief?.questions) ? brief.questions : []).find(
      (x) => typeof x === "object" && x && !Array.isArray(x) && x.id === questionId,
    ) as { text?: string; card_id?: string } | undefined;
    if (q) {
      await db.from("decisions").insert({ owner: user.id, brief_id: briefId, card_id: q.card_id ?? null, question: q.text ?? "", answer: `voice: ${transcript}` });
    }
  }

  try {
    const items = await fileTranscript(db, user.id, transcript, { source: audio instanceof Blob ? "voice" : "manual", cardHint });
    await db.from("captures").update({ filed: items }).eq("id", capture.id);
    return NextResponse.json({ captureId: capture.id, transcript, items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, captureId: capture.id, transcript }, { status: 502 });
  }
}
