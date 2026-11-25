"use client";
// Posting to the Scene, one question at a time.
//
// Artists and venues want different things, so each sees only their own
// four choices. Every choice says in one line what it's for, asks one
// question per screen, fills in what we already know (city, venue
// address, how works are offered), writes the title for you, and ends
// on a preview of the card exactly as it will look in the feed, with
// one line on who will see it.
//
// Saving uses the tables that already hold each kind of post, so the
// feed, map, Looking for art and Find artists pick it up as they are.
// Editing an existing post still uses the one-screen Composer.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, Brush, CalendarDays, Coins, Frame, Handshake, ImagePlus, Megaphone, Store, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useJourney } from "@/components/journey/JourneyProvider";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { Alert, Button, Chip, Input, Modal, Switch, Textarea, cn } from "@/components/ui";
import { type FeedItem, type Kind, SHOW_TYPES, isVenueRole, wallTermsLine } from "./feed";
import { SceneCard } from "./SceneCard";
import { type PlaceArtwork, type WallTerms, cityOf, isSold } from "@/lib/places";

export type PostKind = "show" | "place" | "collab" | "commission" | "walls" | "opencall" | "buying";

type ChoiceDef = { key: PostKind; title: string; desc: string; icon: typeof Store };

const ARTIST_CHOICES: ChoiceDef[] = [
  { key: "show", title: "I have a show or event", desc: "Invite people to an exhibition, opening, workshop or open studio.", icon: CalendarDays },
  { key: "place", title: "I'm looking for a place to show my work", desc: "Pick works from your studio. Venues near you will see them.", icon: Frame },
  { key: "collab", title: "I want to work with someone", desc: "Find a partner for a project.", icon: Handshake },
  { key: "commission", title: "I take commissions", desc: "Tell people what you make and from what price.", icon: Brush },
];
const VENUE_CHOICES: ChoiceDef[] = [
  { key: "walls", title: "We want art for our walls", desc: "Artists near you can offer works straight away.", icon: Store },
  { key: "show", title: "We're putting on a show or event", desc: "Invite people to an exhibition, opening or event.", icon: CalendarDays },
  { key: "opencall", title: "Open call", desc: "Artists apply for a show, a residency or an event.", icon: Megaphone },
  { key: "buying", title: "We want to buy art", desc: "Tell artists what you're looking for.", icon: Coins },
];

const KIND_OF: Record<PostKind, Kind> = {
  show: "show", place: "collab", collab: "collab", commission: "collab", walls: "opportunity", opencall: "opportunity", buying: "opportunity",
};
const LABEL_OF: Record<PostKind, string> = {
  show: "Exhibition", place: "Looking for a venue", collab: "Collab", commission: "Commission",
  walls: "Art for our walls", opencall: "Open call", buying: "Looking to buy",
};

type Step =
  | "showType" | "title" | "when" | "where" | "image" | "note"
  | "works" | "terms"
  | "partner" | "idea"
  | "makes" | "priceFrom"
  | "space" | "wall" | "duration" | "selling"
  | "callFor" | "applyBy" | "howMany" | "howApply"
  | "buyWhat" | "budget"
  | "preview";

const STEPS: Record<PostKind, Step[]> = {
  show: ["showType", "title", "when", "where", "image", "note", "preview"],
  place: ["works", "where", "terms", "note", "preview"],
  collab: ["partner", "idea", "where", "image", "preview"],
  commission: ["makes", "priceFrom", "image", "preview"],
  walls: ["space", "where", "wall", "duration", "selling", "note", "preview"],
  opencall: ["callFor", "applyBy", "howMany", "howApply", "image", "note", "preview"],
  buying: ["buyWhat", "budget", "note", "preview"],
};

const PARTNERS = ["A painter", "A photographer", "A musician", "A writer", "A designer", "A printmaker", "Anyone creative"];
const CALL_FOR = ["A group show", "A solo show", "A residency", "An event"];
const DURATIONS = ["1 month", "2 months", "3 months", "Ongoing"];
const BUY_WHAT = ["Paintings", "Prints", "Photography", "Small works", "Sculpture"];

type Answers = {
  title: string; titleTouched: boolean;
  showType: string; start: string; end: string;
  where: string; lat: number | null; lng: number | null; online: boolean; link: string;
  images: string[]; note: string;
  works: string[]; terms: WallTerms;
  partner: string; idea: string;
  makes: string; priceFrom: string;
  wall: string; duration: string; sells: boolean; commission: string;
  callFor: string; applyBy: string; howMany: string; applyLink: string;
  buyWhat: string; budget: string;
};

