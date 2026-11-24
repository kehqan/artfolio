"use client";
// The Scene: one feed for everything happening around you. Shows and
// events, open calls, collabs and "looking for" posts from artists and
// venues, with four filters, one Post button and a map view.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MessageModal from "@/components/MessageModal";
import { Button, Chip, EmptyState, PageHeader, SearchField, Skeleton, Tabs } from "@/components/ui";
import { type FeedItem, type Filter, FILTERS, deleteItem, isLive, isPast, loadFeed } from "./feed";
import { SceneCard } from "./SceneCard";
import { SceneDetail } from "./SceneDetail";
import { Composer } from "./Composer";
import { SceneMap, type Venue } from "./SceneMap";

type View = "feed" | "map";
type Pick = { id: string; tag_label?: string; title: string; body?: string; linked_post_id?: string };

const EMPTY_COPY: Record<Filter, { title: string; description: string }> = {
  all: { title: "The scene is quiet", description: "Be the first to post a show, an open call or a collab." },
  show: { title: "No shows or events right now", description: "Got an opening or a workshop coming up? Post it." },
  opportunity: { title: "No open opportunities", description: "Open calls, residencies and venues looking for artists land here." },
  collab: { title: "No collabs yet", description: "Looking for someone to work with? Say so." },
  yours: { title: "You haven't posted yet", description: "Your shows, calls and collabs appear here, including ended ones." },
};

