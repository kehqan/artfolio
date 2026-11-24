"use client";
// "Your site": pick the look of your public page from a few presets and
// see it live. Changes show in the preview right away and go public when
// you save.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, ExternalLink, ImagePlus, Monitor, Plus, Smartphone, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, ButtonLink, Card, EmptyState, Field, Input, PageHeader, Skeleton, Switch, Textarea, cn } from "@/components/ui";
import {
  ACCENTS, GRIDS, HEADERS, SECTION_HINT, SECTION_LABEL, TYPES,
  type GridKey, type HeaderKey, type PreviewMessage, type SiteConfig, type SiteSettings, type TypeKey,
  isVenueRole, siteOf,
} from "@/lib/site";

type Extra = { store_name: string; tagline: string; banner_url: string };

// ── Small preset tiles ──────────────────────────────────────────────
function Tile({ on, onClick, label, hint, children }: { on: boolean; onClick: () => void; label: string; hint: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cn("flex flex-col gap-2 rounded-card border-hair bg-surface p-2.5 text-left transition", on ? "border-ink shadow-hard-1" : "border-line hover:border-ink")}>
      <span className="relative block h-16 overflow-hidden rounded-control bg-sunken">{children}
        {on && <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango"><Check size={11} strokeWidth={3} aria-hidden /></span>}
      </span>
      <span className="flex flex-col">
        <span className="font-ui text-label font-semibold text-fg">{label}</span>
        <span className="font-ui text-caption leading-snug text-fg-3">{hint}</span>
      </span>
    </button>
  );
}

const bar = (w: string, extra = "") => <span className={cn("block h-1.5 rounded-pill bg-[rgba(20,20,20,0.72)]", w, extra)} />;

function HeaderSketch({ k }: { k: HeaderKey }) {
  if (k === "statement") return <span className="absolute inset-0 flex flex-col justify-end gap-1 bg-[var(--a)] p-2"><span className="block h-1.5 w-2/3 rounded-pill bg-white" /><span className="block h-1.5 w-1/3 rounded-pill bg-white/70" /></span>;
  if (k === "split") return <span className="absolute inset-0 grid grid-cols-2 items-center gap-2 p-2"><span className="flex flex-col gap-1">{bar("w-full")}{bar("w-2/3", "opacity-50")}</span><span className="h-full rounded bg-[var(--a)]" /></span>;
  return <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">{bar("w-2/3")}<span className="block h-1 w-4 rounded-pill bg-[var(--a)]" />{bar("w-1/3", "opacity-50")}</span>;
}

function GridSketch({ k }: { k: GridKey }) {
  if (k === "salon") return <span className="absolute inset-0 flex gap-1 p-2">{[["h-6", "h-4"], ["h-3", "h-7"], ["h-5", "h-5"]].map((c, i) => <span key={i} className="flex flex-1 flex-col gap-1">{c.map((h, j) => <span key={j} className={cn("block rounded-sm bg-[rgba(20,20,20,0.2)]", h)} />)}</span>)}</span>;
  if (k === "single") return <span className="absolute inset-0 flex flex-col items-center gap-1 p-2"><span className="block h-9 w-2/3 rounded-sm bg-[rgba(20,20,20,0.2)]" />{bar("w-1/4", "opacity-50")}</span>;
  return <span className="absolute inset-0 grid grid-cols-4 gap-1 p-2">{Array.from({ length: 8 }).map((_, i) => <span key={i} className="block rounded-sm bg-[rgba(20,20,20,0.2)]" />)}</span>;
}

function TypeSketch({ k }: { k: TypeKey }) {
  return (
    <span className={cn("absolute inset-0 grid place-items-center text-[30px] text-fg", k === "classic" ? "site-serif" : "font-display font-extrabold")}>Aa</span>
  );
}

