// A QR code drawn as one SVG path, made here in the browser or on the
// server. Nothing is sent to an outside QR service.
import qrcode from "qrcode-generator";

type Props = { value: string; className?: string; title?: string; color?: string; background?: string; margin?: number };

export function QrCode({ value, className, title = "QR code", color = "#111110", background = "#FFFFFF", margin = 1 }: Props) {
  const qr = qrcode(0, "M");
  // Upper-case addresses fit the compact alphanumeric mode (lib/labels qrUrl).
  qr.addData(value, /^[0-9A-Z $%*+\-./:]+$/.test(value) ? "Alphanumeric" : "Byte");
  qr.make();
  const n = qr.getModuleCount();
  const size = n + margin * 2;
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label={title} shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
      <rect width={size} height={size} fill={background} />
      <path d={d} fill={color} />
    </svg>
  );
}
