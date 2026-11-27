import type { CSSProperties } from "react";

/**
 * The Artomango mark: the mango. One drawing everywhere (favicon, app icons,
 * share image, emails, labels), so it looks the same on every phone and
 * computer instead of each system's own emoji.
 *
 * Artwork: Noto Emoji mango by Google, Apache License 2.0
 * (public/brand/NOTICE.md). Rendered from /brand/mango.svg.
 *
 * Decorative by default (alt=""): it always sits next to the word
 * "Artomango". Pass a label when it stands alone.
 */
export function MangoMark({ size = 24, label, className, style }: {
  size?: number; label?: string; className?: string; style?: CSSProperties;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/mango.svg"
      width={size}
      height={size}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      draggable={false}
      className={className}
      style={{ display: "inline-block", flex: "none", userSelect: "none", ...style }}
    />
  );
}
