import { ImageResponse } from "next/og";

// App icon: the design's mic glyph in fg on bg. Full-bleed square so it also works as maskable.
export function appIcon(size: number) {
  const glyph = Math.round(size * 0.46);
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, background: "#0F1012", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" fill="none" stroke="#F2F0EA" strokeWidth={1.8} strokeLinecap="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0014 0M12 18v3" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
