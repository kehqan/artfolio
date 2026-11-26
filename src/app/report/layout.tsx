import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a problem",
  description: "Tell us if something on Artomango copies your work, breaks the law or shares private details.",
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
