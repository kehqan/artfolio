"use client";
// The public page of an artist or a venue: their personal site, in the
// look they picked in "Your site". With ?preview=1 the editor sends the
// look it is showing, so the owner sees changes before saving.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MessageModal from "@/components/MessageModal";
import { ButtonLink, EmptyState, Skeleton, cn } from "@/components/ui";
import { PublicHeader, formatPrice, publicWrap } from "@/components/public/PublicChrome";
import { Site } from "@/components/site/Site";
import { WorkDetail } from "@/components/site/WorkDetail";
import { type PreviewMessage, type SiteConfig, type SiteData, type SiteWork, isVenueRole, loadSiteData, siteOf } from "@/lib/site";

type MessageContext = { kind: "direct" } | { kind: "artwork"; aw: SiteWork };

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  // Older addresses may hold accents or apostrophes, which arrive encoded.
  const username = (() => { const u = params?.username; if (!u) return u; try { return decodeURIComponent(u); } catch { return u; } })();
  const [data, setData] = useState<SiteData | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<SiteWork | null>(null);
  const [message, setMessage] = useState<MessageContext | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!username) return;
    loadSiteData(createClient(), { username }).then(d => {
      if (!d) { setNotFound(true); return; }
      setData(d);
      setSite(siteOf(d.settings.site, d.profile.role));
    });
  }, [username]);

  // Live preview from the editor (same origin only).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("preview") !== "1") return;
    setPreview(true);
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "site-preview") return;
      const m = e.data as PreviewMessage;
      setSite(m.site);
      setData(d => (d ? { ...d, settings: { ...d.settings, ...m.settings } } : d));
    };
    window.addEventListener("message", on);
    window.parent?.postMessage({ type: "site-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", on);
  }, []);

  if (notFound) {
    return (
      <div className="min-h-screen bg-page">
        <PublicHeader />
        <div className={cn(publicWrap, "py-20")}>
          <EmptyState
            title="No one here by that name"
            description={`We couldn't find a page at /${username}. The link may be old, or the name may have changed.`}
            action={<ButtonLink href="/explore" variant="secondary">Explore artists</ButtonLink>}
          />
        </div>
      </div>
    );
  }

  if (!data || !site) {
    return (
      <div className="min-h-screen bg-page" aria-busy>
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-24 sm:px-8">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-20 w-[min(560px,100%)]" />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="aspect-square" />)}</div>
        </div>
      </div>
    );
  }

  const p = data.profile;
  const firstName = (p.full_name || "them").split(" ")[0];

  return (
    <>
      <Site data={data} site={site} preview={preview}
        onOpenWork={w => setSelected(w)}
        onMessage={() => !preview && setMessage({ kind: "direct" })} />

      {selected && (
        <WorkDetail aw={selected} firstName={firstName} onClose={() => setSelected(null)}
          onMessage={() => { if (!preview) setMessage({ kind: "artwork", aw: selected }); setSelected(null); }} />
      )}

      <MessageModal
        isOpen={!!message}
        onClose={() => setMessage(null)}
        recipientId={p.id}
        recipientName={p.full_name}
        recipientAvatar={p.avatar_url || undefined}
        recipientRole={p.role || undefined}
        {...(message?.kind === "artwork"
          ? {
              contextType: "artwork_inquiry" as const,
              contextTitle: message.aw.title,
              contextId: message.aw.id,
              contextMeta: {
                label: "Artwork inquiry",
                image: message.aw.images?.[0],
                subtitle: [message.aw.year, message.aw.medium, formatPrice(message.aw.price, message.aw.currency)].filter(Boolean).join(" · "),
              },
            }
          : {
              contextType: "direct" as const,
              contextTitle: `Message to ${p.full_name}`,
              contextMeta: { label: isVenueRole(p.role) ? "Venue" : "Artist", subtitle: p.location || "" },
            })}
      />
    </>
  );
}
