import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signsbeat — Mitochondrial Intelligence Engine",
  description: "Multi-input cellular health probability engine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#1A1535]">{children}</body>
    </html>
  );
}
