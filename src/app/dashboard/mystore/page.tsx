"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QrCode as QrSvg } from "@/components/labels/QrCode";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowDown, ArrowUp, Check, Copy, ExternalLink, ImagePlus, Plus, QrCode, Star, Trash2, X,
} from "lucide-react";
import {
  Alert, Badge, Button, ButtonLink, Card, EmptyState, Field, Input, Modal, PageHeader,
  Menu, SearchField, Skeleton, Switch, Tabs, cn,
} from "@/components/ui";
import { BoardModal, PROVIDER_LABEL, type Board } from "./BoardModal";
import { Mat, formatPrice } from "@/components/public/PublicChrome";
import { IMAGE_CACHE_SECONDS, prepareImage } from "@/lib/image";

/* ── Types ────────────────────────────────────────────────────── */
type StoreSettings = {
  id?: string;
  store_name: string; tagline: string; banner_url: string;
  show_bio: boolean; show_collabs: boolean; show_events: boolean; show_location: boolean;
  // Kept as stored; no longer edited here (the public page uses the single mango accent)
  accent_color: string; is_active: boolean; layout: string;
};
type Artwork = {
  id: string; title: string; status: string; images?: string[];
  price?: number; medium?: string; sale_method?: string; currency?: string;
};
type StoreArtwork = { artwork_id: string; sort_order: number; featured: boolean };
type Moodboard = Board;
type Tab = "works" | "page" | "moodboards";

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: "", tagline: "", banner_url: "",
  show_bio: true, show_collabs: true, show_events: true, show_location: true,
  accent_color: "#FFD400", is_active: false, layout: "grid",
};

function statusBadge(status?: string) {
  const s = (status || "").toLowerCase();
  if (s === "sold") return <Badge tone="inverse">Sold</Badge>;
  if (s === "reserved") return <Badge tone="warn">Reserved</Badge>;
  return null;
}

function WorkRow({ aw, children }: { aw: Artwork; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Mat src={aw.images?.[0]} alt="" className="h-14 w-14 shrink-0 rounded-control" pad="p-1" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-ui text-body font-semibold text-fg">{aw.title}</span>
        <span className="flex items-center gap-2 truncate font-ui text-body-sm text-fg-3">
          {[aw.medium, formatPrice(aw.price, aw.currency)].filter(Boolean).join(" · ")}
          {statusBadge(aw.status)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">{children}</div>
    </li>
  );
}

function IconBtn({ label, onClick, disabled, active, children }: {
  label: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-control text-fg-2 transition-colors duration-fast hover:bg-sunken hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent",
        active && "text-fg",
      )}
    >
      {children}
    </button>
  );
}

