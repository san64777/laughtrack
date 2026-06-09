import type { Viewport } from "next";
import { Fredoka, Space_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const display = Fredoka({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-mono" });

export const metadata = {
  title: "laughtrack - a live studio audience for your life",
  description:
    "A tiny pixel crowd watches your camera and reacts out loud, live. Gasp, cheer, heckle.",
};

// viewport-fit=cover unlocks env(safe-area-inset-*) so content clears the Dynamic Island / home
// indicator on iPhone, and lets the svh-based layout keep the controls on-screen
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#17111d",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
