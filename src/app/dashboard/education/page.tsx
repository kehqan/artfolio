"use client";
// Learn: videos, articles and tips that artists share with each other.
import { useEffect, useState } from "react";
import { ExternalLink, FileText, MessageSquare, Play, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  Alert, Avatar, Badge, Button, Chip, EmptyState, Field, Input, Menu, Modal, PageHeader, SearchField, Skeleton, Textarea, cn,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui";

type ResourceType = "video" | "article" | "post";
type Resource = {
  id: string; type: ResourceType; title: string; url?: string; description?: string; thumbnail_url?: string;
  created_at: string; user_id?: string; poster_name?: string | null; poster_avatar?: string | null;
};

const TYPES: Record<ResourceType, { label: string; plural: string; tone: BadgeTone; icon: typeof Play }> = {
  video: { label: "Video", plural: "Videos", tone: "bad", icon: Play },
  article: { label: "Article", plural: "Articles", tone: "info", icon: FileText },
  post: { label: "Tip", plural: "Tips", tone: "violet", icon: MessageSquare },
};

function ytId(url?: string) {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&?\s/]+)/);
  return m ? m[1] : null;
}

const EMPTY_FORM = { type: "video" as ResourceType, title: "", url: "", description: "" };

export default function LearnPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | ResourceType>("all");
  const [sharing, setSharing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [removing, setRemoving] = useState<Resource | null>(null);

  async function load() {
    const sb = createClient();
    const { data, error: err } = await sb.from("education_resources")
      .select("id,type,title,url,description,thumbnail_url,created_at,user_id")
      .order("created_at", { ascending: false });
    if (err) setError("These didn't load. Please refresh the page.");
    const rows = (data || []) as Resource[];
    const ids = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean))) as string[];
    const people: Record<string, { full_name?: string; avatar_url?: string }> = {};
    if (ids.length) {
      const { data: profs } = await sb.from("profiles").select("id,full_name,avatar_url").in("id", ids);
      (profs || []).forEach((p: any) => { people[p.id] = p; });
    }
    setResources(rows.map(r => ({ ...r, poster_name: people[r.user_id || ""]?.full_name || null, poster_avatar: people[r.user_id || ""]?.avatar_url || null })));
    setLoading(false);
  }

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => setUserId(user?.id || null));
    load();
  }, []);

  function openShare() { setForm(EMPTY_FORM); setFormError(""); setSharing(true); }

  async function share() {
    if (!form.title.trim()) { setFormError("Give it a title."); return; }
    if (form.type !== "post" && !form.url.trim()) { setFormError(form.type === "video" ? "Add the video link." : "Add the link to the article."); return; }
    setSaving(true); setFormError("");
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    const { error: err } = user
      ? await sb.from("education_resources").insert({
          type: form.type, title: form.title.trim(), url: form.url.trim() || null, description: form.description.trim() || null, user_id: user.id,
        })
      : { error: new Error("signed out") };
    setSaving(false);
    if (err) { setFormError("That didn't share. Please try again."); return; }
    setSharing(false);
    load();
  }

  async function remove() {
    if (!removing) return;
    const { error: err } = await createClient().from("education_resources").delete().eq("id", removing.id);
    if (err) { setError("That didn't remove. Please try again."); setRemoving(null); return; }
    setResources(p => p.filter(r => r.id !== removing.id));
    setRemoving(null);
  }

  const q = search.toLowerCase().trim();
  const list = resources
    .filter(r => type === "all" || r.type === type)
    .filter(r => !q || [r.title, r.description, r.poster_name].some(v => (v || "").toLowerCase().includes(q)));
  const count = (t: ResourceType) => resources.filter(r => r.type === t).length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Learn"
        description="Videos, articles and tips other artists found useful: pricing, shows, contracts, technique. Share what helped you."
        actions={<Button variant="primary" onClick={openShare}><Plus size={16} aria-hidden /> Share something</Button>}
      />

      {error && <Alert tone="bad">{error}</Alert>}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Show">
          <Chip selected={type === "all"} onClick={() => setType("all")} className="shrink-0">All</Chip>
          {(Object.keys(TYPES) as ResourceType[]).filter(t => count(t) > 0 || type === t).map(t => (
            <Chip key={t} selected={type === t} onClick={() => setType(t)} className="shrink-0">
              {TYPES[t].plural}<span className="tabular-nums opacity-70"> {count(t)}</span>
            </Chip>
          ))}
        </div>
        <SearchField value={search} onChange={setSearch} placeholder="Search titles and people" className="lg:w-80" />
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-72 rounded-card" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          title={resources.length === 0 ? "Nothing shared yet" : "Nothing here"}
          description={resources.length === 0
            ? "Found a talk on pricing, a guide to gallery contracts or a technique video that helped? Share it so other artists can find it too."
            : "Try another filter or search."}
          action={resources.length === 0 ? <Button variant="secondary" onClick={openShare}><Plus size={15} aria-hidden /> Share the first one</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(r => <ResourceCard key={r.id} r={r} mine={!!userId && r.user_id === userId} onRemove={() => setRemoving(r)} />)}
        </ul>
      )}

      <Modal open={sharing} onClose={() => setSharing(false)} size="md" title="Share something useful"
        footer={<>
          <Button variant="secondary" onClick={() => setSharing(false)}>Cancel</Button>
          <Button variant="primary" onClick={share} disabled={saving}>{saving ? "Sharing…" : "Share"}</Button>
        </>}>
        <div className="flex flex-col gap-4">
          {formError && <Alert tone="bad">{formError}</Alert>}
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-label font-semibold text-fg">What is it?</span>
            <div className="flex gap-2" role="group" aria-label="Type">
              {(Object.keys(TYPES) as ResourceType[]).map(t => {
                const Icon = TYPES[t].icon;
                return <Chip key={t} selected={form.type === t} onClick={() => setForm(f => ({ ...f, type: t }))}><Icon size={14} aria-hidden /> {TYPES[t].label}</Chip>;
              })}
            </div>
          </div>
          <Field label="Title">
            {p => <Input {...p} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={form.type === "video" ? "How to price your first paintings" : form.type === "article" ? "What galleries look for" : "Varnish small works before you photograph them"} />}
          </Field>
          <Field label={form.type === "video" ? "Video link" : "Link"} hint={form.type === "video" ? "YouTube links show a preview." : form.type === "post" ? "Optional" : undefined}>
            {p => <Input {...p} type="url" inputMode="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://" />}
          </Field>
          <Field label="Why it's worth it" hint="Optional">
            {p => <Textarea {...p} rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />}
          </Field>
        </div>
      </Modal>

      <Modal open={!!removing} onClose={() => setRemoving(null)} size="sm" title="Remove this?"
        footer={<>
          <Button variant="ghost" onClick={() => setRemoving(null)}>Keep it</Button>
          <Button variant="danger" onClick={remove}>Remove</Button>
        </>}>
        <p className="font-ui text-body text-fg-2">&ldquo;{removing?.title}&rdquo; will disappear from Learn for everyone.</p>
      </Modal>
    </div>
  );
}

