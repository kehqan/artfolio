"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Building2, Camera, Check, Copy, ExternalLink, Globe, Instagram, Linkedin, Mail, MessageCircle, Palette,
} from "lucide-react";
import {
  Alert, Avatar, Button, ButtonLink, Card, Field, Input, Label, PageHeader, Select, Skeleton, Tabs, Textarea, cn,
} from "@/components/ui";

type Tab = "profile" | "links" | "invite";

const VENUE_TYPES = ["Gallery", "Café", "Restaurant", "Hotel", "Office", "Cultural center", "Studio", "Pop-up space", "Museum", "Theater"];
const isVenueRole = (r?: string) => r === "venue" || r === "gallery";

type Form = {
  full_name: string; username: string; bio: string; location: string;
  website: string; role: string; instagram: string; behance: string; linkedin: string;
  venue_name: string; venue_type: string;
};
const EMPTY: Form = {
  full_name: "", username: "", bio: "", location: "", website: "", role: "artist",
  instagram: "", behance: "", linkedin: "", venue_name: "", venue_type: "",
};

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: (key: string, text: string) => {
      navigator.clipboard?.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(c => (c === key ? null : c)), 2000);
    },
  };
}

/** Input with a fixed prefix, e.g. instagram.com/ */
function PrefixInput({ prefix, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { prefix?: string; icon: React.ReactNode }) {
  return (
    <div className="flex h-10 items-center gap-2 rounded-control border-hair border-line-strong bg-surface px-3 transition-[border-color,box-shadow] duration-fast hover:border-n-400 focus-within:border-ink focus-within:shadow-hard-1">
      <span className="shrink-0 text-fg-3">{icon}</span>
      {prefix && <span className="shrink-0 font-ui text-control text-fg-3">{prefix}</span>}
      <input {...props} className="min-w-0 flex-1 bg-transparent font-ui text-control text-fg outline-none placeholder:text-fg-3" />
    </div>
  );
}

function CopyRow({ value, copied, onCopy, openHref }: { value: string; copied: boolean; onCopy: () => void; openHref?: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 truncate rounded-control bg-sunken px-3 py-2.5 font-code text-body-sm text-fg">{value}</code>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCopy} aria-live="polite">
          {copied ? <><Check size={15} aria-hidden /> Copied</> : <><Copy size={15} aria-hidden /> Copy</>}
        </Button>
        {openHref && (
          <a href={openHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-control px-3 font-ui text-control font-semibold text-fg-2 hover:bg-sunken hover:text-fg">
            <ExternalLink size={15} aria-hidden /> Open
          </a>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const sb = createClient();
  const [tab, setTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Form>(EMPTY);
  const [savedForm, setSavedForm] = useState<Form>(EMPTY);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [origin, setOrigin] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { copied, copy } = useCopy();

  useEffect(() => { setOrigin(window.location.origin); load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [{ data }, { count }] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).single(),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", user.id),
    ]);
    if (data) {
      const f: Form = {
        full_name: data.full_name || "", username: data.username || "", bio: data.bio || "",
        location: data.location || "", website: data.website || "", role: data.role || "artist",
        instagram: data.instagram || "", behance: data.behance || "", linkedin: data.linkedin || "",
        venue_name: data.venue_name || "", venue_type: data.venue_type || "",
      };
      setForm(f); setSavedForm(f);
      setAvatar(data.avatar_url || null);
    }
    setReferralCount(count ?? 0);
    setLoading(false);
  }

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm(p => ({ ...p, [k]: v }));
  const setE = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k)(e.target.value);
  const dirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  const isVenue = isVenueRole(form.role);

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true); setNotice(null);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }
    const clean = { ...form, username: form.username.toLowerCase().trim() };
    const { error } = await sb.from("profiles").update({
      full_name: clean.full_name,
      username: clean.username || null,
      bio: clean.bio || null,
      location: clean.location || null,
      website: clean.website || null,
      role: clean.role,
      instagram: clean.instagram.replace(/^@/, "") || null,
      behance: clean.behance || null,
      linkedin: clean.linkedin || null,
      venue_name: clean.venue_name || null,
      venue_type: clean.venue_type || null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);
    if (error) {
      setNotice({ tone: "bad", text: /username|duplicate|unique/i.test(error.message) ? "That username is taken. Try another." : error.message });
    } else {
      setForm(clean); setSavedForm(clean);
      setNotice({ tone: "ok", text: "Saved. Your public page is up to date." });
      setTimeout(() => setNotice(n => (n?.tone === "ok" ? null : n)), 3000);
    }
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    setNotice(null);
    if (!file.type.startsWith("image/")) { setNotice({ tone: "bad", text: "Choose an image file (JPG, PNG or WebP)." }); return; }
    if (file.size > 10 * 1024 * 1024) { setNotice({ tone: "bad", text: "That image is over 10 MB. Try a smaller one." }); return; }
    setUploading(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setUploading(false); return; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    // Storage rules need the user id as the second path segment; a fresh name per upload avoids stale caches
    const path = `avatars/${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      setNotice({ tone: "bad", text: "The photo didn't upload. Please try again." });
    } else {
      const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(path);
      await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setAvatar(publicUrl);
    }
    setUploading(false);
  }

  const publicUrl = savedForm.username && origin ? `${origin}/${savedForm.username}` : "";
  const referralUrl = savedForm.username && origin ? `${origin}/register?ref=${savedForm.username}` : "";
  const inviteText = `I'm using Artomango to keep track of my work, show it and find places to exhibit. Join with my link: ${referralUrl}`;

  const saveBar = (
    <div className="flex flex-col-reverse gap-3 border-t-hair border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
      <span className="font-ui text-body-sm text-fg-3">{dirty ? "You have unsaved changes." : "Everything is saved."}</span>
      <Button type="submit" variant="primary" disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</Button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-96 w-full max-w-[760px] rounded-card" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your profile"
        description="What artists, venues and collectors see on your public page."
        actions={publicUrl ? (
          <ButtonLink href={`/${savedForm.username}`} target="_blank" variant="secondary">
            <ExternalLink size={15} aria-hidden /> View public page
          </ButtonLink>
        ) : undefined}
      />

      <Tabs
        items={[
          { value: "profile", label: "Profile" },
          { value: "links", label: "Links" },
          { value: "invite", label: "Invite", count: referralCount || undefined },
        ]}
        value={tab}
        onChange={setTab}
        label="Profile sections"
        className="max-w-full self-start overflow-x-auto"
      />

      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        {/* ── Main column ── */}
        <div className="min-w-0">
          {tab === "profile" && (
            <form onSubmit={save}>
              <Card padding="lg" className="flex flex-col gap-6">
                {/* Photo */}
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-card border-hair border-line bg-mango-soft"
                    aria-label="Change photo"
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center font-display text-h2 font-bold text-fg">{(form.full_name || "?")[0]}</span>
                    )}
                    <span className="absolute inset-0 grid place-items-center bg-inverse text-on-inverse opacity-0 transition-opacity duration-fast group-hover:opacity-80 group-focus-visible:opacity-80">
                      <Camera size={18} aria-hidden />
                    </span>
                  </button>
                  <div className="flex flex-col items-start gap-1.5">
                    <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? "Uploading…" : avatar ? "Change photo" : "Add a photo"}
                    </Button>
                    <span className="font-ui text-caption text-fg-3">Square works best. Up to 10 MB.</span>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
                </div>

                {/* Identity */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" hint={isVenue ? "The person running the account." : "As you sign your work."}>
                    {p => <Input {...p} required value={form.full_name} onChange={setE("full_name")} placeholder="Your name" />}
                  </Field>
                  <Field label="Username" hint={form.username ? `Your page: artomango…/${form.username}` : "Letters, numbers and underscores."}>
                    {p => (
                      <Input {...p} required value={form.username} placeholder="yourname"
                        onChange={e => set("username")(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
                    )}
                  </Field>
                </div>

                {/* Role */}
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 font-ui text-label font-semibold text-fg">You are</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      { venue: false, label: "An artist", desc: "Painter, sculptor, photographer and more", Icon: Palette },
                      { venue: true, label: "A venue", desc: "Gallery, café, studio, hotel and more", Icon: Building2 },
                    ].map(o => {
                      const active = isVenue === o.venue;
                      return (
                        <button
                          key={o.label}
                          type="button"
                          aria-pressed={active}
                          onClick={() => set("role")(o.venue ? (isVenueRole(savedForm.role) ? savedForm.role : "venue") : "artist")}
                          className={cn(
                            "flex items-start gap-3 rounded-control border-hair p-4 text-left transition-colors duration-fast",
                            active ? "border-ink bg-mango-soft" : "border-line bg-surface hover:border-n-400",
                          )}
                        >
                          <o.Icon size={18} aria-hidden className="mt-0.5 shrink-0 text-fg" />
                          <span className="flex flex-col gap-0.5">
                            <span className="font-ui text-body font-semibold text-fg">{o.label}</span>
                            <span className="font-ui text-body-sm text-fg-3">{o.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {isVenue && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Venue name">
                      {p => <Input {...p} value={form.venue_name} onChange={setE("venue_name")} placeholder="e.g. Galerie Nord" />}
                    </Field>
                    <Field label="Kind of place">
                      {p => (
                        <Select {...p} value={form.venue_type} onChange={setE("venue_type")}>
                          <option value="">Choose one</option>
                          {VENUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </Select>
                      )}
                    </Field>
                  </div>
                )}

                <Field label="Bio" hint="A few lines. Shown at the top of your public page.">
                  {p => <Textarea {...p} rows={4} value={form.bio} onChange={setE("bio")} placeholder={isVenue ? "What your space is and what you like to show" : "What you make and how you work"} />}
                </Field>

                <div className="flex flex-col gap-1.5">
                  <Label>{isVenue ? "Address" : "City"}</Label>
                  <PlacesAutocomplete
                    value={form.location}
                    placeholder={isVenue ? "Search your venue's address" : "Search your city"}
                    onChange={(_, raw) => set("location")(raw)}
                  />
                  <span className="font-ui text-caption text-fg-3">{isVenue ? "Helps artists find you on the map." : "Just the city is fine."}</span>
                </div>

                {saveBar}
              </Card>
            </form>
          )}

          {tab === "links" && (
            <form onSubmit={save}>
              <Card padding="lg" className="flex flex-col gap-5">
                <p className="font-ui text-body text-fg-2">Links show on your public page so people can see more of your work.</p>
                {[
                  { k: "website" as const, label: "Website", icon: <Globe size={16} />, prefix: "", ph: "yoursite.com" },
                  { k: "instagram" as const, label: "Instagram", icon: <Instagram size={16} />, prefix: "@", ph: "yourhandle" },
                  { k: "behance" as const, label: "Behance", icon: <Palette size={16} />, prefix: "behance.net/", ph: "your-name" },
                  { k: "linkedin" as const, label: "LinkedIn", icon: <Linkedin size={16} />, prefix: "linkedin.com/in/", ph: "your-name" },
                ].map(l => (
                  <div key={l.k} className="flex flex-col gap-1.5">
                    <Label htmlFor={`link-${l.k}`}>{l.label}</Label>
                    <PrefixInput id={`link-${l.k}`} icon={l.icon} prefix={l.prefix} placeholder={l.ph} value={form[l.k]} onChange={setE(l.k)} />
                  </div>
                ))}
                {saveBar}
              </Card>
            </form>
          )}

          {tab === "invite" && (
            <Card padding="lg" className="flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="font-display text-h3 font-bold text-fg">Invite artists you know</span>
                <p className="font-ui text-body text-fg-2">
                  Share your link. When someone joins through it, they&rsquo;re linked to you, and you start out connected.
                </p>
              </div>
              {referralUrl ? (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label>Your invite link</Label>
                    <CopyRow value={referralUrl} copied={copied === "ref"} onCopy={() => copy("ref", referralUrl)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Send it</Label>
                    <div className="flex flex-wrap gap-2">
                      <a href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} target="_blank" rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-control border-outline border-ink bg-surface px-4 font-ui text-control font-semibold text-fg hover:bg-sunken">
                        <MessageCircle size={15} aria-hidden /> WhatsApp
                      </a>
                      <a href={`mailto:?subject=${encodeURIComponent("Join me on Artomango")}&body=${encodeURIComponent(inviteText)}`}
                        className="inline-flex h-10 items-center gap-2 rounded-control border-outline border-ink bg-surface px-4 font-ui text-control font-semibold text-fg hover:bg-sunken">
                        <Mail size={15} aria-hidden /> Email
                      </a>
                      <Button variant="secondary" onClick={() => copy("msg", inviteText)} aria-live="polite">
                        {copied === "msg" ? <><Check size={15} aria-hidden /> Message copied</> : <><Copy size={15} aria-hidden /> Copy a message</>}
                      </Button>
                    </div>
                    <span className="font-ui text-caption text-fg-3">For Instagram, copy the message and paste it in a DM or your bio.</span>
                  </div>
                  <div className="flex items-baseline gap-2 border-t-hair border-line pt-5">
                    <span className="font-display text-h2 font-bold tabular-nums text-fg">{referralCount}</span>
                    <span className="font-ui text-body-sm text-fg-2">{referralCount === 1 ? "person has" : "people have"} joined with your link</span>
                  </div>
                </>
              ) : (
                <Alert tone="warn">Pick a username on the Profile tab first. Your invite link uses it.</Alert>
              )}
            </Card>
          )}
        </div>

        {/* ── Side column: public page ── */}
        <aside className="flex flex-col gap-4">
          <Card padding="md" className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={form.full_name || "You"} src={avatar} size="md" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-ui text-body font-semibold text-fg">{(isVenue && form.venue_name) || form.full_name || "Your name"}</span>
                <span className="truncate font-ui text-body-sm text-fg-3">{[isVenue ? "Venue" : "Artist", form.location].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
            {publicUrl ? (
              <>
                <code className="truncate rounded-control bg-sunken px-3 py-2 font-code text-caption text-fg">{publicUrl.replace(/^https?:\/\//, "")}</code>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => copy("pub", publicUrl)} aria-live="polite">
                    {copied === "pub" ? <><Check size={14} aria-hidden /> Copied</> : <><Copy size={14} aria-hidden /> Copy link</>}
                  </Button>
                  <ButtonLink href={`/${savedForm.username}`} target="_blank" variant="ghost" size="sm">Open</ButtonLink>
                </div>
              </>
            ) : (
              <p className="font-ui text-body-sm text-fg-3">Save a username to get your public page link.</p>
            )}
          </Card>
          <Card padding="md" className="flex flex-col gap-2">
            <span className="font-ui text-label font-semibold text-fg">Choose what&rsquo;s on show</span>
            <p className="font-ui text-body-sm text-fg-2">Pick the works for sale, banner and sections on your page in My Front Door.</p>
            <Link href="/dashboard/mystore" className="mt-1 self-start font-ui text-label font-semibold text-fg underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Go to My Front Door
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
