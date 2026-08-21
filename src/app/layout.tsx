import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Society Maintenance Tracker",
  description: "Raise, track, and resolve society maintenance complaints with full audit history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
