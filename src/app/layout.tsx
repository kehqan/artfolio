import type { Metadata, Viewport } from "next";
import { Darker_Grotesque } from "next/font/google";
import "./globals.css";

const darkerGrotesque = Darker_Grotesque({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-darker-grotesque",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#FFD400",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Artomango — Art · Community · Discovery",
    template: "%s · Artomango",
  },
  description:
    "A platform for artists and venues to manage work, find collaborations, and grow in the art scene.",
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
    title: "Artomango — Art · Community · Discovery",
    description: "Manage your art, find venues, grow your practice.",
    type: "website",
    siteName: "Artomango",
  },
  twitter: {
    card: "summary",
    title: "Artomango",
    description: "Manage your art, find venues, grow your practice.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={darkerGrotesque.variable}>
      <head>
        {/* PWA install hint for iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans bg-paper text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
