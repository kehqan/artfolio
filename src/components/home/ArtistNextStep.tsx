"use client";
// Home's first card for artists: the one thing worth doing now.
// In order of what matters most:
//   1. A venue is waiting on you (answer a request, sign an agreement).
//   2. Get a first work in, and get it ready to place.
//   3. Open a ready work to a wall (one tap, right here).
//   4. Give your site a look.
//   5. Places near you are looking for art: offer a work.
//   6. All done: share your site.
// Underneath, a quiet "x of 4 done" line until the basics are in place.
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileSignature, Hand, ImagePlus, MapPin, Palette, Send, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { type FeedItem, isLive, isPast, loadFeed, wantsArt } from "@/app/dashboard/scene/feed";
import { type PlaceArtwork, cityOf, isSold, missingForWall, sameCity, wallReady } from "@/lib/places";
import { type DealView, dealLink, isClosed, loadDeals } from "@/lib/deals";
import { useJourney } from "@/components/journey/JourneyProvider";
import { NextStepCard, type Progress } from "./NextStepCard";

type State = {
  me: string; city: string; username: string | null;
  works: PlaceArtwork[]; near: FeedItem[]; deals: DealView[];
  unsigned: Set<string>;  // contract ids still waiting for my signature
  hasSite: boolean;
};