function ResourceCard({ r, mine, onRemove }: { r: Resource; mine: boolean; onRemove: () => void }) {
  const t = TYPES[r.type] || TYPES.article;
  const Icon = t.icon;
  const yt = r.type === "video" ? ytId(r.url) : null;
  const [broken, setBroken] = useState(false);
  const thumb = broken ? null : yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : r.thumbnail_url || null;
  let host = "";
  try { host = r.url ? new URL(r.url).hostname.replace(/^www\./, "") : ""; } catch { /* not a url */ }

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-card border-outline border-ink bg-surface shadow-hard-1 transition-[transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:shadow-hard-2">
      <div className="relative aspect-video bg-sunken">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-fg-3"><Icon size={28} aria-hidden /></div>
        )}
        {r.type === "video" && thumb && (
          <span aria-hidden className="absolute inset-0 grid place-items-center">
            <span className="grid h-12 w-12 place-items-center rounded-full border-outline border-ink bg-mango text-on-mango shadow-hard-1">
              <Play size={18} className="translate-x-px fill-current" />
            </span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex h-8 items-center justify-between gap-2">
          <Badge tone={t.tone}>{t.label}</Badge>
          {mine && (
            <div className="relative z-10">
              <Menu label={`Options for ${r.title}`} items={[{ label: "Remove", icon: Trash2, danger: true, onSelect: onRemove }]} />
            </div>
          )}
        </div>
        <h3 className="font-ui text-body font-semibold leading-snug text-fg">
          {r.url ? (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="after:absolute after:inset-0 focus-visible:outline-none">
              {r.title}
            </a>
          ) : r.title}
        </h3>
        {r.description && <p className="line-clamp-3 font-ui text-body-sm text-fg-2">{r.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 border-t-hair border-line pt-3">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={r.poster_name || "Artist"} src={r.poster_avatar} size="sm" />
            <span className="truncate font-ui text-caption text-fg-3">{r.poster_name || "An artist"}</span>
          </span>
          {host && (
            <span className={cn("inline-flex shrink-0 items-center gap-1 font-ui text-caption font-semibold text-fg-2 group-hover:text-fg")}>
              {host} <ExternalLink size={12} aria-hidden />
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
