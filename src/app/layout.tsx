import type { Metadata, Viewport } from "next";
import { Darker_Grotesque, Instrument_Sans, Instrument_Serif } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "../styles/tokens.css";
import "./globals.css";

// Both UI faces are variable fonts: leaving out `weight` ships one file per
// face that covers every weight, instead of one file per weight.
// next/font serves them from our own domain (no Google request at runtime).
const darkerGrotesque = Darker_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-darker-grotesque",
  display: "swap",
});

// Body / UI face for the design system (see DESIGN_SYSTEM.md)
const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-instrument-sans",
  display: "swap",
});

// Serif headlines for personal sites that choose the "Classic" type mood.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-site-serif",
  display: "swap",
  // Only personal sites with the "Classic" mood use it: don't preload it on every page.
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#FFD400",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Artomango — From your studio to a wall",
    template: "%s · Artomango",
  },
  description:
    "Artomango gets emerging artists' work onto real walls in cafés and small spaces, and helps them sell it from there. No algorithm, no AI.",
  applicationName: "Artomango",
  appleWebApp: {
    capable: true,
    title: "Artomango",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico",    sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.svg",    type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "mask-icon", url: "/favicon.svg" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "Artomango — From your studio to a wall",
    description: "See where your work can go, agree in one page, and sell it off the wall.",
    type: "website",
    siteName: "Artomango",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Artomango — From your studio to a wall",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Artomango",
    description: "See where your work can go, agree in one page, and sell it off the wall.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${darkerGrotesque.variable} ${instrumentSans.variable} ${instrumentSerif.variable}`}>
      <head>
        {/* PWA install hint for iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-page text-fg antialiased">
        {children}
        {/* Real visitors' load times (Core Web Vitals), in the Vercel dashboard under Speed Insights. Loads after the page. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