export function ArtistNextStep() {
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast, celebrate } = useJourney();

  const load = useCallback(async () => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const [{ data: prof }, { data: works }, feed, deals, { data: site }] = await Promise.all([
      sb.from("profiles").select("location, username").eq("id", user.id).single(),
      sb.from("artworks").select("id,title,images,medium,width_cm,height_cm,depth_cm,price,currency,status,wall_terms,user_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      loadFeed(sb, user.id).catch(() => [] as FeedItem[]),
      loadDeals(sb, user.id).catch(() => null),
      sb.from("store_settings").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]);
    const city = cityOf(prof?.location);
    const list = deals || [];
    const contracts = list.filter(d => d.status === "agreement_sent" && d.contract_id).map(d => d.contract_id!) as string[];
    const unsigned = new Set<string>();
    if (contracts.length) {
      const { data: cs } = await sb.from("contracts").select("id,status,initiator_id,initiator_signed_at,counterparty_signed_at").in("id", contracts);
      (cs || []).forEach((c: any) => {
        if (c.status === "cancelled") return;
        const mine = c.initiator_id === user.id ? c.initiator_signed_at : c.counterparty_signed_at;
        if (!mine) unsigned.add(c.id);
      });
    }
    setS({
      me: user.id, city, username: prof?.username || null,
      works: ((works || []) as PlaceArtwork[]).filter(a => !isSold(a)),
      near: feed.filter(i => i.userId !== user.id && isLive(i) && !isPast(i) && wantsArt(i) && !!city && sameCity(i.where, city)),
      deals: list, unsigned, hasSite: !!site,
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!s) return <div aria-hidden className="h-[132px] rounded-card border-hair border-line bg-surface" />;

  const ready = s.works.filter(wallReady);
  const open = ready.filter(w => !!w.wall_terms);
  const progress: Progress = [
    { label: "Add a work", done: s.works.length > 0 },
    { label: "Ready to place", done: ready.length > 0 },
    { label: "Open to a wall", done: open.length > 0 },
    { label: "Your site", done: s.hasSite },
  ];
  const basicsDone = progress.every(p => p.done);
  const showProgress = basicsDone ? undefined : progress;

  async function openToWall(ids: string[]) {
    setBusy(true);
    const sb = createClient();
    const { error } = await sb.from("artworks").update({ wall_terms: "either" }).in("id", ids).eq("user_id", s!.me);
    setBusy(false);
    if (error) { toast({ title: "That didn't save", body: "Please try again.", tone: "plain" }); return; }
    const shown = await celebrate("open_to_wall", {
      title: ids.length === 1 ? "It's open to a wall" : `${ids.length} works are open to a wall`,
      body: `Places looking for art can now see ${ids.length === 1 ? "it" : "them"} and ask for ${ids.length === 1 ? "it" : "them"}. You say yes or no to every request.`,
      primary: { label: "See who's looking", href: "/dashboard/looking" },
    });
    if (!shown) toast({ title: ids.length === 1 ? "Open to a wall" : `${ids.length} works open to a wall`, body: "Places looking for art can see them now. You decide on every request.", action: { label: "See who's looking", href: "/dashboard/looking" } });
    load();
  }

  async function share() {
    if (!s?.username) return;
    const url = `${window.location.origin}/${s.username}`;
    try {
      if (navigator.share) { await navigator.share({ title: "My work", url }); return; }
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", body: "Paste it in your bio, an email or a message." });
    } catch { /* closed the share sheet */ }
  }

  // ── 1. Someone is waiting on you ──
  const live = s.deals.filter(d => !isClosed(d));
  const toSign = live.find(d => d.status === "agreement_sent" && d.contract_id && s.unsigned.has(d.contract_id));
  if (toSign) {
    const who = toSign.other?.full_name || "The venue";
    return <NextStepCard tone="mango" eyebrow="Your turn" icon={<FileSignature size={20} aria-hidden />} image={toSign.works[0]?.images?.[0] ?? null}
      title={`Sign your agreement with ${who}`}
      line="It's filled in from your deal. Read it, type your name, and the show is on."
      primary={{ label: "Review and sign", href: `/dashboard/contracts/${toSign.contract_id}` }} />;
  }
  const asked = live.find(d => d.status === "sent" && d.started_by !== s.me);
  if (asked) {
    const who = asked.other?.full_name || "A venue";
    const n = asked.artwork_ids.length;
    return <NextStepCard tone="mango" eyebrow="Your turn" image={asked.works[0]?.images?.[0] ?? null}
      title={`${who} would like to show ${n === 1 ? "your work" : `${n} of your works`}`}
      line="Say you're interested and they'll send an agreement. Saying no is fine too."
      primary={{ label: "Answer", href: dealLink(asked.id) }} />;
  }

  // ── 2. A first work, ready to place ──
  if (s.works.length === 0) {
    return <NextStepCard icon={<ImagePlus size={20} aria-hidden />} progress={showProgress}
      title="Add your first work"
      line="A photo, a name and a size. About a minute, and everything else can wait."
      primary={{ label: "Add a work", href: "/dashboard/artworks/new" }} />;
  }
  if (ready.length === 0) {
    const w = s.works[0];
    return <NextStepCard image={w.images?.[0] ?? null} progress={showProgress}
      title={`Finish ${w.title || "your work"}`}
      line={`It needs ${missingForWall(w).join(" and ")}. That's all a café or venue needs to say yes.`}
      primary={{ label: "Finish it", href: `/dashboard/artworks/new?finish=${w.id}` }} />;
  }

  // ── 3. Open to a wall, in one tap ──
  if (open.length === 0) {
    const ids = ready.slice(0, 6).map(w => w.id);
    return <NextStepCard image={ready[0].images?.[0] ?? null} progress={showProgress}
      title={ready.length === 1 ? `Open ${ready[0].title} to a wall` : `Open your ${ready.length} ready works to a wall`}
      line="Cafés and venues looking for art will see them and can ask for them. You decide on every request."
      primary={{ label: "Turn it on", onClick: () => openToWall(ids), busy }}
      secondary={{ label: "Choose works", href: "/dashboard/artworks" }} />;
  }

  // ── 4. Your site ──
  if (!s.hasSite) {
    return <NextStepCard icon={<Palette size={20} aria-hidden />} progress={showProgress}
      title="Give your site a look"
      line="Pick one of three looks and your works are on your own page. You can change it anytime."
      primary={{ label: "Pick a look", href: "/dashboard/site" }} />;
  }

  // ── 5. Places looking for art ──
  if (s.near.length > 0) {
    const offered = new Set(s.deals.filter(d => d.started_by === s.me && !isClosed(d)).map(d => d.venue_id));
    const fresh = s.near.filter(i => !offered.has(i.userId));
    if (fresh.length > 0) {
      return <NextStepCard tone="mango" icon={<MapPin size={20} aria-hidden />}
        title={`${fresh.length} ${fresh.length === 1 ? "place" : "places"} in ${s.city} ${fresh.length === 1 ? "is" : "are"} looking for art`}
        line={`${fresh.slice(0, 2).map(i => i.poster?.full_name).filter(Boolean).join(", ")}${fresh.length > 2 ? " and more" : ""}. Your ${open.length === 1 ? "work is" : `${open.length} works are`} ready to offer.`}
        primary={{ label: "Offer a work", href: "/dashboard/looking" }} />;
    }
  }

  // ── Waiting on others ──
  const mine = live.filter(d => d.started_by === s.me && d.status === "sent");
  if (mine.length > 0) {
    const d = mine[0];
    return <NextStepCard eyebrow="Waiting" icon={<Hand size={20} aria-hidden />}
      title={mine.length === 1 ? `${d.other?.full_name || "The venue"} has your offer` : `${mine.length} offers are out`}
      line="We'll tell you the moment they answer, here and by email. Nothing to do for now."
      primary={{ label: "See your deals", href: "/dashboard/messages?tab=deals" }} />;
  }

  // ── 6. All set ──
  if (s.username) {
    return <NextStepCard icon={s.near.length ? <Send size={20} aria-hidden /> : <CheckCircle2 size={20} aria-hidden />}
      title="You're ready to place"
      line={s.city
        ? `No new places are asking in ${s.city} right now. We'll tell you the moment one does. Meanwhile, share your site.`
        : "We'll tell you the moment a place asks for art. Meanwhile, share your site."}
      primary={{ label: "Share your site", onClick: share }}
      secondary={{ label: "Who's looking", href: "/dashboard/looking" }} />;
  }
  return <NextStepCard icon={<Share2 size={20} aria-hidden />}
    title="You're ready to place"
    line="We'll tell you the moment a place near you asks for art."
    primary={{ label: "Who's looking", href: "/dashboard/looking" }} />;
}
