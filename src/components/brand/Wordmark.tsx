import Link from "next/link";
import { cn } from "@/components/ui";
import { MangoMark } from "./MangoMark";

/** The Artomango mark + name. Links home; pass href to change where. */
export function Wordmark({ href = "/", size = "md", className }: { href?: string; size?: "md" | "lg"; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="Artomango home"
      className={cn(
        "inline-flex items-center gap-2 rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        className,
      )}
    >
      <MangoMark size={size === "lg" ? 32 : 24} />
      <span className={cn("font-display text-fg", size === "lg" ? "text-h2" : "text-h3")}>Artomango</span>
    </Link>
  );
}
