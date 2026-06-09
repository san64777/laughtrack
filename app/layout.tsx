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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
