import type { Enums } from "@/lib/db.types";

export type Status = Enums<"card_status">;
export type Tone = "building" | "planning" | "up" | "attn" | "shelved" | "off";

// Status → colour tone (README §3). live/ongoing/up share green; done/archived read as shelved.
export const toneOf = (s: Status): Tone =>
  s === "building" ? "building" : s === "planning" ? "planning" : s === "live" || s === "ongoing" ? "up" : "shelved";

// Full class strings so Tailwind can see them.
export const toneBg: Record<Tone, string> = {
  building: "bg-building-bg",
  planning: "bg-planning-bg",
  up: "bg-up-bg",
  attn: "bg-attn-bg",
  shelved: "bg-shelved-bg",
  off: "bg-button",
};
export const toneFg: Record<Tone, string> = {
  building: "text-building",
  planning: "text-planning",
  up: "text-up",
  attn: "text-attn",
  shelved: "text-shelved",
  off: "text-muted",
};
export const toneFill: Record<Tone, string> = {
  building: "bg-building",
  planning: "bg-planning",
  up: "bg-up",
  attn: "bg-attn",
  shelved: "bg-shelved",
  off: "bg-off",
};
