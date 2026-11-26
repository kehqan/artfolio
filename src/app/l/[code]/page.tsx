// The piece page behind a wall label's QR code: /l/<code>.
// In the order a visitor asks: what is it, where am I, can I have it, who
// made it, what's its story. No account needed to look.
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { cache } from "react";
import { publicClient } from "@/lib/supabase/public";
import { Avatar, Badge, ButtonLink, EmptyState } from "@/components/ui";
import { Wordmark } from "@/components/brand/Wordmark";
import { Mat } from "@/components/public/PublicChrome";
import { dims, printedPrice, rangeLine } from "@/lib/labels";
import { FollowButton, PassportLink, SellingActions } from "./Actions";

type Page = {
  label: { code: string; sales: "price" | "ask" | "off"; sold: boolean; place_name: string | null; place_city: string | null; starts_on: string | null; ends_on: string | null; note: string | null; place: { username: string | null; avatar_url: string | null; name: string | null } | null };
  work: { id: string; title: string; year: number | null; medium: string | null; width_cm: number | null; height_cm: number | null; depth_cm: number | null; images: string[]; description: string | null; editions: number | null; certificate_id: string | null; authentication_status: string | null; price: number | null; currency: string | null };
  artist: { id: string; full_name: string | null; username: string | null; avatar_url: string | null; location: string | null; bio: string | null } | null;
  followers: number;
  passport: { event_type: string; date: string | null; location: string | null; owner_name: string | null }[];
  passport_count: number;
  more: { id: string; title: string; image: string | null }[];
  neighbours: { code: string; title: string; image: string | null; artist: string | null }[];
};

const EVENT: Record<string, string> = {
  created: "Made", sold: "Sold", transferred: "Changed hands", exhibited: "Shown", restored: "Restored", appraised: "Appraised", donated: "Donated", loaned: "Lent",
};

// Built once and kept on the CDN for 30 s: a scan opens from the edge, and a
// change (sold, new dates) shows within half a minute.
export const revalidate = 30;
// No pages are built ahead; each is built on its first visit, then cached.
export async function generateStaticParams() { return []; }

// generateMetadata and the page share one database call.
const load = cache(async (code: string): Promise<Page | null> => {
  const clean = (code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  if (!clean) return null;
  const { data } = await publicClient().rpc("label_page", { p_code: clean });
  return (data as Page | null) || null;
});

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const p = await load(params.code);
  if (!p) return { title: "Artwork" };
  const by = p.artist?.full_name ? ` by ${p.artist.full_name}` : "";
  return {
    title: `${p.work.title}${by}`,
    description: p.label.place_name ? `On view at ${p.label.place_name}.` : "On Artomango.",
    openGraph: { title: `${p.work.title}${by}`, images: p.work.images?.[0] ? [p.work.images[0]] : undefined },
    robots: { index: false },
  };
}