// ── Page ────────────────────────────────────────────────────────────
export default function SiteEditorPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [extra, setExtra] = useState<Extra>({ store_name: "", tagline: "", banner_url: "" });
  const [snapshot, setSnapshot] = useState("");
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUid(user.id);
      const [{ data: prof }, { data: ss }] = await Promise.all([
        sb.from("profiles").select("username, role").eq("id", user.id).single(),
        sb.from("store_settings").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setUsername(prof?.username || null);
      setRole(prof?.role || null);
      const s = siteOf((ss as SiteSettings | null)?.site, prof?.role);
      const e = { store_name: ss?.store_name || "", tagline: ss?.tagline || "", banner_url: ss?.banner_url || "" };
      setSite(s); setExtra(e);
      setSnapshot(JSON.stringify({ s, e }));
    });
  }, []);

  // Send the current look to the preview.
  const push = useCallback(() => {
    if (!site) return;
    const msg: PreviewMessage = { type: "site-preview", site, settings: { store_name: extra.store_name || null, tagline: extra.tagline || null, banner_url: extra.banner_url || null } };
    frame.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, [site, extra]);
  useEffect(() => { push(); }, [push]);
  useEffect(() => {
    const on = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === "site-preview-ready") push(); };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [push]);

  // Fit the preview frame to the space it has.
  const width = device === "desktop" ? 1280 : 390;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, site === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = !!site && JSON.stringify({ s: site, e: extra }) !== snapshot;
  const set = (patch: Partial<SiteConfig>) => setSite(s => (s ? { ...s, ...patch } : s));

  async function save() {
    if (!uid || !site) return;
    setSaving(true); setNotice(null);
    const { error } = await createClient().from("store_settings").upsert({
      user_id: uid, site, store_name: extra.store_name.trim() || null, tagline: extra.tagline.trim() || null,
      banner_url: extra.banner_url || null, is_active: true, updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { setNotice({ tone: "bad", text: "That didn't save. Please try again." }); return; }
    setSnapshot(JSON.stringify({ s: site, e: extra }));
    setNotice({ tone: "ok", text: "Saved. Your site shows it now." });
    setTimeout(() => setNotice(n => (n?.tone === "ok" ? null : n)), 3000);
  }

  async function upload(file: File) {
    if (!uid) return;
    if (!file.type.startsWith("image/")) { setNotice({ tone: "bad", text: "Choose an image file (JPG, PNG or WebP)." }); return; }
    if (file.size > 10 * 1024 * 1024) { setNotice({ tone: "bad", text: "That image is over 10 MB. Try a smaller one." }); return; }
    setUploading(true); setNotice(null);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${uid}/store-banner-${Date.now()}.${ext}`;
    try {
      const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path, contentType: file.type }) });
      const { signedUrl } = await res.json();
      if (!signedUrl) throw new Error("no url");
      const put = await fetch(signedUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!put.ok) throw new Error("upload failed");
      const { data: { publicUrl } } = createClient().storage.from("artwork-images").getPublicUrl(path);
      setExtra(p => ({ ...p, banner_url: publicUrl }));
    } catch {
      setNotice({ tone: "bad", text: "The image didn't upload. Please try again." });
    }
    setUploading(false);
  }

  function moveSection(i: number, dir: -1 | 1) {
    if (!site) return;
    const j = i + dir;
    if (j < 0 || j >= site.sections.length) return;
    const arr = [...site.sections];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set({ sections: arr });
  }

  if (!site) {
    return <div className="grid gap-6 lg:grid-cols-[380px_1fr]"><Skeleton className="h-[600px] rounded-card" /><Skeleton className="h-[600px] rounded-card" /></div>;
  }

  const venue = isVenueRole(role);
  const accent = ACCENTS.find(a => a.key === site.accent)!;
  const cv = site.cv || [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Your site"
        description={venue ? "Your venue's own website: what you show, your walls and how to reach you." : "Your own website: your work, what's for sale and your story."}
        actions={<>
          {username && <ButtonLink variant="ghost" href={`/${username}`} target="_blank"><ExternalLink size={15} aria-hidden /> Open your site</ButtonLink>}
          <Button variant="primary" onClick={save} disabled={saving || !dirty}>{saving ? "Saving…" : dirty ? "Save and publish" : "Saved"}</Button>
        </>} />

      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ── Controls ── */}
        <div className="flex flex-col gap-5" style={{ ["--a" as string]: accent.color }}>
          <Card padding="lg" className="flex flex-col gap-5">
            <h2 className="font-display text-h3 text-fg">Look</h2>

            <div className="flex flex-col gap-2.5">
              <span className="font-ui text-label font-semibold text-fg">Accent colour</span>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Accent colour">
                {ACCENTS.map(a => (
                  <button key={a.key} type="button" role="radio" aria-checked={site.accent === a.key} aria-label={a.label} title={a.label}
                    onClick={() => set({ accent: a.key })}
                    className={cn("grid h-10 w-10 place-items-center rounded-pill border-hair transition", site.accent === a.key ? "border-ink ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-line hover:scale-105")}
                    style={{ background: a.color, color: a.on }}>
                    {site.accent === a.key && <Check size={16} strokeWidth={3} aria-hidden />}
                  </button>
                ))}
              </div>
              <span className="font-ui text-caption text-fg-3">{accent.label}. Used for buttons, links and highlights.</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-ui text-label font-semibold text-fg">Type</span>
              <div className="grid grid-cols-2 gap-2.5">
                {TYPES.map(t => <Tile key={t.key} on={site.type === t.key} onClick={() => set({ type: t.key })} label={t.label} hint={t.hint}><TypeSketch k={t.key} /></Tile>)}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-ui text-label font-semibold text-fg">Header</span>
              <div className="grid grid-cols-3 gap-2.5">
                {HEADERS.map(h => <Tile key={h.key} on={site.header === h.key} onClick={() => set({ header: h.key })} label={h.label} hint={h.hint}><HeaderSketch k={h.key} /></Tile>)}
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="font-ui text-label font-semibold text-fg">Grid</span>
              <div className="grid grid-cols-3 gap-2.5">
                {GRIDS.map(g => <Tile key={g.key} on={site.grid === g.key} onClick={() => set({ grid: g.key })} label={g.label} hint={g.hint}><GridSketch k={g.key} /></Tile>)}
              </div>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col gap-4">
            <h2 className="font-display text-h3 text-fg">Top of the page</h2>
            <Field label="Name on the site" hint="Leave empty to use your profile name.">
              {p => <Input {...p} value={extra.store_name} onChange={e => setExtra(x => ({ ...x, store_name: e.target.value }))} />}
            </Field>
            <Field label="One line about you" hint={venue ? "For example: A café gallery for young painters in Holešovice." : "For example: Paintings of water and evening light."}>
              {p => <Input {...p} maxLength={140} value={extra.tagline} onChange={e => setExtra(x => ({ ...x, tagline: e.target.value }))} />}
            </Field>
            <div className="flex flex-col gap-2">
              <span className="font-ui text-label font-semibold text-fg">Header image</span>
              <div className="relative aspect-[16/7] overflow-hidden rounded-control border-hair border-line bg-sunken">
                {extra.banner_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={extra.banner_url} alt="" className="h-full w-full object-cover" />
                  : <span className="grid h-full place-items-center px-4 text-center font-ui text-caption text-fg-3">No image yet. We use your first featured work.</span>}
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <ImagePlus size={14} aria-hidden /> {uploading ? "Uploading…" : extra.banner_url ? "Change" : "Add an image"}
                </Button>
                {extra.banner_url && <Button variant="ghost" size="sm" onClick={() => setExtra(x => ({ ...x, banner_url: "" }))}><X size={14} aria-hidden /> Remove</Button>}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="font-display text-h3 text-fg">Sections</h2>
              <p className="font-ui text-body-sm text-fg-3">Turn them on or off and set the order. Empty sections stay hidden.</p>
            </div>
            <ul className="flex flex-col divide-y divide-line">
              {site.sections.map((s, i) => (
                <li key={s.key} className="flex items-center gap-3 py-2.5">
                  <Switch checked={s.on} label={SECTION_LABEL[s.key]} onChange={v => set({ sections: site.sections.map(x => (x.key === s.key ? { ...x, on: v } : x)) })} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("font-ui text-body-sm font-semibold", s.on ? "text-fg" : "text-fg-3")}>{SECTION_LABEL[s.key]}</span>
                    <span className="truncate font-ui text-caption text-fg-3">{SECTION_HINT[s.key]}</span>
                  </span>
                  <span className="flex shrink-0">
                    <Button variant="ghost" size="icon" aria-label={`Move ${SECTION_LABEL[s.key]} up`} disabled={i === 0} onClick={() => moveSection(i, -1)}><ArrowUp size={14} aria-hidden /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Move ${SECTION_LABEL[s.key]} down`} disabled={i === site.sections.length - 1} onClick={() => moveSection(i, 1)}><ArrowDown size={14} aria-hidden /></Button>
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/mystore" className="font-ui text-body-sm font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Choose featured works and what&rsquo;s for sale
            </Link>
          </Card>

          {!venue && (
            <Card padding="lg" className="flex flex-col gap-4">
              <h2 className="font-display text-h3 text-fg">About</h2>
              <Field label="Artist statement" hint="One or two sentences. It shows large, in your headline type.">
                {p => <Textarea {...p} rows={3} maxLength={400} value={site.statement || ""} onChange={e => set({ statement: e.target.value })} />}
              </Field>
              <p className="font-ui text-caption text-fg-3">Your bio comes from <Link href="/dashboard/profile" className="underline underline-offset-2">your profile</Link>.</p>
              <div className="flex flex-col gap-2">
                <span className="font-ui text-label font-semibold text-fg">CV</span>
                {cv.length === 0 && <span className="font-ui text-caption text-fg-3">Shows, studies, awards and residencies. One line each.</span>}
                {cv.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input aria-label="Year" placeholder="2025" value={c.year} className="w-20 shrink-0"
                      onChange={e => set({ cv: cv.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)) })} />
                    <Input aria-label="What" placeholder="Group show, Galerie Ost, Prague" value={c.text}
                      onChange={e => set({ cv: cv.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                    <Button variant="ghost" size="icon" aria-label="Remove line" onClick={() => set({ cv: cv.filter((_, j) => j !== i) })}><Trash2 size={14} aria-hidden /></Button>
                  </div>
                ))}
                <Button variant="secondary" size="sm" className="self-start" onClick={() => set({ cv: [...cv, { year: String(new Date().getFullYear()), text: "" }] })}>
                  <Plus size={14} aria-hidden /> Add a line
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* ── Live preview ── */}
        <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-[calc(var(--shell-header)+1rem)]">
          <div className="flex items-center gap-2">
            <span className="font-ui text-label font-semibold text-fg">Preview</span>
            {dirty && <span className="font-ui text-caption text-fg-3">Not saved yet</span>}
            <div role="group" aria-label="Device" className="ml-auto flex gap-1 rounded-pill border-hair border-line bg-surface p-1">
              {([["desktop", Monitor, "Computer"], ["phone", Smartphone, "Phone"]] as const).map(([k, Icon, l]) => (
                <button key={k} type="button" aria-pressed={device === k} onClick={() => setDevice(k)}
                  className={cn("inline-flex h-8 items-center gap-1.5 rounded-pill px-3 font-ui text-label font-semibold", device === k ? "bg-inverse text-on-inverse" : "text-fg-2 hover:text-fg")}>
                  <Icon size={14} aria-hidden /> {l}
                </button>
              ))}
            </div>
          </div>
          {username ? (
            <div ref={box} className="overflow-hidden rounded-card border-outline border-ink bg-surface shadow-hard-2">
              <div className="mx-auto" style={{ width: width * scale, height: (device === "desktop" ? 800 : 780) * scale }}>
                <iframe ref={frame} title="Preview of your site" src={`/${username}?preview=1`} onLoad={push}
                  style={{ width, height: device === "desktop" ? 800 : 780, transform: `scale(${scale})`, transformOrigin: "0 0" }}
                  className="block border-0 bg-page" />
              </div>
            </div>
          ) : (
            <Card padding="lg">
              <EmptyState title="Pick a username first" description="Your site lives at artomango.com/your-name. Choose the name in your profile, then come back."
                action={<ButtonLink variant="secondary" href="/dashboard/profile">Go to your profile</ButtonLink>} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
