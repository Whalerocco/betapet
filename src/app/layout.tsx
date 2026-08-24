import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Betapet",
  description: "Ett Alfapet-inspirerat brädspel",
  // iOS reads these rather than the manifest's display mode, so an icon added to the home screen
  // there opens without browser chrome too (manifest.ts explains why that matters).
  appleWebApp: {
    capable: true,
    title: "Betapet",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="sv" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
