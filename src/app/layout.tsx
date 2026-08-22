import type { Metadata } from "next";
import { Marcellus, Figtree } from "next/font/google";
import "./globals.css";

// Display face: inscriptional Roman capitals — the "engraved" register voice.
const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Workhorse UI face: warm geometric sans with tabular figures for data.
const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Society Maintenance Tracker",
  description: "Raise, track, and resolve society maintenance complaints with full audit history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${marcellus.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
