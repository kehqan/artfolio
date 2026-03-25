import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Artfolio — Where Artists & Galleries Thrive",
  description:
    "The platform for artists and galleries to showcase work, manage inventory, build portfolios, and connect with the art world.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --font-display: 'DM Serif Display', serif;
                --font-body: 'Outfit', sans-serif;
              }
            `,
          }}
        />
      </head>
      <body className="grain">{children}</body>
    </html>
  );
}