const EMPTY: Answers = {
  title: "", titleTouched: false, showType: "exhibition", start: "", end: "",
  where: "", lat: null, lng: null, online: false, link: "", images: [], note: "",
  works: [], terms: "either", partner: "", idea: "", makes: "", priceFrom: "",
  wall: "", duration: "", sells: true, commission: "", callFor: "", applyBy: "", howMany: "", applyLink: "",
  buyWhat: "", budget: "",
};

type Me = { id: string; full_name?: string; avatar_url?: string; role?: string; location?: string; username?: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onPosted: () => void;
  /** Open straight on one kind, e.g. "walls" from Find artists. */
  start?: PostKind | null;
};

export function PostFlow({ open, onClose, onPosted, start }: Props) {
  const { toast, celebrate } = useJourney();
  const [me, setMe] = useState<Me | null>(null);
  const [works, setWorks] = useState<PlaceArtwork[]>([]);
  const [kind, setKind] = useState<PostKind | null>(null);
  const [at, setAt] = useState(0);
  const [a, setA] = useState<Answers>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const venue = isVenueRole(me?.role);
  const name = me?.full_name || (venue ? "our venue" : "me");
  const first = (me?.full_name || "").split(" ")[0] || "An artist";
  const city = cityOf(me?.location);

  useEffect(() => {
    if (!open) return;
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: prof }, { data: ws }] = await Promise.all([
        sb.from("profiles").select("id, full_name, avatar_url, role, location, username").eq("id", user.id).single(),
        sb.from("artworks").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setMe(prof ? { ...prof, id: user.id } : { id: user.id });
      setWorks(((ws || []) as PlaceArtwork[]).filter(w => !isSold(w) && w.images?.length));
    });
  }, [open]);

  // Fresh start every time the sheet opens; venue's own address is the default place.
  useEffect(() => {
    if (!open) return;
    setKind(start || null); setAt(0); setError(""); setSaving(false);
    setA(EMPTY);
  }, [open, start]);

  useEffect(() => {
    if (!open || !me) return;
    setA(p => (p.where ? p : { ...p, where: venue ? me.location || "" : city }));
  }, [open, me, venue, city]);

  // Works open to a wall come first and are ticked; their terms set the default.
  useEffect(() => {
    if (kind !== "place" || !works.length) return;
    const open_ = works.filter(w => w.wall_terms);
    setA(p => p.works.length ? p : {
      ...p,
      works: open_.slice(0, 6).map(w => w.id),
      terms: (open_[0]?.wall_terms as WallTerms) || "either",
    });
  }, [kind, works]);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA(p => ({ ...p, [k]: v }));
  const steps = kind ? STEPS[kind] : [];
  const step = steps[at];
  const sortedWorks = useMemo(() => [...works].sort((x, y) => Number(!!y.wall_terms) - Number(!!x.wall_terms)), [works]);

  // ── The title we write for you ──
  const autoTitle = useMemo(() => {
    const where = cityOf(a.where) || city;
    switch (kind) {
      case "show": return "";
      case "place": return `${first} is looking for a wall${where ? ` in ${where}` : ""}`;
      case "collab": return a.partner ? `Looking for ${a.partner.toLowerCase()} to work with` : "Looking for someone to work with";
      case "commission": return a.makes ? `Commissions: ${a.makes}` : "Open for commissions";
      case "walls": return `Art for our walls at ${name}`;
      case "opencall": return `Open call: ${(a.callFor || "artists wanted").toLowerCase()} at ${name}`;
      case "buying": return `${name} wants to buy ${(a.buyWhat || "art").toLowerCase()}`;
      default: return "";
    }
  }, [kind, a.where, a.partner, a.makes, a.callFor, a.buyWhat, city, first, name]);
  const title = a.titleTouched || kind === "show" ? a.title : autoTitle;

  // ── Navigation ──
  const canNext = (): boolean => {
    switch (step) {
      case "title": return !!a.title.trim();
      case "when": return !!a.start && (!a.end || a.end >= a.start);
      case "works": return a.works.length > 0;
      case "partner": return !!a.partner.trim();
      case "idea": return !!a.idea.trim();
      case "makes": return !!a.makes.trim();
      case "callFor": return !!a.callFor.trim();
      case "buyWhat": return !!a.buyWhat.trim();
      case "preview": return !!title.trim();
      default: return true;
    }
  };
  const OPTIONAL: Step[] = ["image", "note", "priceFrom", "space", "wall", "duration", "howMany", "budget", "applyBy"];
  const next = () => { setError(""); setAt(i => Math.min(i + 1, steps.length - 1)); };
  const back = () => { setError(""); if (at === 0) { if (!start) setKind(null); } else setAt(i => i - 1); };

  // ── Images ──
  async function upload(files: FileList | null) {
    if (!files?.length || !me) return;
    setUploading(true); setError("");
    const sb = createClient();
    const added: string[] = [];
    const picked = Array.from(files).slice(0, 6 - a.images.length);
    for (let i = 0; i < picked.length; i++) {
      const f = picked[i];
      const path = `${me.id}/scene/${Date.now()}-${i}.${f.name.split(".").pop() || "jpg"}`;
      const { error: e } = await sb.storage.from("artworks").upload(path, f, { upsert: true, contentType: f.type });
      if (e) { setError("One of the photos didn't upload. Please try again."); continue; }
      added.push(sb.storage.from("artworks").getPublicUrl(path).data.publicUrl);
    }
    setA(p => ({ ...p, images: [...p.images, ...added].slice(0, 6) }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Build the post (used for the preview and for saving) ──
  const chosenWorks = works.filter(w => a.works.includes(w.id));
  const images = kind === "place" ? chosenWorks.map(w => w.images![0]) : a.images;
  const details = kind === "walls"
    ? { wall: a.wall.trim() || undefined, duration: a.duration.trim() || undefined, sells: a.sells, commission: a.sells && a.commission ? Number(a.commission) : null }
    : kind === "place" ? { works: a.works, terms: a.terms } : null;
  const description = (() => {
    switch (kind) {
      case "collab": return a.idea.trim();
      case "commission": return [a.note.trim()].filter(Boolean).join("\n\n") || null;
      case "opencall": return [a.note.trim(), a.applyLink.trim() ? "" : "Apply by sending us a message on Artomango."].filter(Boolean).join("\n\n");
      case "buying": return [a.budget.trim() ? `Budget: ${a.budget.trim()}` : "", a.note.trim()].filter(Boolean).join("\n\n") || null;
      case "place": return [chosenWorks.length ? `Works: ${chosenWorks.map(w => w.title).join(", ")}` : "", a.note.trim()].filter(Boolean).join("\n\n");
      default: return a.note.trim() || null;
    }
  })();
  const where = a.online ? null : a.where.trim() || null;

  const previewItem: FeedItem | null = kind && me ? {
    key: "preview", source: kind === "show" ? "show" : ["place", "walls", "buying"].includes(kind) ? "pool" : "scene",
    id: "preview", userId: me.id, kind: KIND_OF[kind],
    typeLabel: kind === "show" ? SHOW_TYPES.find(s => s.key === a.showType)?.label || "Exhibition" : LABEL_OF[kind],
    title: title || "Untitled", description, images, where, online: a.online, link: a.link || a.applyLink || null,
    start: a.start || null, end: a.end || null, deadline: a.applyBy || null,
    price: kind === "commission" ? a.priceFrom.trim() || null : null, lat: a.lat, lng: a.lng,
    createdAt: new Date().toISOString(), poster: me, raw: { request_type: kind, details, is_public: true, status: "open" },
  } : null;

  const whoSees = (() => {
    const c = cityOf(a.where) || city;
    switch (kind) {
      case "show": return a.online ? "Everyone in the Scene feed." : "Everyone in the Scene feed, and on the map if it has an address.";
      case "place": return `Venues${c ? ` in ${c}` : ""} will see this in Find artists, with your works.`;
      case "collab": case "commission": return "Everyone in the Scene feed.";
      case "walls": return `Artists${c ? ` in ${c}` : ""} will see this first in Looking for art, and can offer you works.`;
      case "opencall": return "Artists will see this in Looking for art and the Scene feed.";
      case "buying": return `Artists${c ? ` in ${c}` : ""} will see this in Looking for art.`;
      default: return "";
    }
  })();

  async function post() {
    if (!kind || !me) return;
    setSaving(true); setError("");
    const sb = createClient();
    const now = new Date().toISOString();
    const t = title.trim();
    let res: { error: unknown };

    if (kind === "show") {
      const today = now.slice(0, 10);
      const status = a.end && a.end < today ? "past" : a.start && a.start <= today ? "current" : "upcoming";
      res = await sb.from("exhibitions").insert({
        user_id: me.id, title: t, description, event_type: a.showType, start_date: a.start || null, end_date: a.end || null,
        venue: where, location_name: where, lat: a.online ? null : a.lat, lng: a.online ? null : a.lng,
        is_online: a.online, online_url: a.online ? a.link.trim() || null : null,
        cover_image: a.images[0] || null, is_public: true, status, updated_at: now,
      });
    } else if (kind === "place" || kind === "walls" || kind === "buying") {
      const requestType = kind === "walls" ? "walls" : kind === "buying" ? "buying" : a.terms === "loan" ? "lend" : "showcase";
      res = await sb.from("pool_requests").insert({
        user_id: me.id, title: t, description, request_type: requestType,
        poster_type: venue ? "venue" : "artist", poster_role: venue ? "venue" : "artist",
        location: where, location_name: where, lat: a.lat, lng: a.lng, deadline: null,
        cover_image: images[0] || null, images, details, status: "open", updated_at: now,
      });
    } else {
      const postType = kind === "opencall" ? "opencall" : kind;
      res = await sb.from("scene_posts").insert({
        user_id: me.id, post_type: postType, title: t, description, location: where, is_online: a.online,
        start_date: null, end_date: null, deadline: kind === "opencall" ? a.applyBy || null : null,
        cover_image: a.images[0] || null, images: a.images,
        price_from: kind === "commission" ? a.priceFrom.trim() || null : null,
        num_artists: kind === "opencall" && a.howMany ? parseInt(a.howMany, 10) || null : null,
        submission_link: a.applyLink.trim() || a.link.trim() || null,
        is_public: true, status: "active", from_calendar: false, updated_at: now,
      });
    }

    setSaving(false);
    if (res.error) { setError("That didn't post. Please try again."); return; }
    onPosted();
    onClose();
    // Say who sees it, and celebrate a venue's first walls.
    let shown = false;
    if (kind === "walls") {
      const { count } = await sb.from("pool_requests").select("id", { count: "exact", head: true }).eq("user_id", me.id).eq("request_type", "walls");
      shown = await celebrate("first_post", {
        title: "Your walls are posted",
        body: `${whoSees} We'll tell you the moment one does.`,
        primary: { label: "Browse works now", href: "/dashboard/looking" },
      }, (count ?? 1) <= 1);
    }
    if (!shown) toast({ title: "Posted", body: whoSees });
  }

  // ── Screens ──
  const choices = venue ? VENUE_CHOICES : ARTIST_CHOICES;
  const def = kind ? (venue ? VENUE_CHOICES : ARTIST_CHOICES).find(c => c.key === kind) || [...ARTIST_CHOICES, ...VENUE_CHOICES].find(c => c.key === kind) : null;

  let q = ""; let hint = ""; let body: React.ReactNode = null;
  const photoPicker = (label: string) => (
    <div className="flex flex-wrap gap-2">
      {a.images.map(src => (
        <div key={src} className="relative h-24 w-24 overflow-hidden rounded-control border-hair border-line bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-full w-full object-cover" />
          <button type="button" aria-label="Remove photo" onClick={() => set("images", a.images.filter(s => s !== src))}
            className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-pill border-outline border-ink bg-surface hover:bg-sunken">
            <X size={12} aria-hidden />
          </button>
        </div>
      ))}
      {a.images.length < 6 && (
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className={cn("flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-control border-hair border-dashed border-line-strong font-ui text-caption text-fg-3 hover:border-ink hover:text-fg", uploading && "opacity-60")}>
          <ImagePlus size={20} aria-hidden /> {uploading ? "Uploading" : label}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => upload(e.target.files)} />
    </div>
  );
  const chips = (list: string[], value: string, onPick: (v: string) => void) => (
    <div className="flex flex-wrap gap-2">{list.map(v => <Chip key={v} selected={value === v} onClick={() => onPick(v)}>{v}</Chip>)}</div>
  );
  const placeField = (
    <div className="flex flex-col gap-3">
      {kind !== "walls" && kind !== "place" && (
        <div className="flex items-center justify-between gap-4">
          <span className="font-ui text-body-sm font-semibold text-fg">It happens online</span>
          <Switch checked={a.online} onChange={v => set("online", v)} label="It happens online" />
        </div>
      )}
      {a.online ? (
        <Input value={a.link} type="url" placeholder="Link, e.g. https://…" onChange={e => set("link", e.target.value)} aria-label="Online link" />
      ) : (
        <PlacesAutocomplete value={a.where} placeholder={kind === "place" ? "Your city or area" : "Venue, address or city"}
          onChange={(r, raw) => setA(p => ({ ...p, where: r?.name || raw, lat: r?.lat ?? null, lng: r?.lng ?? null }))} />
      )}
    </div>
  );

  switch (step) {
    case "showType": q = "What kind of event is it?"; body = chips(SHOW_TYPES.map(s => s.label), SHOW_TYPES.find(s => s.key === a.showType)?.label || "", v => set("showType", SHOW_TYPES.find(s => s.label === v)!.key)); break;
    case "title": q = "What's it called?"; hint = "The name people will see."; body = <Input autoFocus value={a.title} maxLength={120} onChange={e => setA(p => ({ ...p, title: e.target.value, titleTouched: true }))} placeholder="Paper and light, a group show" aria-label="Name" className="h-12 text-body" />; break;
    case "when": q = "When is it?"; hint = "Leave the end empty if it's one day.";
      body = (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5"><span className="font-ui text-label font-semibold text-fg">Starts</span><Input type="date" value={a.start} onChange={e => set("start", e.target.value)} className="h-12" /></label>
          <label className="flex flex-col gap-1.5"><span className="font-ui text-label font-semibold text-fg">Ends</span><Input type="date" value={a.end} min={a.start || undefined} onChange={e => set("end", e.target.value)} className="h-12" /></label>
        </div>
      ); break;
    case "where": q = kind === "place" ? "Where would you like to show?" : kind === "walls" ? "Where are the walls?" : "Where is it?";
      hint = kind === "place" ? "Venues nearby will see your post." : kind === "walls" ? "We filled in your address. Change it if the walls are somewhere else." : "";
      body = placeField; break;
    case "image": q = kind === "commission" ? "Show a few examples" : "Add a photo"; hint = kind === "commission" ? "Past commissions or works in the same style." : "A poster, the space or a work. It's the first thing people see.";
      body = photoPicker("Add"); break;
    case "note": q = kind === "place" ? "Anything venues should know?" : kind === "walls" ? "Anything artists should know?" : "Anything else to say?";
      hint = kind === "walls" ? "The feel of the place, the light, what kind of art fits." : kind === "place" ? "How you'd like to hang, what you can bring, when you're free." : "A few words are plenty.";
      body = <Textarea autoFocus rows={4} value={a.note} onChange={e => set("note", e.target.value)} aria-label="Note" />; break;
    case "works": q = "Which works would you like to show?"; hint = "Pick up to 6. Venues see these with your post.";
      body = sortedWorks.length === 0 ? (
        <p className="font-ui text-body-sm text-fg-2">Add a work with a photo first, then come back. <a href="/dashboard/artworks/new" className="font-semibold text-fg underline underline-offset-2">Add a work</a></p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {sortedWorks.map(w => {
            const on = a.works.includes(w.id);
            return (
              <li key={w.id}>
                <button type="button" aria-pressed={on} disabled={!on && a.works.length >= 6}
                  onClick={() => set("works", on ? a.works.filter(x => x !== w.id) : [...a.works, w.id])}
                  className={cn("relative block w-full overflow-hidden rounded-control border-hair bg-surface text-left transition disabled:opacity-40", on ? "border-ink shadow-hard-1" : "border-line hover:border-ink")}>
                  <span className="relative block aspect-square bg-sunken">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={w.images![0]} alt="" className="absolute inset-0 h-full w-full object-contain p-1.5" />
                  </span>
                  <span className="block truncate px-2 py-1.5 font-ui text-caption font-semibold text-fg">{w.title}</span>
                  {on && <span aria-hidden className="absolute right-1.5 top-1.5 h-5 w-5 rounded-pill border-outline border-ink bg-mango" />}
                </button>
              </li>
            );
          })}
        </ul>
      ); break;
    case "terms": q = "Would you sell them or lend them?"; hint = "We used what you set on your works. Change it here if you like.";
      body = (
        <div className="flex flex-col gap-2">
          {([["either", "Either is fine"], ["sale", "Sell them through the venue"], ["loan", "Lend them, not for sale"]] as [WallTerms, string][]).map(([k, l]) => (
            <Option key={k} label={l} on={a.terms === k} onPick={() => set("terms", k)} />
          ))}
        </div>
      ); break;
    case "partner": q = "Who are you looking for?"; body = <>{chips(PARTNERS, a.partner, v => set("partner", v))}<Input value={PARTNERS.includes(a.partner) ? "" : a.partner} onChange={e => set("partner", e.target.value)} placeholder="Or write it, e.g. A ceramicist" aria-label="Who" /></>; break;
    case "idea": q = "What's the idea?"; hint = "A sentence or two is enough to start a conversation.";
      body = <Textarea autoFocus rows={4} value={a.idea} onChange={e => set("idea", e.target.value)} placeholder="I paint water and evening light and want to try a small edition of prints." aria-label="Idea" />; break;
    case "makes": q = "What do you make on commission?"; body = <Input autoFocus value={a.makes} maxLength={80} onChange={e => set("makes", e.target.value)} placeholder="Pet portraits in oil" aria-label="What you make" className="h-12 text-body" />; break;
    case "priceFrom": q = "From what price?"; hint = "Helps people know if it fits their budget.";
      body = <Input autoFocus value={a.priceFrom} maxLength={30} onChange={e => set("priceFrom", e.target.value)} placeholder="€300" aria-label="Price from" className="h-12 max-w-[220px] text-body" />; break;
    case "space": q = "Show artists the space"; hint = "A photo of the walls helps artists picture their work there."; body = photoPicker("Add photo"); break;
    case "wall": q = "How much wall space is there?"; hint = "Roughly is fine.";
      body = <Input autoFocus value={a.wall} maxLength={80} onChange={e => set("wall", e.target.value)} placeholder="Two walls, about 4 × 2 m" aria-label="Wall space" className="h-12 text-body" />; break;
    case "duration": q = "For how long?"; body = <>{chips(DURATIONS, a.duration, v => set("duration", v))}<Input value={DURATIONS.includes(a.duration) ? "" : a.duration} onChange={e => set("duration", e.target.value)} placeholder="Or write it, e.g. March to May" aria-label="How long" /></>; break;
    case "selling": q = "Can guests buy the work?";
      body = (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Option label="Yes, guests can buy it" on={a.sells} onPick={() => set("sells", true)} />
            <Option label="No, it's for display only" on={!a.sells} onPick={() => set("sells", false)} />
          </div>
          {a.sells && (
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-label font-semibold text-fg">Your commission <span className="font-normal text-fg-3">(optional, leave empty if none)</span></span>
              <span className="relative max-w-[160px]">
                <Input inputMode="decimal" value={a.commission} onChange={e => set("commission", e.target.value.replace(/[^\d.]/g, ""))} placeholder="15" className="h-12 pr-8 text-body" />
                <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-ui text-body-sm text-fg-3">%</span>
              </span>
            </label>
          )}
        </div>
      ); break;
    case "callFor": q = "What is the open call for?"; body = <>{chips(CALL_FOR, a.callFor, v => set("callFor", v))}<Input value={CALL_FOR.includes(a.callFor) ? "" : a.callFor} onChange={e => set("callFor", e.target.value)} placeholder="Or write it" aria-label="For" /></>; break;
    case "applyBy": q = "Apply by when?"; hint = "After this date it leaves the feed."; body = <Input type="date" value={a.applyBy} onChange={e => set("applyBy", e.target.value)} className="h-12 max-w-[240px]" aria-label="Apply by" />; break;
    case "howMany": q = "How many artists?"; body = <Input inputMode="numeric" value={a.howMany} onChange={e => set("howMany", e.target.value.replace(/\D/g, ""))} placeholder="12" className="h-12 max-w-[160px] text-body" aria-label="How many artists" />; break;
    case "howApply": q = "How should artists apply?";
      body = (
        <div className="flex flex-col gap-3">
          <Option label="By messaging us on Artomango" on={!a.applyLink} onPick={() => set("applyLink", "")} />
          <Input type="url" value={a.applyLink} onChange={e => set("applyLink", e.target.value)} placeholder="Or paste a link to your form" aria-label="Application link" />
        </div>
      ); break;
    case "buyWhat": q = "What kind of art?"; body = <>{chips(BUY_WHAT, a.buyWhat, v => set("buyWhat", v))}<Input value={BUY_WHAT.includes(a.buyWhat) ? "" : a.buyWhat} onChange={e => set("buyWhat", e.target.value)} placeholder="Or write it, e.g. Large abstract paintings" aria-label="What kind" /></>; break;
    case "budget": q = "What's your budget?"; hint = "A rough range helps artists offer the right works.";
      body = <Input value={a.budget} maxLength={40} onChange={e => set("budget", e.target.value)} placeholder="€500 to €2,000" className="h-12 max-w-[260px] text-body" aria-label="Budget" />; break;
    case "preview": q = "Here's your post"; hint = whoSees;
      body = (
        <div className="flex flex-col gap-4">
          {kind !== "show" && (
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-label font-semibold text-fg">Title <span className="font-normal text-fg-3">(we wrote it for you, change it if you like)</span></span>
              <Input value={title} maxLength={120} onChange={e => setA(p => ({ ...p, title: e.target.value, titleTouched: true }))} />
            </label>
          )}
          {kind === "walls" && wallTermsLine(details as never) && <p className="font-ui text-body-sm text-fg-3">Shown with the post: {wallTermsLine(details as never)}</p>}
          {previewItem && <div className="pointer-events-none mx-auto w-full max-w-[340px] [&_article]:mb-0"><SceneCard item={previewItem} mine={false} onOpen={() => {}} /></div>}
        </div>
      ); break;
  }

  const isLast = step === "preview";
  const optional = step && OPTIONAL.includes(step);
  const footer = kind ? (
    <>
      <Button variant="ghost" className="mr-auto" onClick={back} disabled={!!start && at === 0}><ArrowLeft size={15} aria-hidden /> Back</Button>
      {optional && !isLast && <Button variant="ghost" onClick={next}>Skip</Button>}
      <Button variant="primary" disabled={!canNext() || saving || uploading} onClick={isLast ? post : next}>
        {isLast ? (saving ? "Posting…" : "Post") : <>Continue <ArrowRight size={15} aria-hidden /></>}
      </Button>
    </>
  ) : undefined;

  return (
    <Modal open={open} onClose={onClose} size="md"
      title={kind ? def?.title || "New post" : "What do you want to share?"}
      description={!kind ? "Pick one. Each takes about a minute." : undefined}
      footer={footer}>
      {!kind ? (
        <div className="flex flex-col gap-2">
          {choices.map(c => (
            <button key={c.key} type="button" onClick={() => { setKind(c.key); setAt(0); }}
              className="flex items-start gap-3 rounded-card border-hair border-line bg-surface p-4 text-left transition hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none">
              <span aria-hidden className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-pill border-outline border-ink", (c.key === "walls" || c.key === "place") ? "bg-mango text-on-mango" : "bg-surface text-fg")}>
                <c.icon size={18} />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-ui text-body font-semibold text-fg">{c.title}</span>
                <span className="font-ui text-body-sm text-fg-3">{c.desc}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={e => { e.preventDefault(); if (canNext()) (isLast ? post() : next()); }}>
          <div className="flex gap-1" aria-hidden>
            {steps.map((_, i) => <span key={i} className={cn("h-1 flex-1 rounded-pill", i < at ? "bg-ink" : i === at ? "bg-mango" : "bg-line")} />)}
          </div>
          {error && <Alert tone="bad">{error}</Alert>}
          <div className="flex flex-col gap-1.5">
            <h2 className="font-display text-h2 leading-tight text-fg">{q}</h2>
            {hint && <p className="font-ui text-body-sm text-fg-2">{hint}</p>}
          </div>
          <div key={step} className="flex flex-col gap-3">{body}</div>
          <button type="submit" hidden aria-hidden tabIndex={-1} />
        </form>
      )}
    </Modal>
  );
}

function Option({ label, on, onPick }: { label: string; on: boolean; onPick: () => void }) {
  return (
    <button type="button" onClick={onPick} aria-pressed={on}
      className={cn("flex h-12 items-center justify-between rounded-card border-hair px-4 text-left font-ui text-body font-semibold transition",
        on ? "border-ink bg-mango-soft text-fg shadow-hard-1" : "border-line bg-surface text-fg hover:border-ink")}>
      {label}
      <span aria-hidden className={cn("h-4 w-4 rounded-pill border-outline", on ? "border-ink bg-ink" : "border-line-strong")} />
    </button>
  );
}
