import type { Metadata } from "next";
import { Darker_Grotesque } from "next/font/google";
import "./globals.css";

const darkerGrotesque = Darker_Grotesque({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-darker-grotesque",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Artfolio — Art · Community · Discovery",
  description: "A platform for artists and venues to connect, showcase work, and grow in the Iranian art scene.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={darkerGrotesque.variable}>
      <body className="font-sans bg-paper text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
