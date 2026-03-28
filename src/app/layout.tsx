import type { Metadata } from "next";
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Syne — ultra-bold display, matches the reference image perfectly
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Artfolio — Art · Community · Discovery",
  description: "A platform for artists and venues to connect, showcase work, and grow in the Iranian art scene.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${plusJakarta.variable} ${jetbrains.variable}`}>
      <body className="font-sans bg-paper text-stone-900 antialiased">{children}</body>
    </html>
  );
}
