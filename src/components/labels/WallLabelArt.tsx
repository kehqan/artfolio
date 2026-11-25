// One printed label, drawn in real millimetres and points so the preview on
// screen is the same thing that comes out of the printer.
//
// Card (85 × 55 mm) and Stand face (148 × 105 mm) share a side-by-side
// layout; Post (A6, portrait) stacks. Text never goes below 7 pt and the QR
// never below 20 mm, so it scans from about arm's length.
import type { CSSProperties } from "react";
import { QrCode } from "./QrCode";
import {
  type LabelDesign, type LabelLanguage, type LabelSales, type LabelShow, type LabelSize, type LabelWork,
  dims, printedPrice, qrUrl, salesFor, say, sizeOf,
} from "@/lib/labels";

export type LabelArtProps = {
  work: LabelWork; artistName: string;
  design: LabelDesign; size: LabelSize; language: LabelLanguage; sales: LabelSales;
  show: LabelShow; note?: string | null; placeName?: string | null;
  code: string; origin?: string;
  className?: string; style?: CSSProperties;
};

const LOOK: Record<LabelDesign, { bg: string; fg: string; fg2: string; qrBox: boolean }> = {
  quiet: { bg: "#FFFFFF", fg: "#111110", fg2: "#5C5346", qrBox: false },
  mango: { bg: "#FFD400", fg: "#111110", fg2: "#3A342B", qrBox: true },
  ink: { bg: "#111110", fg: "#FFFFFF", fg2: "#CFC5B2", qrBox: true },
  picture: { bg: "#FFFFFF", fg: "#111110", fg2: "#5C5346", qrBox: false },
};

const DISPLAY = "var(--font-display)";
const UI = "var(--font-ui)";

export function WallLabelArt(p: LabelArtProps) {
  const s = sizeOf(p.size);
  const look = LOOK[p.design];
  const k = p.size === "stand" ? 1.7 : p.size === "post" ? 1.45 : 1;
  const sales = salesFor(p.sales, p.work);
  const price = sales === "price" ? printedPrice(p.work.price, p.work.currency) : sales === "ask" ? say("ask", p.language) : null;
  const meta = [p.show.year && p.work.year ? String(p.work.year) : "", p.show.medium ? p.work.medium || "" : ""].filter(Boolean).join(" · ");
  const size = p.show.size ? dims(p.work) : "";
  const note = p.show.note ? (p.note || "").trim() : "";
  const place = p.show.place ? (p.placeName || "").trim() : "";
  const image = p.design === "picture" ? p.work.images?.find(Boolean) : null;
  const pad = p.size === "card" ? 5 : p.size === "post" ? 8 : 9;
  const qr = p.size === "card" ? 21 : p.size === "post" ? 32 : 36;

  const pt = (n: number) => `${Math.max(7, n * k).toFixed(1)}pt`;
  const title: CSSProperties = { fontFamily: DISPLAY, fontWeight: 800, fontSize: pt(p.size === "post" ? 17 : 15), lineHeight: 0.92, letterSpacing: "-0.01em", margin: 0, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: p.size === "post" ? 3 : 2, WebkitBoxOrient: "vertical" };
  const small: CSSProperties = { fontFamily: UI, fontSize: pt(7), lineHeight: 1.3, color: look.fg2, margin: 0 };

  const qrBlock = (
    <div style={{ flex: "none", width: `${qr}mm`, height: `${qr}mm`, background: "#fff", padding: look.qrBox ? "0.6mm" : 0, borderRadius: "0.8mm", boxSizing: "border-box" }}>
      <QrCode value={qrUrl(p.code, p.origin)} title={`QR code for ${p.work.title}`} margin={look.qrBox ? 2 : 0} className="block h-full w-full" />
    </div>
  );

  const text = (
    <div style={{ display: "flex", flexDirection: "column", gap: `${1.1 * k}mm`, minWidth: 0, flex: 1 }}>
      <div style={{ display: "flex", gap: `${2.5 * k}mm`, alignItems: "flex-start" }}>
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" style={{ width: `${14 * k}mm`, height: `${14 * k}mm`, objectFit: "cover", borderRadius: "0.6mm", flex: "none" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: `${1 * k}mm`, minWidth: 0 }}>
          <p style={title}>{p.work.title}</p>
          <p style={{ fontFamily: UI, fontWeight: 600, fontSize: pt(8), lineHeight: 1.2, margin: 0 }}>{p.artistName}</p>
        </div>
      </div>
      {(meta || size) && <p style={small}>{meta}{meta && size ? <br /> : null}{size}</p>}
      {note && <p style={{ ...small, color: look.fg, fontStyle: "italic" }}>{note}</p>}
      {place && <p style={small}>{place}</p>}
    </div>
  );

  const foot = (
    <div style={{ display: "flex", flexDirection: "column", gap: `${0.8 * k}mm` }}>
      {price && <p style={{ fontFamily: UI, fontWeight: 700, fontSize: pt(8.5), lineHeight: 1.15, margin: 0 }}>{price}</p>}
      <p style={{ fontFamily: UI, fontWeight: 600, fontSize: pt(7), letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.25, margin: 0 }}>
        {say("scan", p.language)}
      </p>
      <p style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: pt(8), lineHeight: 1, margin: 0, opacity: 0.55 }}>artomango</p>
    </div>
  );

  const frame: CSSProperties = {
    width: `${s.w}mm`, height: `${s.h}mm`, padding: `${pad}mm`, boxSizing: "border-box",
    background: look.bg, color: look.fg, overflow: "hidden", position: "relative",
    WebkitPrintColorAdjust: "exact", printColorAdjust: "exact",
    ...p.style,
  };

  if (p.size === "post") {
    return (
      <div className={p.className} style={{ ...frame, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "5mm" }}>
        {text}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "5mm" }}>
          {qrBlock}
          {foot}
        </div>
      </div>
    );
  }
  return (
    <div className={p.className} style={{ ...frame, display: "flex", gap: `${3.5 * k}mm` }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0, flex: 1, gap: `${1.5 * k}mm` }}>
        {text}
        {foot}
      </div>
      <div style={{ alignSelf: "flex-end" }}>{qrBlock}</div>
    </div>
  );
}
