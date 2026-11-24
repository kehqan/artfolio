"use client";
// Public "Art available near you": works artists have marked open to a
// wall, by city. It's the page Artomango sends to cafés and venues when
// inviting them: here is the art in your city, ready to hang.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, ButtonLink, EmptyState, Eyebrow, Heading, Skeleton, cn } from "@/components/ui";
import { Mat, PublicFooter, PublicHeader, publicWrap } from "@/components/public/PublicChrome";
import { type PlaceArtwork, cityOf, citySlug, isSold, workLine } from "@/lib/places";

const cityChip = (on: boolean) => cn(
  "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border-hair px-3 font-ui text-label font-semibold transition-colors duration-fast",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
  on ? "border-ink bg-inverse text-on-inverse" : "border-line bg-surface text-fg-2 hover:border-ink hover:text-fg",
);

type Artist = { id: string; full_name?: string; username?: string; avatar_url?: string; location?: string };
type Work = PlaceArtwork & { artist?: Artist; city: string };

export function AvailableNearYou({ slug }: { slug?: string }) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => setSignedIn(!!user));
    (async () => {
      const { data } = await sb.from("artworks")
        .select("id,title,images,medium,width_cm,height_cm,depth_cm,price,currency,status,wall_terms,user_id")
        .not("wall_terms", "is", null).not("images", "is", null)
        .order("created_at", { ascending: false }).limit(200);
      const list = ((data || []) as PlaceArtwork[]).filter(a => !isSold(a) && a.images?.length);
      const ids = Array.from(new Set(list.map(a => a.user_id).filter(Boolean))) as string[];
      const people = new Map<string, Artist>();
      if (ids.length) {
        const { data: ps } = await sb.from("profiles").select("id,full_name,username,avatar_url,location").in("id", ids);
        (ps || []).forEach((p: Artist) => people.set(p.id, p));
      }
      setWorks(list.map(a => {
        const artist = people.get(a.user_id || "");
        return { ...a, artist, city: cityOf(artist?.location) };
      }));
      setLoading(false);
    })();
  }, []);

  // Cities with works, biggest first.
  const cities = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    works.forEach(w => {
      if (!w.city) return;
      const k = citySlug(w.city);
      const c = m.get(k) || { name: w.city, count: 0 };
      c.count++; m.set(k, c);
    });
    return Array.from(m.entries()).map(([key, v]) => ({ key, ...v })).sort((a, b) => b.count - a.count);
  }, [works]);

  const here = slug ? cities.find(c => c.key === slug) : null;
  const cityName = here?.name || (slug ? slug.split("-").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ") : "");
  const shown = slug ? works.filter(w => citySlug(w.city) === slug) : works;
  const artists = new Set(shown.map(w => w.user_id)).size;

  return (
    <div className="min-h-screen bg-page text-fg">
      <PublicHeader signedIn={signedIn} />

      <section className="border-b-hair border-line bg-surface">
        <div className={cn(publicWrap, "flex flex-col gap-6 py-10 lg:py-14")}>
          <div className="flex max-w-[680px] flex-col gap-3">
            <Eyebrow>Art for your walls</Eyebrow>
            <Heading level={1} size="display">{cityName ? `Art available in ${cityName}` : "Art available near you"}</Heading>
            <p className="font-ui text-lead text-fg-2">
              Original works from local artists, ready to hang in a café, bar, shop or office. Show them for a few months,
              sell them through your space, or simply enjoy them.
            </p>
            {!loading && shown.length > 0 && (
              <p className="font-ui text-body text-fg-2">
                <span className="font-semibold tabular-nums text-fg">{shown.length}</span> {shown.length === 1 ? "work" : "works"} from{" "}
                <span className="font-semibold tabular-nums text-fg">{artists}</span> {artists === 1 ? "artist" : "artists"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/register?role=venue" variant="primary">Have walls? Tell artists <ArrowRight size={15} aria-hidden /></ButtonLink>
            <ButtonLink href="/register?role=artist" variant="secondary">I&rsquo;m an artist</ButtonLink>
          </div>
          {cities.length > 1 && (
            <nav aria-label="Cities" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <Link href="/available" aria-current={!slug ? "page" : undefined} className={cityChip(!slug)}>All cities</Link>
              {cities.map(c => (
                <Link key={c.key} href={`/available/${c.key}`} aria-current={slug === c.key ? "page" : undefined} className={cityChip(slug === c.key)}>
                  <MapPin size={13} aria-hidden /> {c.name} <span className="tabular-nums opacity-70">{c.count}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </section>

      <main className={cn(publicWrap, "flex flex-col gap-10 py-10 lg:py-14")}>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-[4/5] rounded-card" />)}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            title={cityName ? `No works in ${cityName} yet` : "No works yet"}
            description="Artists are adding their work now. Tell us you have walls and we'll let you know when art near you is ready."
            action={<ButtonLink href="/register?role=venue" variant="secondary">Tell artists you have walls</ButtonLink>}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {shown.map(w => (
              <li key={w.id}>
                <Link href={`/artwork/${w.id}/passport`} className="group flex flex-col gap-2.5">
                  <Mat src={w.images?.[0]} alt={w.title} className="aspect-[4/5] w-full rounded-card border-hair border-line transition-colors duration-fast group-hover:border-ink" />
                  <span className="flex flex-col gap-0.5">
                    <span className="truncate font-ui text-body-sm font-semibold text-fg">{w.title}</span>
                    <span className="truncate font-ui text-caption text-fg-3">{workLine(w)}</span>
                    <span className="flex items-center gap-1.5 pt-1">
                      <Avatar name={w.artist?.full_name || "Artist"} src={w.artist?.avatar_url} size="sm" />
                      <span className="truncate font-ui text-caption text-fg-2">{w.artist?.full_name || "Artist"}{w.city && !slug ? ` · ${w.city}` : ""}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
