import { cn } from "./cn";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "h-8 w-8 text-label", md: "h-10 w-10 text-body", lg: "h-16 w-16 text-h3" } as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border-hair border-line bg-mango-soft font-ui font-semibold text-fg",
        sizes[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img loading="lazy" decoding="async" src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span aria-label={name}>{initials(name)}</span>
      )}
    </span>
  );
}
