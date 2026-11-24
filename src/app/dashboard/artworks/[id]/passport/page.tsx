"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft, Shield, CheckCircle2, ExternalLink, Plus, Trash2, MapPin, Calendar,
  Check, Eye, History, QrCode, Copy, Lock, Link2, ScrollText,
  PenTool, BadgeDollarSign, ArrowRightLeft, Landmark, Wrench, Scale, Gift, Repeat,
  type LucideIcon,
} from "lucide-react";
import {
  Badge, Button, Card, Chip, EmptyState, Eyebrow, Field, Heading, Input, Modal, Skeleton, Textarea,
  buttonClasses, cn,
} from "@/components/ui";

type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  images?: string[]; certificate_id?: string;
  authentication_status?: string; authenticated_by?: string;
  authentication_date?: string; authentication_notes?: string;
  user_id: string;
};

type ProvenanceEntry = {
  id: string; event_type: string; owner_name?: string;
  is_anonymous?: boolean; date?: string; location?: string;
  notes?: string; created_at: string;
};

const EVENT_TYPES: Array<{ key: string; label: string; icon: LucideIcon }> = [
  { key: "created",     label: "Created",     icon: PenTool },
  { key: "sold",        label: "Sold",        icon: BadgeDollarSign },
  { key: "transferred", label: "Transferred", icon: ArrowRightLeft },
  { key: "exhibited",   label: "Exhibited",   icon: Landmark },
  { key: "restored",    label: "Restored",    icon: Wrench },
  { key: "appraised",   label: "Appraised",   icon: Scale },
  { key: "donated",     label: "Donated",     icon: Gift },
  { key: "loaned",      label: "Loaned",      icon: Repeat },
];