export default async function PiecePage({ params }: { params: { code: string } }) {
  const p = await load(params.code);
  if (!p) {
    return (
      <div className="min-h-screen bg-page">
        <Top />
        <main className="mx-auto max-w-[640px] px-4 py-16">
          <EmptyState title="This label isn't linked to a work"
            description="It may have been removed by the artist. You can still find art and artists near you on Artomango."
            action={<ButtonLink href="/explore" variant="secondary">Explore Artomango</ButtonLink>} />
        </main>
      </div>
    );
  }

  const { label: l, work: w, artist: a } = p;
  const today = new Date().toISOString().slice(0, 10);
  const ended = !!l.ends_on && l.ends_on < today;
  const where = [l.place_name, l.place_city].filter(Boolean).join(", ");
  const meta = [w.year, w.medium, dims(w)].filter(Boolean).join(" · ");
  const price = l.sales === "price" ? printedPrice(w.price, w.currency) : null;
  const artistName = a?.full_name || "the artist";
  const first = artistName.split(" ")[0];
  const images = (w.images || []).filter(Boolean);

  return (
    <div className="min-h-screen bg-page text-fg">
      <Top />
      <main className="mx-auto grid max-w-[1080px] gap-8 px-4 pb-16 pt-4 sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-12 md:pt-10">
        {/* ── The work ── */}
        <div className="flex flex-col gap-3 md:sticky md:top-6 md:self-start">
          <Mat src={images[0]} alt={w.title} className="aspect-[4/5] w-full rounded-card md:aspect-square" pad="p-4" />
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.slice(1, 6).map((src, i) => <Mat key={src + i} src={src} alt={`${w.title}, view ${i + 2}`} className="h-16 w-16 shrink-0 rounded-control" pad="p-1" />)}
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {where && (
            <p className="flex items-start gap-2 rounded-control bg-mango-soft px-3.5 py-2.5 font-ui text-body-sm text-fg">
              <MapPin size={16} aria-hidden className="mt-0.5 shrink-0" />
              <span>
                {ended ? "Was on view at " : "On view at "}
                {l.place?.username
                  ? <Link href={`/${l.place.username}`} className="font-semibold underline-offset-2 hover:underline">{where}</Link>
                  : <span className="font-semibold">{where}</span>}
                {rangeLine(l.starts_on, l.ends_on) && <span className="text-fg-2"> · {rangeLine(l.starts_on, l.ends_on)}</span>}
              </span>
            </p>
          )}

          <div className="flex flex-col gap-2">
            <h1 className="text-balance font-display text-[44px] font-extrabold leading-[0.92] tracking-[-0.01em] text-fg sm:text-display">{w.title}</h1>
            {meta && <p className="font-ui text-body text-fg-2">{meta}</p>}
          </div>

          {/* ── Can I have it? ── */}
          {l.sold ? (
            <div className="flex flex-col gap-1.5">
              <Badge tone="inverse" className="self-start">Sold</Badge>
              <p className="font-ui text-body-sm text-fg-2">This work is in a private collection now. {first} has more below.</p>
            </div>
          ) : l.sales !== "off" && a ? (
            <div className="flex flex-col gap-3">
              <p className="font-display text-h1 leading-none tabular-nums text-fg">{price || "Price on request"}</p>
              <SellingActions code={l.code} artistId={a.id} artistFirst={first} workId={w.id} title={w.title} place={where} withPrice={!!price} />
            </div>
          ) : null}

          {/* ── Who made it ── */}
          {a && (
            <div className="flex items-center gap-3 rounded-card border-hair border-line bg-surface p-3.5">
              <Avatar name={artistName} src={a.avatar_url || undefined} size="md" />
              <div className="flex min-w-0 flex-1 flex-col">
                {a.username
                  ? <Link href={`/${a.username}`} className="truncate font-ui text-body font-semibold text-fg hover:underline">{artistName}</Link>
                  : <span className="truncate font-ui text-body font-semibold text-fg">{artistName}</span>}
                <span className="truncate font-ui text-caption text-fg-3">{[a.location, p.followers ? `${p.followers} ${p.followers === 1 ? "follower" : "followers"}` : ""].filter(Boolean).join(" · ") || "Artist"}</span>
              </div>
              <FollowButton code={l.code} artistId={a.id} artistFirst={first} />
            </div>
          )}

          {(l.note || w.description) && (
            <Block title={l.note ? `From ${first}` : "About the work"}>
              {l.note && <p className="font-ui text-body text-fg">{l.note}</p>}
              {w.description && <p className="whitespace-pre-line font-ui text-body-sm text-fg-2">{w.description}</p>}
            </Block>
          )}

          {/* ── Passport ── */}
          <Block title="Passport">
            {p.passport.length ? (
              <ol className="flex flex-col gap-1.5">
                {p.passport.map((e, i) => (
                  <li key={i} className="grid grid-cols-[5.5rem_1fr] gap-3 font-ui text-body-sm">
                    <span className="tabular-nums text-fg-3">{e.date ? new Date(e.date + "T12:00:00").toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "No date"}</span>
                    <span className="text-fg">{EVENT[e.event_type] || e.event_type}{e.owner_name ? <span className="text-fg-2"> · {e.owner_name}</span> : null}{e.location ? <span className="text-fg-2"> · {e.location}</span> : null}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="font-ui text-body-sm text-fg-3">Every work on Artomango has a passport: where it was made, shown and who owned it.</p>
            )}
            <PassportLink code={l.code} href={`/artwork/${w.id}/passport`} count={p.passport_count} />
          </Block>

          {p.more.length > 0 && (
            <Block title={`More by ${first}`}>
              <Strip items={p.more.map(m => ({ key: m.id, href: `/artwork/${m.id}/passport`, image: m.image, title: m.title }))} />
              {a?.username && <Link href={`/${a.username}`} className="inline-flex items-center gap-1 self-start font-ui text-label font-semibold text-fg-2 hover:text-fg">See all of {first}&rsquo;s work <ArrowRight size={14} aria-hidden /></Link>}
            </Block>
          )}

          {p.neighbours.length > 0 && !ended && (
            <Block title="Also on these walls">
              <Strip items={p.neighbours.map(n => ({ key: n.code, href: `/l/${n.code}`, image: n.image, title: n.title, sub: n.artist || undefined }))} />
            </Block>
          )}
        </div>
      </main>

      <footer className="bg-ink text-on-inverse">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-ui text-body-sm text-on-inverse/80">This label was made with Artomango, where artists and places find each other.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-ui text-body-sm font-semibold">
            <Link href="/register?role=artist" className="text-mango hover:underline">Artists: find walls like this one</Link>
            <Link href="/register?role=venue" className="text-mango hover:underline">Places: find art for yours</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Top() {
  return (
    <header className="border-b-hair border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <Link href="/explore" className="font-ui text-label font-semibold text-fg-2 hover:text-fg">Explore art</Link>
      </div>
    </header>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5 border-t-hair border-line pt-5">
      <h2 className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">{title}</h2>
      {children}
    </section>
  );
}

function Strip({ items }: { items: { key: string; href: string; image: string | null; title: string; sub?: string }[] }) {
  return (
    <ul className="grid grid-cols-3 gap-2.5">
      {items.slice(0, 6).map(it => (
        <li key={it.key}>
          <Link href={it.href} className="group flex flex-col gap-1">
            <Mat src={it.image} alt={it.title} className="aspect-square w-full rounded-control border-hair border-line group-hover:border-ink" pad="p-1" />
            <span className="truncate font-ui text-caption font-semibold text-fg">{it.title}</span>
            {it.sub && <span className="-mt-1 truncate font-ui text-caption text-fg-3">{it.sub}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
