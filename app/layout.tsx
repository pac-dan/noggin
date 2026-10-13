import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Noggin",
  appleWebApp: { capable: true, title: "Noggin", statusBarStyle: "black-translucent" },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0F1012",
};

const registerSW = `if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="mx-auto min-h-dvh max-w-[480px]">{children}</div>
        <script dangerouslySetInnerHTML={{ __html: registerSW }} />
      </body>
    </html>
  );
}
