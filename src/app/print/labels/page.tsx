"use client";
// Print wall labels: /print/labels?ids=a,b&layout=sheet|exact
//
//   sheet  – packed onto A4 for a home printer (10 cards, 4 posts or 2 stands a page)
//   exact  – one label per page at its own size, for a print shop
//
// The browser's print dialog makes the PDF ("Save as PDF"), so the labels
// stay sharp vector text at exact size. Each size uses its own named @page.
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, ButtonLink, Skeleton } from "@/components/ui";
import { WallLabelArt } from "@/components/labels/WallLabelArt";
import { type LabelBundle, type LabelSize, loadLabels, sizeOf } from "@/lib/labels";

type Layout = "sheet" | "exact";

export default function PrintLabelsPage() {
  return <Suspense fallback={null}><PrintLabels /></Suspense>;
}

function PrintLabels() {
  const q = useSearchParams();
  const ids = useMemo(() => (q.get("ids") || "").split(",").filter(x => /^[0-9a-f-]{36}$/i.test(x)), [q]);
  const layout: Layout = q.get("layout") === "exact" ? "exact" : "sheet";
  const back = q.get("back") || "/dashboard/labels";
  const [labels, setLabels] = useState<LabelBundle[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLabels(createClient(), { ids }).then(l => {
      if (!l) setError("These labels didn't load. Please go back and try again.");
      else setLabels(l.filter(x => x.work));
    });
  }, [ids]);

  // Open the print dialog once everything (fonts and pictures) is ready.
  useEffect(() => {
    if (!labels?.length) return;
    let cancelled = false;
    (async () => {
      await document.fonts?.ready;
      await Promise.all(Array.from(document.images).map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
      if (!cancelled) setTimeout(() => window.print(), 300);
    })();
    return () => { cancelled = true; };
  }, [labels]);

  const pages = useMemo(() => (labels ? paginate(labels, layout) : []), [labels, layout]);
  const safeBack = back.startsWith("/") && !back.startsWith("//") ? back : "/dashboard/labels";

  return (
    <div className="min-h-screen bg-sunken print:bg-white">
      <style>{PAGE_CSS}</style>
      <header className="sticky top-0 z-10 border-b-hair border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-[980px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <ButtonLink href={safeBack} variant="ghost" size="sm"><ArrowLeft size={15} aria-hidden /> Back</ButtonLink>
          <p className="mr-auto font-ui text-body-sm text-fg-2">
            {labels ? `${labels.length} ${labels.length === 1 ? "label" : "labels"} on ${pages.length} ${pages.length === 1 ? "page" : "pages"}` : "Getting your labels ready…"}
          </p>
          <Button variant="primary" onClick={() => window.print()} disabled={!labels?.length}><Printer size={15} aria-hidden /> Print or save as PDF</Button>
        </div>
        <p className="mx-auto max-w-[980px] px-4 pb-3 font-ui text-caption text-fg-3 sm:px-6">
          In the print window, set the scale to 100% (or “Actual size”) and turn on background graphics.
          {layout === "sheet" ? " Print on A4, then cut along the light lines." : " Each page is one label at its real size, ready for a print shop."}
          {" "}Card stock of 250–300 g looks best.
        </p>
      </header>

      <main className="flex flex-col items-center gap-8 px-4 py-8 print:block print:p-0">
        {error && <Alert tone="bad">{error}</Alert>}
        {!labels && !error && <Skeleton className="h-[297mm] w-[210mm] max-w-full" />}
        {labels && !labels.length && !error && <Alert tone="info">There are no labels to print here.</Alert>}
        {pages.map((pg, i) => (
          <section key={i} className={`label-page label-${pg.name} shadow-sm print:shadow-none`} style={{ width: `${pg.w}mm`, height: `${pg.h}mm` }}>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${pg.cols}, ${pg.cellW}mm)`, gridAutoRows: `${pg.cellH}mm`, justifyContent: "center", alignContent: pg.cols === 1 || pg.name.startsWith("stand") ? "center" : "start", paddingTop: pg.name === "card-sheet" ? "11mm" : 0, height: "100%", boxSizing: "border-box" }}>
              {pg.items.map(l => (
                <div key={l.id} className={layout === "sheet" ? "cut" : undefined}>
                  {l.size === "stand" ? <Tent l={l} /> : (
                    <WallLabelArt work={l.work!} artistName={l.artistName} design={l.design} size={l.size} language={l.language}
                      sales={l.sales} show={l.show} note={l.note} placeName={l.place_name} code={l.code} />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}

/** A stand is an A5 sheet folded in half: the top face is upside down, so both sides read upright. */
function Tent({ l }: { l: LabelBundle }) {
  const art = (
    <WallLabelArt work={l.work!} artistName={l.artistName} design={l.design} size="stand" language={l.language}
      sales={l.sales} show={l.show} note={l.note} placeName={l.place_name} code={l.code} />
  );
  return (
    <div style={{ width: "148mm", height: "210mm", display: "flex", flexDirection: "column" }}>
      <div style={{ transform: "rotate(180deg)" }}>{art}</div>
      <div style={{ height: 0, borderTop: "0.2mm dashed #B3A891" }} aria-hidden />
      {art}
    </div>
  );
}

type Page = { name: string; w: number; h: number; cols: number; cellW: number; cellH: number; items: LabelBundle[] };

function paginate(labels: LabelBundle[], layout: Layout): Page[] {
  const pages: Page[] = [];
  const bySize = new Map<LabelSize, LabelBundle[]>();
  labels.forEach(l => bySize.set(l.size, [...(bySize.get(l.size) || []), l]));
  for (const [size, list] of Array.from(bySize.entries())) {
    const s = sizeOf(size);
    const cell = size === "stand" ? { w: 148, h: 210 } : { w: s.w, h: s.h };
    if (layout === "exact") {
      list.forEach(l => pages.push({ name: `${size}-exact`, w: cell.w, h: cell.h, cols: 1, cellW: cell.w, cellH: cell.h, items: [l] }));
      continue;
    }
    // A4 portrait for cards (2 × 5) and posts (2 × 2); A4 landscape for stands (2 side by side).
    const sheet = size === "stand" ? { w: 297, h: 210, cols: 2 } : { w: 210, h: 297, cols: 2 };
    for (let i = 0; i < list.length; i += s.perSheet) {
      pages.push({ name: `${size}-sheet`, w: sheet.w, h: sheet.h, cols: sheet.cols, cellW: cell.w, cellH: cell.h, items: list.slice(i, i + s.perSheet) });
    }
  }
  return pages;
}

const PAGE_CSS = `
.label-page { background: #fff; overflow: hidden; break-after: page; page-break-after: always; box-sizing: border-box; }
.label-page:last-child { break-after: auto; page-break-after: auto; }
.cut { outline: 0.15mm solid #E8E0D0; outline-offset: 0; }
@page { margin: 0; }
@page card-sheet { size: A4 portrait; margin: 0; }
@page post-sheet { size: A4 portrait; margin: 0; }
@page stand-sheet { size: A4 landscape; margin: 0; }
@page card-exact { size: 85mm 55mm; margin: 0; }
@page post-exact { size: 105mm 148mm; margin: 0; }
@page stand-exact { size: 148mm 210mm; margin: 0; }
.label-card-sheet { page: card-sheet; } .label-post-sheet { page: post-sheet; } .label-stand-sheet { page: stand-sheet; }
.label-card-exact { page: card-exact; } .label-post-exact { page: post-exact; } .label-stand-exact { page: stand-exact; }
@media print {
  html, body { background: #fff !important; }
  .label-page { margin: 0 !important; }
}
`;