const AUTH_STATUSES: Array<{ key: string; label: string; desc: string; tone: "ok" | "warn" | "neutral" }> = [
  { key: "original",        label: "Original work",   desc: "One-of-a-kind, handmade piece",       tone: "ok" },
  { key: "limited_edition", label: "Limited edition", desc: "Part of a numbered limited series",   tone: "warn" },
  { key: "reproduction",    label: "Reproduction",    desc: "A copy or print of an original work", tone: "neutral" },
];

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default function PassportManagePage() {
  const params = useParams<{ id: string }>();
  const artworkId = params?.id;
  const router = useRouter();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const [entryForm, setEntryForm] = useState({
    event_type: "created", owner_name: "", is_anonymous: false,
    date: "", location: "", notes: "",
  });

  const [authForm, setAuthForm] = useState({
    authentication_status: "original",
    authenticated_by: "",
    notes: "",
  });

  useEffect(() => { if (artworkId) load(); }, [artworkId]);

  async function load() {
    const sb = createClient();
    const [{ data: aw }, { data: prov }] = await Promise.all([
      sb.from("artworks")
        .select("id, title, medium, year, images, certificate_id, authentication_status, authenticated_by, authentication_date, authentication_notes, user_id")
        .eq("id", artworkId!)
        .single(),
      sb.from("provenance_entries")
        .select("*")
        .eq("artwork_id", artworkId!)
        .order("date", { ascending: true }),
    ]);
    setArtwork(aw);
    setProvenance(prov || []);

    // Pre-fill auth form with existing data
    if (aw?.authenticated_by) setAuthForm(f => ({ ...f, authenticated_by: aw.authenticated_by! }));
    if (aw?.authentication_notes) setAuthForm(f => ({ ...f, notes: aw.authentication_notes! }));
    if (aw?.authentication_status && aw.authentication_status !== "pending") {
      setAuthForm(f => ({ ...f, authentication_status: aw.authentication_status! }));
    }

    setLoading(false);
  }

  async function generatePassport() {
    if (!artwork) return;
    setGenerating(true);

    const sb = createClient();

    // Generate certificate ID if not exists
    if (!artwork.certificate_id) {
      const certId = `AM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      await sb.from("artworks").update({ certificate_id: certId }).eq("id", artwork.id);
      setArtwork(a => a ? { ...a, certificate_id: certId } : a);
    }

    // Auto-add "Created" provenance entry if none exists
    if (provenance.length === 0) {
      const { data: entry } = await sb.from("provenance_entries").insert({
        artwork_id: artwork.id,
        event_type: "created",
        date: artwork.year ? `${artwork.year}-01-01` : new Date().toISOString().split("T")[0],
        notes: `Artwork created by the artist${artwork.medium ? ` in ${artwork.medium}` : ""}.`,
      }).select().single();
      if (entry) setProvenance([entry]);
    }

    setGenerating(false);
    setGenerated(true);
    setTimeout(() => setGenerated(false), 3000);

    // Reload
    load();
  }

  async function addProvenanceEntry(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/artworks/${artworkId}/provenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entryForm),
    });
    const data = await res.json();
    if (data.entry) {
      setProvenance(p => [...p, data.entry].sort((a, b) => (a.date || "").localeCompare(b.date || "")));
      setShowAddEntry(false);
      setEntryForm({ event_type: "created", owner_name: "", is_anonymous: false, date: "", location: "", notes: "" });
    }
    setSaving(false);
  }

  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const res = await fetch(`/api/artworks/${artworkId}/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authentication_status: authForm.authentication_status,
        authenticated_by: authForm.authenticated_by,
        notes: authForm.notes,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setArtwork(a => a ? { ...a, authentication_status: data.authentication_status, authenticated_by: data.authenticated_by, authentication_date: data.authentication_date } : a);
      setShowAuthModal(false);
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm("Remove this provenance entry?")) return;
    const sb = createClient();
    await sb.from("provenance_entries").delete().eq("id", id);
    setProvenance(p => p.filter(e => e.id !== id));
  }

  function copyPassportUrl() {
    const url = `${window.location.origin}/artwork/${artworkId}/passport`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const qrUrl = artwork?.certificate_id
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${typeof window !== "undefined" ? window.location.origin : ""}/artwork/${artworkId}/passport`)}&bgcolor=FFFFFF&color=111110&margin=8`
    : null;

  const isVerified = artwork?.authentication_status && artwork.authentication_status !== "pending";
  const authCfg = AUTH_STATUSES.find(s => s.key === artwork?.authentication_status) || AUTH_STATUSES[0];
  const hasPassport = !!artwork?.certificate_id;

  const publicHref = `/artwork/${artworkId}/passport`;

  function openEntry(eventType: string) {
    setEntryForm(f => ({ ...f, event_type: eventType }));
    setShowAddEntry(true);
  }

  if (loading) return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Loading passport…</span>
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-80 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );

  if (!artwork) return (
    <EmptyState
      title="Artwork not found"
      description="It may have been deleted, or the link is wrong."
      action={<Link href="/dashboard/artworks" className={buttonClasses("secondary", "sm")}><ArrowLeft size={15} aria-hidden /> Back to artworks</Link>}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ── Add provenance entry ── */}
      <Modal
        open={showAddEntry}
        onClose={() => setShowAddEntry(false)}
        title="Add provenance entry"
        description="Each entry becomes part of the work's public history."
        size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowAddEntry(false)}>Cancel</Button>
          <Button type="submit" form="provenance-form" variant="primary" disabled={saving}>{saving ? "Adding…" : "Add entry"}</Button>
        </>}
      >
        <form id="provenance-form" onSubmit={addProvenanceEntry} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-ui text-label font-semibold text-fg">Event</legend>
            <div className="flex flex-wrap gap-2">
              {EVENT_TYPES.map(et => {
                const Icon = et.icon;
                return (
                  <Chip key={et.key} selected={entryForm.event_type === et.key}
                    onClick={() => setEntryForm(f => ({ ...f, event_type: et.key }))}>
                    <Icon size={14} aria-hidden /> {et.label}
                  </Chip>
                );
              })}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              {p => <Input {...p} type="date" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} />}
            </Field>
            <Field label="Location">
              {p => <Input {...p} value={entryForm.location} onChange={e => setEntryForm(f => ({ ...f, location: e.target.value }))} placeholder="City, country" />}
            </Field>
          </div>
          <Field label="Owner or involved party">
            {p => <Input {...p} value={entryForm.owner_name} onChange={e => setEntryForm(f => ({ ...f, owner_name: e.target.value }))} placeholder="Collector, gallery, museum…" />}
          </Field>
          <label className="flex cursor-pointer items-center gap-3 rounded-control bg-sunken px-3 py-2.5">
            <input type="checkbox" checked={entryForm.is_anonymous}
              onChange={() => setEntryForm(f => ({ ...f, is_anonymous: !f.is_anonymous }))}
              className="h-4 w-4 shrink-0 accent-[var(--color-ink)]" />
            <span className="font-ui text-body-sm text-fg">Keep anonymous <span className="text-fg-3">(shown as private collection)</span></span>
          </label>
          <Field label="Notes">
            {p => <Textarea {...p} rows={2} value={entryForm.notes} onChange={e => setEntryForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional context…" />}
          </Field>
        </form>
      </Modal>

      {/* ── Authenticate ── */}
      <Modal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title={isVerified ? "Update authentication" : "Authenticate artwork"}
        description="State what this work is and who vouches for it."
        size="md"
        footer={<>
          <Button variant="ghost" onClick={() => setShowAuthModal(false)}>Cancel</Button>
          <Button type="submit" form="auth-form" variant="primary" disabled={saving}>{saving ? "Saving…" : isVerified ? "Update" : "Authenticate"}</Button>
        </>}
      >
        <form id="auth-form" onSubmit={authenticate} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-ui text-label font-semibold text-fg">This work is</legend>
            {AUTH_STATUSES.map(s => {
              const on = authForm.authentication_status === s.key;
              return (
                <button key={s.key} type="button" aria-pressed={on}
                  onClick={() => setAuthForm(f => ({ ...f, authentication_status: s.key }))}
                  className={cn(
                    "flex items-center gap-3 rounded-control border-hair px-4 py-3 text-left transition-colors duration-fast",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                    on ? "border-ink bg-sunken" : "border-line bg-surface hover:border-line-strong",
                  )}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-ui text-body-sm font-semibold text-fg">{s.label}</span>
                    <span className="font-ui text-caption text-fg-3">{s.desc}</span>
                  </span>
                  <span aria-hidden className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-outline", on ? "border-ink bg-ink text-on-inverse" : "border-line-strong")}>
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </fieldset>
          <Field label="Authenticated by">
            {p => <Input {...p} required value={authForm.authenticated_by} onChange={e => setAuthForm(f => ({ ...f, authenticated_by: e.target.value }))} placeholder="Your name or institution" />}
          </Field>
          <Field label="Notes" hint="Optional. Condition, materials, method.">
            {p => <Textarea {...p} rows={2} value={authForm.notes} onChange={e => setAuthForm(f => ({ ...f, notes: e.target.value }))} />}
          </Field>
        </form>
      </Modal>

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <Link href={`/dashboard/artworks/${artworkId}`} aria-label={`Back to ${artwork.title}`}
            className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
            <ArrowLeft size={17} aria-hidden />
          </Link>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Eyebrow>Digital passport</Eyebrow>
            <Heading level={1} className="break-words">{artwork.title}</Heading>
            {(artwork.medium || artwork.year) && (
              <p className="font-ui text-body text-fg-2">{[artwork.medium, artwork.year].filter(Boolean).join(" · ")}</p>
            )}
          </div>
        </div>

        {hasPassport && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={copyPassportUrl} aria-live="polite">
              {copied ? <><Check size={15} aria-hidden className="text-ok" /> Copied</> : <><Copy size={15} aria-hidden /> Copy link</>}
            </Button>
            <a href={publicHref} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary")}>
              <ExternalLink size={15} aria-hidden /> View passport
            </a>
          </div>
        )}
      </div>

      {/* ── No passport yet ── */}
      {!hasPassport && (
        <Card padding="none" className="grid md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-4 p-6 md:p-8">
            <Eyebrow>No passport yet</Eyebrow>
            <Heading level={2}>Give this work a permanent record</Heading>
            <p className="max-w-[56ch] font-ui text-body text-fg-2">
              A digital passport is a certificate of authenticity for <span className="font-semibold text-fg">{artwork.title}</span>.
              It keeps the provenance, the authentication and the exhibition history in one place, and anyone can check it from a link or QR code.
            </p>
            <ul className="grid max-w-[520px] gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {[
                { icon: History, label: "Provenance trail" },
                { icon: Shield, label: "Authentication seal" },
                { icon: Link2, label: "Shareable link" },
                { icon: QrCode, label: "QR code for the wall label" },
              ].map(f => (
                <li key={f.label} className="flex items-center gap-2.5 font-ui text-body-sm text-fg">
                  <f.icon size={16} aria-hidden className="shrink-0 text-fg-3" /> {f.label}
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Button variant="primary" onClick={generatePassport} disabled={generating}>
                {generating
                  ? <><span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-t-transparent" /> Generating…</>
                  : <><ScrollText size={16} aria-hidden /> Generate passport</>}
              </Button>
            </div>
          </div>
          {artwork.images?.[0] ? (
            <div className="relative hidden min-h-[240px] bg-sunken md:block">
              <img src={artwork.images[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          ) : (
            <div className="hidden place-items-center bg-sunken text-fg-3 md:grid">
              <ScrollText size={40} strokeWidth={1.25} aria-hidden />
            </div>
          )}
        </Card>
      )}

      {/* ── Passport exists ── */}
      {hasPassport && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">

          {/* Provenance */}
          <div className="flex flex-col gap-4">
            <Card padding="none">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-hair border-line px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <Heading level={2} size="h3">Provenance</Heading>
                  <Badge>{provenance.length}</Badge>
                </div>
                <Button variant="primary" size="sm" onClick={() => setShowAddEntry(true)}>
                  <Plus size={14} strokeWidth={2.5} aria-hidden /> Add entry
                </Button>
              </div>

              {provenance.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                  <History size={28} strokeWidth={1.5} aria-hidden className="text-fg-3" />
                  <div className="flex flex-col gap-1">
                    <p className="font-ui text-body font-semibold text-fg">No history yet</p>
                    <p className="font-ui text-body-sm text-fg-2">Start with the day the work was made.</p>
                  </div>
                  <Button size="sm" onClick={() => openEntry("created")}>
                    <Plus size={14} aria-hidden /> Add creation event
                  </Button>
                </div>
              ) : (
                <ol className="px-5 py-2">
                  {provenance.map((entry, i) => {
                    const et = EVENT_TYPES.find(t => t.key === entry.event_type) || EVENT_TYPES[0];
                    const Icon = et.icon;
                    const last = i === provenance.length - 1;
                    return (
                      <li key={entry.id} className="group relative flex gap-4 py-3">
                        {/* Timeline rail */}
                        {!last && <span aria-hidden className="absolute bottom-0 left-4 top-12 w-px bg-line" />}
                        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border-hair border-line-strong bg-surface text-fg-2">
                          <Icon size={15} aria-hidden />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                            <span className="font-ui text-body-sm font-semibold text-fg">{et.label}</span>
                            {entry.date && (
                              <span className="inline-flex items-center gap-1.5 font-ui text-caption tabular-nums text-fg-3">
                                <Calendar size={12} aria-hidden /> {fmtDate(entry.date)}
                              </span>
                            )}
                          </div>
                          {entry.owner_name && !entry.is_anonymous && <p className="font-ui text-body-sm text-fg">{entry.owner_name}</p>}
                          {entry.is_anonymous && <p className="font-ui text-body-sm italic text-fg-2">Private collection</p>}
                          {entry.location && (
                            <p className="inline-flex items-center gap-1.5 font-ui text-caption text-fg-2">
                              <MapPin size={12} aria-hidden className="text-fg-3" /> {entry.location}
                            </p>
                          )}
                          {entry.notes && <p className="font-ui text-body-sm text-fg-2">{entry.notes}</p>}
                        </div>
                        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${et.label.toLowerCase()} entry`}
                          onClick={() => deleteEntry(entry.id)}
                          className="shrink-0 opacity-100 hover:text-bad lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100">
                          <Trash2 size={14} aria-hidden />
                        </Button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Card>

            {/* Quick add */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 font-ui text-label text-fg-3">Quick add</span>
              {[
                { et: EVENT_TYPES[1], label: "Record a sale" },
                { et: EVENT_TYPES[3], label: "Add exhibition" },
                { et: EVENT_TYPES[5], label: "Log appraisal" },
              ].map(({ et, label }) => {
                const Icon = et.icon;
                return (
                  <Chip key={et.key} onClick={() => openEntry(et.key)}>
                    <Icon size={14} aria-hidden /> {label}
                  </Chip>
                );
              })}
            </div>
          </div>

          {/* Certificate */}
          <div className="flex flex-col gap-4">
            {generated && (
              <div role="status" className="flex items-start gap-2.5 rounded-control bg-ok-well px-4 py-3 text-ok">
                <CheckCircle2 size={17} aria-hidden className="mt-0.5 shrink-0" />
                <div className="flex flex-col">
                  <span className="font-ui text-body-sm font-semibold">Passport generated</span>
                  <span className="font-ui text-caption">The certificate ID is saved.</span>
                </div>
              </div>
            )}

            <Card padding="none">
              {artwork.images?.[0] && (
                <div className="aspect-[4/3] bg-sunken">
                  <img src={artwork.images[0]} alt={artwork.title} className="h-full w-full object-cover" />
                </div>
              )}

              <div className="flex flex-col gap-1 border-b-hair border-line px-5 py-4">
                <Eyebrow>Artomango · Artwork passport</Eyebrow>
                <span className="font-ui text-label text-fg-3">Certificate ID</span>
                <span className="break-all rounded-chip bg-sunken px-3 py-2 font-code text-body-sm font-semibold tracking-[0.06em] text-fg">
                  {artwork.certificate_id}
                </span>
              </div>

              <div className="flex flex-col gap-2 border-b-hair border-line px-5 py-4">
                <span className="font-ui text-label text-fg-3">Authentication</span>
                {isVerified ? (
                  <div className="flex flex-col gap-1.5">
                    <div><Badge tone={authCfg.tone} dot>{authCfg.label}</Badge></div>
                    {artwork.authenticated_by && <p className="font-ui text-body-sm text-fg">By {artwork.authenticated_by}</p>}
                    {artwork.authentication_date && <p className="font-ui text-caption text-fg-3">On {fmtDate(artwork.authentication_date)}</p>}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 rounded-chip border-hair border-dashed border-line-strong px-3 py-2 font-ui text-body-sm text-fg-2">
                    <Lock size={14} aria-hidden className="shrink-0 text-fg-3" /> Not authenticated yet
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 px-5 py-4">
                {qrUrl && (
                  <div className="flex items-center gap-4">
                    <img src={qrUrl} alt="QR code linking to the public passport" width={96} height={96}
                      className="h-24 w-24 shrink-0 rounded-chip border-hair border-line bg-surface" />
                    <p className="font-ui text-caption text-fg-2">Print this next to the work. It opens the public passport.</p>
                  </div>
                )}
                <Button onClick={() => setShowAuthModal(true)} className="w-full">
                  <Shield size={15} aria-hidden /> {isVerified ? "Update authentication" : "Authenticate artwork"}
                </Button>
                <a href={publicHref} target="_blank" rel="noopener noreferrer" className={buttonClasses("ghost", "md", "w-full")}>
                  <Eye size={15} aria-hidden /> View public passport
                </a>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
