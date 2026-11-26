"use client";
// A work opened from a personal site: photos, facts and a way to ask about it.
import { useState } from "react";
import { ChevronLeft, ChevronRight, FileText, MessageSquare } from "lucide-react";
import { Badge, Button, ButtonLink, Modal } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { Mat, formatPrice } from "@/components/public/PublicChrome";
import { type SiteWork, dimsOf } from "@/lib/site";
import { track } from "@/lib/analytics";

const SALE_LABEL: Record<string, string> = {
  direct: "Buy now", inquiry: "Inquire", price_on_request: "Price on request", auction: "Auction", not_for_sale: "Not for sale",
};
function statusBadge(status?: string): { tone: BadgeTone; label: string } | null {
  const s = (status || "").toLowerCase();
  if (s === "sold") return { tone: "inverse", label: "Sold" };
  if (s === "reserved") return { tone: "warn", label: "Reserved" };
  return null;
}
const dims = dimsOf;

// ── Artwork detail ─────────────────────────────────────────────────
export function WorkDetail({ aw, firstName, onClose, onMessage }: {
  aw: SiteWork; firstName: string; onClose: () => void; onMessage: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const imgs = (aw.images || []).filter(Boolean);
  const badge = statusBadge(aw.status);
  const canBuy = !!aw.sale_method && aw.sale_method !== "not_for_sale" && !badge;
  const price = aw.sale_method === "price_on_request" ? "" : formatPrice(aw.price, aw.currency);
  const facts: [string, string][] = [
    ["Year", aw.year ? String(aw.year) : ""],
    ["Medium", aw.medium || ""],
    ["Size", dims(aw)],
    ["Framed", aw.framed ? "Yes" : ""],
    ["Sale", aw.sale_method ? SALE_LABEL[aw.sale_method] || "" : ""],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={aw.title}
      footer={
        <>
          <ButtonLink href={`/artwork/${aw.id}/passport`} variant="ghost">
            <FileText size={15} aria-hidden /> Passport
          </ButtonLink>
          <Button variant={canBuy ? "primary" : "secondary"} onClick={() => { if (canBuy) track("buy_click", { where: "site", method: aw.sale_method || null }); onMessage(); }}>
            <MessageSquare size={15} aria-hidden />
            {canBuy ? (aw.sale_method === "direct" ? "Ask to buy" : "Ask about this work") : `Message ${firstName}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="relative">
          <Mat src={imgs[idx]} alt={aw.title} className="aspect-[4/3] w-full rounded-control" pad="p-4" />
          {imgs.length > 1 && (
            <>
              <button type="button" aria-label="Previous image" onClick={() => setIdx(i => (i - 1 + imgs.length) % imgs.length)}
                className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill border-outline border-ink bg-surface shadow-hard-1">
                <ChevronLeft size={16} aria-hidden />
              </button>
              <button type="button" aria-label="Next image" onClick={() => setIdx(i => (i + 1) % imgs.length)}
                className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-pill border-outline border-ink bg-surface shadow-hard-1">
                <ChevronRight size={16} aria-hidden />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-surface px-2.5 py-1 font-ui text-caption tabular-nums text-fg-2">
                {idx + 1} / {imgs.length}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-3">
          {price && !badge ? (
            <span className="font-display text-h2 font-bold tabular-nums text-fg">{price}</span>
          ) : badge ? (
            <Badge tone={badge.tone}>{badge.label}</Badge>
          ) : <span />}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {facts.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <dt className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">{k}</dt>
              <dd className="font-ui text-body-sm text-fg">{v}</dd>
            </div>
          ))}
        </dl>

        {aw.description && <p className="whitespace-pre-line font-ui text-body text-fg-2">{aw.description}</p>}
      </div>
    </Modal>
  );
}