export default function ScenePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<View>("feed");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState<FeedItem | null>(null);
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<FeedItem | null>(null);
  const [messaging, setMessaging] = useState<FeedItem | null>(null);

  // Old links (/dashboard/exhibitions, /pool, /map) land here with a hint.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const f = q.get("show") as Filter | null;
    if (f && FILTERS.some(x => x.key === f)) setFilter(f);
    if (q.get("view") === "map") setView("map");
    if (q.get("post") === "1") setComposing(true);
  }, []);

  const reload = useCallback(async (me: string) => {
    const sb = createClient();
    try {
      setItems(await loadFeed(sb, me));
      setError("");
    } catch {
      setError("The feed didn't load. Please refresh the page.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      reload(user.id);
      const [{ data: prof }, { data: ve }, { data: pk }] = await Promise.all([
        sb.from("profiles").select("role").eq("id", user.id).single(),
        sb.from("venues").select("id, name, type, city, address, website, lat, lng").not("lat", "is", null),
        sb.from("editor_picks").select("id, tag_label, title, body, linked_post_id").eq("is_active", true).order("sort_order", { ascending: true }).limit(3),
      ]);
      setRole(prof?.role || null);
      setVenues(((ve || []) as Venue[]).filter(v => v.lat != null && v.lng != null));
      setPicks((pk || []) as Pick[]);
    });
  }, [reload]);

  const q = search.toLowerCase().trim();
  const visible = useMemo(() => items.filter(i => {
    const mine = i.userId === userId;
    if (filter === "yours") { if (!mine) return false; }
    else {
      if (!isLive(i) || isPast(i)) return false;
      if (filter !== "all" && i.kind !== filter) return false;
    }
    if (onlineOnly && !i.online) return false;
    if (q && ![i.title, i.where, i.description, i.typeLabel, i.poster?.full_name].some(v => (v || "").toLowerCase().includes(q))) return false;
    return true;
  }), [items, filter, onlineOnly, q, userId]);

  const yoursCount = items.filter(i => i.userId === userId).length;

  async function remove(i: FeedItem) {
    const { error: err } = await deleteItem(createClient(), i);
    if (err) { setError("That didn't delete. Please try again."); return; }
    setItems(prev => prev.filter(x => x.key !== i.key));
  }

  const openPick = (p: Pick) => {
    const hit = p.linked_post_id && items.find(i => i.id === p.linked_post_id);
    if (hit) setOpen(hit);
  };

  const copy = EMPTY_COPY[filter];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="The Scene"
        description="Shows, open calls and collabs from artists and venues, all in one place."
        actions={<Button variant="primary" onClick={() => { setEditing(null); setComposing(true); }}><Plus size={16} aria-hidden /> Post</Button>}
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SearchField value={search} onChange={setSearch} placeholder="Search titles, places, people" className="lg:w-80" />
          <Tabs<View> label="View" value={view} onChange={setView} items={[{ value: "feed", label: "Feed" }, { value: "map", label: "Map" }]} className="self-start lg:self-auto" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Show">
          {FILTERS.map(f => (
            <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)} className="shrink-0">
              {f.label}{f.key === "yours" && yoursCount > 0 && <span className="tabular-nums opacity-70"> {yoursCount}</span>}
            </Chip>
          ))}
          <span aria-hidden className="mx-1 hidden w-px self-stretch bg-line sm:block" />
          <Chip selected={onlineOnly} onClick={() => setOnlineOnly(v => !v)} aria-pressed={onlineOnly} className="shrink-0">Online only</Chip>
        </div>
      </div>

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      {view === "feed" && filter === "all" && !q && picks.length > 0 && (
        <section aria-label="From Artomango" className="grid gap-3 md:grid-cols-3">
          {picks.map(p => {
            const linked = !!p.linked_post_id && items.some(i => i.id === p.linked_post_id);
            const body = (
              <>
                <span className="font-ui text-caption font-semibold uppercase tracking-wide text-fg-3">{p.tag_label || "From Artomango"}</span>
                <span className="font-display text-h3 leading-tight text-fg">{p.title}</span>
                {p.body && <span className="line-clamp-2 font-ui text-body-sm text-fg-2">{p.body}</span>}
              </>
            );
            return linked ? (
              <button key={p.id} type="button" onClick={() => openPick(p)}
                className="flex flex-col gap-1.5 rounded-card border-hair border-line bg-mango-soft p-4 text-left transition hover:border-ink hover:shadow-hard-2">
                {body}
              </button>
            ) : (
              <div key={p.id} className="flex flex-col gap-1.5 rounded-card border-hair border-line bg-mango-soft p-4">{body}</div>
            );
          })}
        </section>
      )}

      {loading ? (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {["h-64", "h-44", "h-80", "h-48", "h-72", "h-40"].map((h, i) => <Skeleton key={i} className={`mb-4 w-full rounded-card ${h}`} />)}
        </div>
      ) : view === "map" ? (
        <SceneMap items={visible} venues={filter === "all" && !onlineOnly && !q ? venues : []} onOpen={setOpen} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={q || onlineOnly ? "Nothing matches that" : copy.title}
          description={q || onlineOnly ? "Try fewer words or switch off Online only." : copy.description}
          action={!q && !onlineOnly ? <Button variant="secondary" onClick={() => { setEditing(null); setComposing(true); }}><Plus size={15} aria-hidden /> Post</Button> : undefined}
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {visible.map(i => <SceneCard key={i.key} item={i} mine={i.userId === userId} onOpen={() => setOpen(i)} />)}
        </div>
      )}

      <SceneDetail
        item={open}
        mine={!!open && open.userId === userId}
        onClose={() => setOpen(null)}
        onMessage={setMessaging}
        onEdit={i => { setEditing(i); setComposing(true); }}
        onDelete={remove}
      />

      {userId && (
        <Composer
          open={composing}
          editing={editing}
          userId={userId}
          role={role}
          onClose={() => { setComposing(false); setEditing(null); }}
          onSaved={() => reload(userId)}
        />
      )}

      {messaging?.poster && (
        <MessageModal
          isOpen
          onClose={() => setMessaging(null)}
          recipientId={messaging.userId}
          recipientName={messaging.poster.full_name || "Member"}
          recipientAvatar={messaging.poster.avatar_url}
          recipientRole={messaging.poster.role}
          contextType="collab"
          contextTitle={messaging.title}
          contextId={messaging.id}
          contextMeta={{ label: messaging.typeLabel, image: messaging.images[0], subtitle: messaging.where || undefined }}
        />
      )}
    </div>
  );
}
