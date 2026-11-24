"use client";
// The first thing on Home: "Where can my work go?"
// When venues near the artist are asking for art, it says how many and
// links to them. Until then (most of launch), it shows how many works are
// ready to place and what the next one still needs.
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, ButtonLink, cn } from "@/components/ui";
import { type FeedItem, isLive, isPast, loadFeed, wantsArt } from "@/app/dashboard/scene/feed";
import { type PlaceArtwork, cityOf, isSold, missingForWall, sameCity, wallReady } from "@/lib/places";

type State = { city: string; venue: boolean; works: PlaceArtwork[]; near: FeedItem[] };

export function PlacesStrip() {
  const [s, setS] = useState<State | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: prof }, { data: works }, feed] = await Promise.all([
        sb.from("profiles").select("role, location").eq("id", user.id).single(),
        sb.from("artworks").select("*").eq("user_id", user.id),
        loadFeed(sb, user.id).catch(() => [] as FeedItem[]),
      ]);
      const city = cityOf(prof?.location);
      const near = feed.filter(i => i.userId !== user.id && isLive(i) && !isPast(i) && wantsArt(i) && !!city && sameCity(i.where, city));
      setS({
        city, venue: prof?.role === "venue" || prof?.role === "gallery",
        works: ((works || []) as PlaceArtwork[]).filter(a => !isSold(a)), near,
      });
    });
  }, []);

  if (!s) return <div aria-hidden className="h-[104px] rounded-card border-hair border-line bg-surface" />;

  if (s.venue) {
    return (
      <Strip tone="plain" icon={<Store size={20} aria-hidden />}
        title="Find art for your walls"
        body="See works artists have marked open to a wall, or post what you're looking for."
        action={<ButtonLink href="/dashboard/looking" variant="primary">Find artists <ArrowRight size={15} aria-hidden /></ButtonLink>} />
    );
  }

  if (s.near.length > 0) {
    const n = s.near.length;
    return (
      <Strip tone="mango" icon={<MapPin size={20} aria-hidden />}
        title={`${n} ${n === 1 ? "place" : "places"} in ${s.city} ${n === 1 ? "is" : "are"} looking for art`}
        body={
          <span className="flex items-center gap-2">
            <span className="flex -space-x-2">
              {s.near.slice(0, 3).map(i => <Avatar key={i.key} name={i.poster?.full_name || "Venue"} src={i.poster?.avatar_url} size="sm" />)}
            </span>
            <span className="truncate">{s.near.slice(0, 2).map(i => i.poster?.full_name).filter(Boolean).join(", ")}{n > 2 ? " and more" : ""}</span>
          </span>
        }
        action={<ButtonLink href="/dashboard/looking" variant="primary">See them <ArrowRight size={15} aria-hidden /></ButtonLink>} />
    );
  }

  const total = s.works.length;
  const ready = s.works.filter(wallReady).length;
  const next = s.works.find(a => !wallReady(a));

  if (total === 0) {
    return (
      <Strip tone="plain" icon={<MapPin size={20} aria-hidden />}
        title="Where can your work go?"
        body="Start with one work: a photo, its size and a price. That's all a café or venue needs to say yes."
        action={<ButtonLink href="/dashboard/artworks/new" variant="primary">Add a work <ArrowRight size={15} aria-hidden /></ButtonLink>} />
    );
  }

  return (
    <Strip tone="plain" icon={<MapPin size={20} aria-hidden />}
      title={ready === total ? `All ${total} works are ready to place` : `${ready} of ${total} works ready to place`}
      body={
        <span className="flex flex-col gap-2">
          <span className="h-2 w-full max-w-sm overflow-hidden rounded-pill border-hair border-line bg-sunken" aria-hidden>
            <span className="block h-full bg-mango" style={{ width: `${Math.round((ready / total) * 100)}%` }} />
          </span>
          <span>
            {next
              ? <>Next: <Link href={`/dashboard/artworks/${next.id}/edit`} className="font-semibold text-fg underline underline-offset-2">{next.title}</Link> needs {missingForWall(next).join(", ")}.</>
              : <>No venues are posting{s.city ? ` in ${s.city}` : ""} yet. You&rsquo;ll be first in line when they do.</>}
          </span>
        </span>
      }
      action={<ButtonLink href="/dashboard/looking" variant="secondary">Who&rsquo;s looking <ArrowRight size={15} aria-hidden /></ButtonLink>} />
  );
}

function Strip({ tone, icon, title, body, action }: {
  tone: "mango" | "plain"; icon: React.ReactNode; title: string; body: React.ReactNode; action: React.ReactNode;
}) {
  return (
    <section aria-label="Where can my work go"
      className={cn(
        "flex flex-col gap-4 rounded-card border-outline border-ink p-5 shadow-hard-1 sm:flex-row sm:items-center",
        tone === "mango" ? "bg-mango-soft" : "bg-surface",
      )}>
      <span aria-hidden className="hidden h-11 w-11 shrink-0 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango sm:grid">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="font-display text-h3 leading-tight text-fg">{title}</h2>
        <div className="font-ui text-body-sm text-fg-2">{body}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </section>
  );
}
