import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artfolio — Where Artists & Galleries Thrive",
  description: "The platform for artists and galleries to showcase work, manage inventory, build portfolios, and connect with the art world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --font-display: 'Fraunces', Georgia, serif;
            --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