function ToggleRow({ id, label, hint, checked, onChange }: {
  id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="flex flex-col gap-0.5">
        <span id={id} className="font-ui text-body font-semibold text-fg">{label}</span>
        <span className="font-ui text-body-sm text-fg-3">{hint}</span>
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export default function MyFrontDoorPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
  const [storeArtworks, setStoreArtworks] = useState<StoreArtwork[]>([]);
  const [snapshot, setSnapshot] = useState("");
  const [moodboards, setMoodboards] = useState<Moodboard[]>([]);
  const [mbSaving, setMbSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [tab, setTab] = useState<Tab>("works");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [origin, setOrigin] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [boardModal, setBoardModal] = useState<{ board: Moodboard | null } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "works" || t === "page" || t === "moodboards") setTab(t);
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const [{ data: prof }, { data: ss }, { data: aw }, { data: sa }, { data: mb }] = await Promise.all([
      sb.from("profiles").select("username, full_name").eq("id", user.id).single(),
      sb.from("store_settings").select("*").eq("user_id", user.id).single(),
      sb.from("artworks").select("id, title, status, images, price, medium, sale_method, currency").eq("user_id", user.id).order("created_at", { ascending: false }),
      sb.from("store_artworks").select("artwork_id, sort_order, featured").eq("user_id", user.id).order("sort_order", { ascending: true }),
      sb.from("moodboards").select("id, provider, url, title, description, thumbnail_url, og_image, is_public").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    setUsername(prof?.username || null);
    const s: StoreSettings = ss ? {
      id: ss.id,
      store_name: ss.store_name || "", tagline: ss.tagline || "", banner_url: ss.banner_url || "",
      show_bio: ss.show_bio ?? true, show_collabs: ss.show_collabs ?? true,
      show_events: ss.show_events ?? true, show_location: ss.show_location ?? true,
      accent_color: ss.accent_color || "#FFD400", is_active: ss.is_active ?? false, layout: ss.layout || "grid",
    } : DEFAULT_SETTINGS;
    const store = (sa || []).map((x: StoreArtwork) => ({ ...x, featured: !!x.featured }));
    setSettings(s);
    setAllArtworks(aw || []);
    setStoreArtworks(store);
    setSnapshot(JSON.stringify({ s, store }));
    setMoodboards(mb || []);
    setLoading(false);
  }

  const dirty = !loading && JSON.stringify({ s: settings, store: storeArtworks }) !== snapshot;

  async function saveAll() {
    if (!userId) return;
    setSaving(true); setNotice(null);
    const sb = createClient();
    const { error: e1 } = await sb.from("store_settings").upsert({
      user_id: userId,
      store_name: settings.store_name || null,
      tagline: settings.tagline || null,
      banner_url: settings.banner_url || null,
      show_bio: settings.show_bio,
      show_collabs: settings.show_collabs,
      show_events: settings.show_events,
      show_location: settings.show_location,
      accent_color: settings.accent_color,
      is_active: settings.is_active,
      layout: settings.layout,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });

    let e2 = null;
    const { error: delErr } = await sb.from("store_artworks").delete().eq("user_id", userId);
    e2 = delErr;
    if (!e2 && storeArtworks.length > 0) {
      const { error } = await sb.from("store_artworks").insert(
        storeArtworks.map((x, i) => ({ user_id: userId, artwork_id: x.artwork_id, sort_order: i, featured: x.featured })),
      );
      e2 = error;
    }

    if (e1 || e2) {
      setNotice({ tone: "bad", text: "Some changes didn't save. Please try again." });
    } else {
      const store = storeArtworks.map((x, i) => ({ ...x, sort_order: i }));
      setStoreArtworks(store);
      setSnapshot(JSON.stringify({ s: settings, store }));
      setNotice({ tone: "ok", text: "Saved. Your public page shows these changes now." });
      setTimeout(() => setNotice(n => (n?.tone === "ok" ? null : n)), 3000);
    }
    setSaving(false);
  }

  function addArtwork(id: string) {
    setStoreArtworks(prev => (prev.some(x => x.artwork_id === id) ? prev : [...prev, { artwork_id: id, sort_order: prev.length, featured: false }]));
  }
  function removeArtwork(id: string) {
    setStoreArtworks(prev => prev.filter(x => x.artwork_id !== id));
  }
  function toggleFeatured(id: string) {
    setStoreArtworks(prev => prev.map(x => (x.artwork_id === id ? { ...x, featured: !x.featured } : x)));
  }
  function move(id: string, dir: -1 | 1) {
    setStoreArtworks(prev => {
      const i = prev.findIndex(x => x.artwork_id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr.map((x, k) => ({ ...x, sort_order: k }));
    });
  }

  async function uploadBanner(file: File) {
    if (!userId) return;
    setNotice(null);
    if (!file.type.startsWith("image/")) { setNotice({ tone: "bad", text: "Choose an image file (JPG, PNG or WebP)." }); return; }
    setBannerUploading(true);
    file = await prepareImage(file);
    if (file.size > 10 * 1024 * 1024) { setBannerUploading(false); setNotice({ tone: "bad", text: "That image is over 10 MB. Try a smaller one." }); return; }
    const sb = createClient();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/store-banner-${Date.now()}.${ext}`;
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, contentType: file.type }),
      });
      const { signedUrl } = await res.json();
      if (!signedUrl) throw new Error("no url");
      const put = await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type, "cache-control": `max-age=${IMAGE_CACHE_SECONDS}` } });
      if (!put.ok) throw new Error("upload failed");
      const { data: { publicUrl } } = sb.storage.from("artwork-images").getPublicUrl(path);
      setSettings(p => ({ ...p, banner_url: publicUrl }));
    } catch {
      setNotice({ tone: "bad", text: "The banner didn't upload. Please try again." });
    }
    setBannerUploading(false);
  }

  async function toggleMoodboard(board: Moodboard) {
    setMbSaving(board.id);
    const sb = createClient();
    const { error } = await sb.from("moodboards").update({ is_public: !board.is_public }).eq("id", board.id);
    if (!error) setMoodboards(p => p.map(b => (b.id === board.id ? { ...b, is_public: !b.is_public } : b)));
    else setNotice({ tone: "bad", text: "Couldn't change that board. Please try again." });
    setMbSaving(null);
  }

  async function deleteBoard(board: Moodboard) {
    const { error } = await createClient().from("moodboards").delete().eq("id", board.id);
    if (!error) setMoodboards(p => p.filter(b => b.id !== board.id));
    else setNotice({ tone: "bad", text: "Couldn't delete that board. Please try again." });
  }

  // The QR is drawn here (components/labels/QrCode), never by an outside service.
  function downloadQr() {
    const svg = document.querySelector("#page-qr svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "artomango-qr.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function copyUrl() {
    if (!pageUrl) return;
    navigator.clipboard?.writeText(pageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pageUrl = username && origin ? `${origin}/${username}` : "";
  const byId = new Map(allArtworks.map(a => [a.id, a]));
  const onPage = storeArtworks.map(x => ({ ...x, aw: byId.get(x.artwork_id) })).filter(x => x.aw) as (StoreArtwork & { aw: Artwork })[];
  const inStore = new Set(storeArtworks.map(x => x.artwork_id));
  const q = search.toLowerCase().trim();
  const available = allArtworks
    .filter(a => !inStore.has(a.id))
    .filter(a => !q || a.title.toLowerCase().includes(q) || (a.medium || "").toLowerCase().includes(q));
  const publicBoards = moodboards.filter(b => b.is_public).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-16 w-full rounded-card" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-card" />
          <Skeleton className="h-80 rounded-card" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your public page"
        description="Choose what people see when they open your page: your works, your details and your moodboards."
        actions={
          <>
            {username && (
              <ButtonLink href={`/${username}`} target="_blank" variant="secondary">
                <ExternalLink size={15} aria-hidden /> View page
              </ButtonLink>
            )}
            <Button variant="primary" onClick={saveAll} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </>
        }
      />

      {/* ── Page link ── */}
      <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {pageUrl ? (
          <>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="font-ui text-label font-semibold text-fg">Your page</span>
              <code className="truncate font-code text-body-sm text-fg-2">{pageUrl.replace(/^https?:\/\//, "")}</code>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" size="sm" onClick={copyUrl} aria-live="polite">
                {copied ? <><Check size={14} aria-hidden /> Copied</> : <><Copy size={14} aria-hidden /> Copy link</>}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowQR(true)}>
                <QrCode size={14} aria-hidden /> QR code
              </Button>
            </div>
          </>
        ) : (
          <p className="font-ui text-body-sm text-fg-2">
            You need a username before your page goes online. <Link href="/dashboard/profile" className="font-semibold text-fg underline underline-offset-4">Set one in your profile</Link>.
          </p>
        )}
      </Card>

      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <Tabs
        items={[
          { value: "works", label: "Works for sale", count: storeArtworks.length },
          { value: "page", label: "Page details" },
          { value: "moodboards", label: "Moodboards", count: publicBoards || undefined },
        ]}
        value={tab}
        onChange={setTab}
        label="Front door sections"
        className="max-w-full self-start overflow-x-auto"
      />

      {/* ── Works ── */}
      {tab === "works" && (
        allArtworks.length === 0 ? (
          <EmptyState
            title="Add a work first"
            description="Works you add in My Works can be put up for sale here."
            action={<ButtonLink href="/dashboard/artworks/new" variant="primary"><Plus size={15} aria-hidden /> Add a work</ButtonLink>}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <Card padding="none" className="overflow-hidden">
              <div className="flex items-baseline justify-between gap-3 border-b-hair border-line px-4 py-3">
                <span className="font-ui text-label font-semibold text-fg">On your page</span>
                <span className="font-ui text-caption text-fg-3">Starred works show first</span>
              </div>
              {onPage.length === 0 ? (
                <p className="px-4 py-10 text-center font-ui text-body-sm text-fg-3">Nothing for sale yet. Add works from the list.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {onPage.map((x, i) => (
                    <WorkRow key={x.artwork_id} aw={x.aw}>
                      <IconBtn label={x.featured ? "Unstar" : "Star (show first)"} active={x.featured} onClick={() => toggleFeatured(x.artwork_id)}>
                        <Star size={15} aria-hidden className={x.featured ? "fill-ink" : ""} />
                      </IconBtn>
                      <IconBtn label="Move up" disabled={i === 0} onClick={() => move(x.artwork_id, -1)}><ArrowUp size={15} aria-hidden /></IconBtn>
                      <IconBtn label="Move down" disabled={i === onPage.length - 1} onClick={() => move(x.artwork_id, 1)}><ArrowDown size={15} aria-hidden /></IconBtn>
                      <IconBtn label="Take off page" onClick={() => removeArtwork(x.artwork_id)}><X size={15} aria-hidden /></IconBtn>
                    </WorkRow>
                  ))}
                </ol>
              )}
            </Card>

            <Card padding="none" className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b-hair border-line px-4 py-3">
                <span className="font-ui text-label font-semibold text-fg">Your works</span>
                {allArtworks.length > 6 && <SearchField value={search} onChange={setSearch} placeholder="Find a work" />}
              </div>
              {available.length === 0 ? (
                <p className="px-4 py-10 text-center font-ui text-body-sm text-fg-3">
                  {q ? "No works match." : "Every work is already on your page."}
                </p>
              ) : (
                <ul className="max-h-[560px] divide-y divide-line overflow-y-auto">
                  {available.map(aw => (
                    <WorkRow key={aw.id} aw={aw}>
                      <Button variant="secondary" size="sm" onClick={() => addArtwork(aw.id)}>
                        <Plus size={14} aria-hidden /> Add
                      </Button>
                    </WorkRow>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )
      )}

      {/* ── Page details ── */}
      {tab === "page" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <Card padding="lg" className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="font-ui text-label font-semibold text-fg">Banner</span>
              <div className="relative h-36 overflow-hidden rounded-control border-hair border-line bg-sunken">
                {settings.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" decoding="async" src={settings.banner_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center font-ui text-body-sm text-fg-3">No banner. Your page starts with your name.</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => bannerInputRef.current?.click()} disabled={bannerUploading}>
                  <ImagePlus size={14} aria-hidden /> {bannerUploading ? "Uploading…" : settings.banner_url ? "Change banner" : "Add a banner"}
                </Button>
                {settings.banner_url && (
                  <Button variant="ghost" size="sm" onClick={() => setSettings(p => ({ ...p, banner_url: "" }))}>
                    <Trash2 size={14} aria-hidden /> Remove
                  </Button>
                )}
              </div>
              <span className="font-ui text-caption text-fg-3">A wide image, about 3:1. It&rsquo;s cropped to fit, so keep artwork you need whole out of it.</span>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadBanner(f); e.target.value = ""; }} />
            </div>
            <Field label="Page name" hint="Leave empty to use your own name.">
              {p => <Input {...p} value={settings.store_name} onChange={e => setSettings(s => ({ ...s, store_name: e.target.value }))} placeholder="e.g. Studio Rahimi" />}
            </Field>
            <Field label="Tagline" hint="One line under your name.">
              {p => <Input {...p} value={settings.tagline} maxLength={120} onChange={e => setSettings(s => ({ ...s, tagline: e.target.value }))} placeholder="e.g. Paintings of water and evening light" />}
            </Field>
          </Card>

          <Card padding="lg" className="flex flex-col">
            <span className="font-ui text-label font-semibold text-fg">Show on your page</span>
            <div className="divide-y divide-line">
              <ToggleRow id="t-bio" label="Bio" hint="The few lines from your profile." checked={settings.show_bio} onChange={v => setSettings(s => ({ ...s, show_bio: v }))} />
              <ToggleRow id="t-loc" label="Location" hint="Your city or address." checked={settings.show_location} onChange={v => setSettings(s => ({ ...s, show_location: v }))} />
              <ToggleRow id="t-ev" label="Shows and events" hint="Public events you've added." checked={settings.show_events} onChange={v => setSettings(s => ({ ...s, show_events: v }))} />
              <ToggleRow id="t-co" label="Collabs" hint="Collaborations you list." checked={settings.show_collabs} onChange={v => setSettings(s => ({ ...s, show_collabs: v }))} />
            </div>
          </Card>
        </div>
      )}

      {/* ── Moodboards ── */}
      {tab === "moodboards" && (
        moodboards.length === 0 ? (
          <EmptyState
            title="No moodboards yet"
            description="Link boards from Pinterest, Milanote, Figma, Miro or Notion, and choose which ones show on your page."
            action={<Button variant="secondary" onClick={() => setBoardModal({ board: null })}><Plus size={15} aria-hidden /> Add a board</Button>}
          />
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b-hair border-line px-4 py-3">
              <span className="font-ui text-body-sm text-fg-2">{publicBoards} of {moodboards.length} shown on your page. Changes save right away.</span>
              <Button variant="secondary" size="sm" onClick={() => setBoardModal({ board: null })}><Plus size={14} aria-hidden /> Add a board</Button>
            </div>
            <ul className="divide-y divide-line">
              {moodboards.map(b => {
                const thumb = b.thumbnail_url || b.og_image;
                return (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-control bg-sunken">
                      {thumb && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={thumb} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <a href={b.url} target="_blank" rel="noopener noreferrer" className="truncate font-ui text-body font-semibold text-fg underline-offset-4 hover:underline">{b.title}</a>
                      <span className="font-ui text-body-sm text-fg-3">{PROVIDER_LABEL[b.provider] || "Board"}</span>
                    </div>
                    <span className="hidden font-ui text-body-sm text-fg-3 sm:inline">{b.is_public ? "Shown" : "Hidden"}</span>
                    <Switch checked={b.is_public} disabled={mbSaving === b.id} onChange={() => toggleMoodboard(b)} label={`Show ${b.title} on your page`} />
                    <Menu
                      label={`More for ${b.title}`}
                      items={[
                        { label: "Open board", icon: ExternalLink, onSelect: () => window.open(b.url, "_blank", "noopener") },
                        { label: "Edit", onSelect: () => setBoardModal({ board: b }) },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => deleteBoard(b) },
                      ]}
                    />
                  </li>
                );
              })}
            </ul>
          </Card>
        )
      )}

      {dirty && (
        <div className="sticky bottom-4 z-dropdown flex items-center justify-between gap-3 rounded-card border-outline border-ink bg-surface px-4 py-3 shadow-hard-2">
          <span className="font-ui text-body-sm text-fg">You have unsaved changes.</span>
          <Button variant="primary" size="sm" onClick={saveAll} disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button>
        </div>
      )}

      {userId && (
        <BoardModal
          open={!!boardModal}
          board={boardModal?.board || null}
          userId={userId}
          onClose={() => setBoardModal(null)}
          onSaved={saved => setMoodboards(p => p.some(b => b.id === saved.id) ? p.map(b => (b.id === saved.id ? saved : b)) : [saved, ...p])}
        />
      )}

      <Modal
        open={showQR}
        onClose={() => setShowQR(false)}
        title="QR code for your page"
        description="Print it on labels, price cards or flyers. It opens your public page."
        footer={pageUrl ? <Button variant="secondary" onClick={downloadQr}>Download for print</Button> : undefined}
      >
        {pageUrl && (
          <div id="page-qr" className="mx-auto h-60 w-60 overflow-hidden rounded-control border-hair border-line">
            <QrSvg value={pageUrl} title={`QR code for ${pageUrl}`} margin={2} className="block h-full w-full" />
          </div>
        )}
      </Modal>
    </div>
  );
}
