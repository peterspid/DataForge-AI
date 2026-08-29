import type { Metadata } from "next";
import type React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "DataForge AI | Decentralized data marketplace",
  description:
    "A 0G-ready marketplace where useful AI data gets verified and rewarded.",
  generator: "DataForge AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.className} ${geistMono.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
