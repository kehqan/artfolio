"use client";
// One way to post to the Scene. It starts with "What are you posting?"
// and then asks only what that choice needs. Each choice saves to the
// table that already holds that kind of post.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CalendarDays, Handshake, ImagePlus, Megaphone, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { Alert, Button, Chip, Field, Input, Modal, Select, Switch, Textarea, cn } from "@/components/ui";
import { type FeedItem, POOL_TYPES, SHOW_TYPES, isVenueRole } from "./feed";

export type Choice = "show" | "opencall" | "collab" | "looking";

const CHOICES: { key: Choice; title: string; desc: string; icon: typeof CalendarDays }[] = [
  { key: "show", title: "A show or event", desc: "Exhibition, opening, workshop, talk, open studio", icon: CalendarDays },
  { key: "opencall", title: "An open call", desc: "Invite artists to apply or submit work", icon: Megaphone },
  { key: "collab", title: "A collab or commission", desc: "Find a partner, or say you take commissions", icon: Handshake },
  { key: "looking", title: "I'm looking for something", desc: "A venue, a residency, artists, work to buy", icon: Search },
];

function SwitchRow({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="font-ui text-body-sm font-semibold text-fg">{label}</span>
        {hint && <span className="font-ui text-caption text-fg-3">{hint}</span>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

type Form = {
  title: string; description: string; images: string[];
  where: string; lat: number | null; lng: number | null; online: boolean; link: string;
  start: string; end: string; deadline: string;
  eventType: string; collabType: "collab" | "commission"; price: string; numArtists: string;
  requestType: string; isPublic: boolean;
  wall: string; duration: string; sells: boolean; commission: string;
};

const EMPTY: Form = {
  title: "", description: "", images: [], where: "", lat: null, lng: null, online: false, link: "",
  start: "", end: "", deadline: "", eventType: "exhibition", collabType: "collab", price: "", numArtists: "",
  requestType: "", isPublic: true,
  wall: "", duration: "", sells: true, commission: "",
};

function choiceFor(i: FeedItem): Choice {
  if (i.source === "show") return "show";
  if (i.source === "pool") return "looking";
  const t = i.raw.post_type;
  if (t === "opencall") return "opencall";
  if (t === "event" || t === "exhibition") return "show";
  return "collab";
}

function formFor(i: FeedItem): Form {
  const r = i.raw;
  return {
    ...EMPTY,
    title: r.title || "", description: r.description || "", images: i.images,
    where: i.where || "", lat: r.lat ?? null, lng: r.lng ?? null, online: i.online, link: i.link || "",
    start: r.start_date || "", end: r.end_date || "", deadline: r.deadline || "",
    eventType: r.event_type || (r.post_type === "event" ? "other" : "exhibition"),
    collabType: r.post_type === "commission" ? "commission" : "collab",
    price: r.price_from || "", numArtists: r.num_artists ? String(r.num_artists) : "",
    requestType: r.request_type || "", isPublic: r.is_public !== false,
    wall: r.details?.wall || "", duration: r.details?.duration || "",
    sells: r.details?.sells !== false, commission: r.details?.commission != null ? String(r.details.commission) : "",
  };
}

type Props = {
  open: boolean;
  editing: FeedItem | null;
  userId: string;
  role?: string | null;
  /** Open straight on a choice, e.g. a venue's "Art for our walls" post. */
  start?: { choice: Choice; requestType?: string } | null;
  onClose: () => void;
  onSaved: () => void;
};

export function Composer({ open, editing, userId, role, start, onClose, onSaved }: Props) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const venue = isVenueRole(role);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) { setChoice(choiceFor(editing)); setForm(formFor(editing)); }
    else if (start) { setChoice(start.choice); setForm({ ...EMPTY, requestType: start.requestType || "" }); }
    else { setChoice(null); setForm(EMPTY); }
  }, [open, editing, start]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }));
  const maxImages = choice === "show" && (!editing || editing.source === "show") ? 1 : 6;

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError("");
    const sb = createClient();
    const added: string[] = [];
    const picked = Array.from(files).slice(0, maxImages - form.images.length);
    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/scene/${Date.now()}-${i}.${ext}`;
      const { error: err } = await sb.storage.from("artworks").upload(path, file, { upsert: true, contentType: file.type });
      if (err) { setError("One of the images didn't upload. Please try again."); continue; }
      added.push(sb.storage.from("artworks").getPublicUrl(path).data.publicUrl);
    }
    setForm(f => ({ ...f, images: [...f.images, ...added].slice(0, maxImages) }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    if (!choice) return;
    if (!form.title.trim()) { setError("Give it a title."); return; }
    if (choice === "looking" && !form.requestType) { setError("Choose what you're looking for."); return; }
    if (form.end && form.start && form.end < form.start) { setError("The end date is before the start date."); return; }
    setSaving(true); setError("");
    const sb = createClient();
    const now = new Date().toISOString();
    const title = form.title.trim();
    const description = form.description.trim() || null;
    const where = form.online ? null : form.where.trim() || null;
    let res: { error: any };

    // An old scene_posts event keeps living in scene_posts when edited.
    const sceneShow = choice === "show" && editing?.source === "scene";

    if (choice === "show" && !sceneShow) {
      const today = now.slice(0, 10);
      const status = form.end && form.end < today ? "past"
        : form.start && form.start <= today ? "current" : "upcoming";
      const row = {
        title, description, event_type: form.eventType, start_date: form.start || null, end_date: form.end || null,
        venue: where, location_name: where, lat: form.online ? null : form.lat, lng: form.online ? null : form.lng,
        is_online: form.online, online_url: form.online ? form.link.trim() || null : null,
        cover_image: form.images[0] || null, is_public: form.isPublic, status, updated_at: now,
      };
      res = editing
        ? await sb.from("exhibitions").update(row).eq("id", editing.id).eq("user_id", userId)
        : await sb.from("exhibitions").insert({ ...row, user_id: userId });
    } else if (choice === "looking") {
      const row = {
        title, description, request_type: form.requestType,
        poster_type: venue ? "venue" : "artist", poster_role: venue ? "venue" : "artist",
        location: where, location_name: where, lat: form.lat, lng: form.lng,
        deadline: form.deadline || null, cover_image: form.images[0] || null, images: form.images,
        status: editing?.raw.status || "open", updated_at: now,
      };
      const saved = editing
        ? await sb.from("pool_requests").update(row).eq("id", editing.id).eq("user_id", userId).select("id").single()
        : await sb.from("pool_requests").insert({ ...row, user_id: userId }).select("id").single();
      res = saved;
      // Wall details go in their own write so the post still saves if the
      // details column hasn't been added yet.
      if (!saved.error && saved.data && form.requestType === "walls") {
        const pct = parseFloat(form.commission);
        await sb.from("pool_requests").update({ details: {
          wall: form.wall.trim() || undefined, duration: form.duration.trim() || undefined,
          sells: form.sells, commission: form.sells && !isNaN(pct) ? pct : null,
        } }).eq("id", saved.data.id).eq("user_id", userId);
      }
    } else {
      const postType = sceneShow ? editing!.raw.post_type : choice === "opencall" ? "opencall" : form.collabType;
      const row = {
        post_type: postType, title, description, location: where, is_online: form.online,
        start_date: form.start || null, end_date: form.end || null, deadline: form.deadline || null,
        cover_image: form.images[0] || null, images: form.images,
        price_from: postType === "commission" ? form.price.trim() || null : null,
        num_artists: postType === "opencall" && form.numArtists ? parseInt(form.numArtists, 10) || null : null,
        submission_link: form.link.trim() || null, is_public: form.isPublic, updated_at: now,
      };
      res = editing
        ? await sb.from("scene_posts").update(row).eq("id", editing.id).eq("user_id", userId)
        : await sb.from("scene_posts").insert({ ...row, user_id: userId, status: "active", from_calendar: false });
    }

    setSaving(false);
    if (res.error) { setError("That didn't save. Please try again."); return; }
    onSaved();
    onClose();
  }

  const titleText = editing ? "Edit post" : choice ? CHOICES.find(c => c.key === choice)!.title : "What are you posting?";

  const footer = choice ? (
    <>
      {!editing && (
        <Button variant="ghost" className="mr-auto" onClick={() => { setChoice(null); setError(""); }}>
          <ArrowLeft size={15} aria-hidden /> Back
        </Button>
      )}
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant="primary" onClick={save} disabled={saving || uploading}>
        {saving ? "Saving…" : editing ? "Save changes" : "Post to the Scene"}
      </Button>
    </>
  ) : undefined;

  return (
    <Modal open={open} onClose={onClose} size="md" title={titleText}
      description={!choice ? "Pick one. You can change the details later." : undefined} footer={footer}>
      {!choice ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {CHOICES.map(c => (
            <button key={c.key} type="button" onClick={() => setChoice(c.key)}
              className="flex flex-col gap-2 rounded-card border-hair border-line bg-surface p-4 text-left transition hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none">
              <c.icon size={20} aria-hidden className="text-fg" />
              <span className="font-ui text-body font-semibold text-fg">{c.title}</span>
              <span className="font-ui text-body-sm text-fg-3">{c.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && <Alert tone="bad">{error}</Alert>}

          {choice === "looking" && (
            <Field label="I'm looking for">
              {p => (
                <Select {...p} value={form.requestType} onChange={e => set("requestType", e.target.value)}>
                  <option value="" disabled>Choose one</option>
                  {(venue ? POOL_TYPES.venue : POOL_TYPES.artist).map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </Select>
              )}
            </Field>
          )}

          {choice === "looking" && form.requestType === "walls" && (
            <div className="flex flex-col gap-4 rounded-card border-hair border-line bg-sunken p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Wall space" hint="Optional">
                  {p => <Input {...p} value={form.wall} maxLength={80} placeholder="One wall, about 3 × 2 m" onChange={e => set("wall", e.target.value)} />}
                </Field>
                <Field label="For how long" hint="Optional">
                  {p => <Input {...p} value={form.duration} maxLength={60} placeholder="2 months" onChange={e => set("duration", e.target.value)} />}
                </Field>
              </div>
              <SwitchRow checked={form.sells} onChange={v => set("sells", v)} label="Guests can buy the work" hint="Switch off if it's for display only." />
              {form.sells && (
                <Field label="Your commission" hint="Optional. Leave empty if you take none.">
                  {p => <Input {...p} type="number" min={0} max={100} inputMode="decimal" value={form.commission} placeholder="20" onChange={e => set("commission", e.target.value)} />}
                </Field>
              )}
            </div>
          )}

          {choice === "collab" && !editing && (
            <div className="flex gap-2" role="group" aria-label="Kind">
              <Chip selected={form.collabType === "collab"} onClick={() => set("collabType", "collab")}>A collab</Chip>
              <Chip selected={form.collabType === "commission"} onClick={() => set("collabType", "commission")}>Commissions</Chip>
            </div>
          )}

          <Field label="Title">
            {p => <Input {...p} value={form.title} maxLength={120} onChange={e => set("title", e.target.value)}
              placeholder={choice === "show" ? "Paper and light, a group show" : choice === "opencall" ? "Open call: small works" : choice === "looking" ? (form.requestType === "walls" ? "Art for our café walls this spring" : "Looking for a wall in Berlin") : "Looking for a printmaker to work with"} />}
          </Field>

          {choice === "show" && editing?.source !== "scene" && (
            <Field label="Type">
              {p => (
                <Select {...p} value={form.eventType} onChange={e => set("eventType", e.target.value)}>
                  {SHOW_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </Select>
              )}
            </Field>
          )}

          <Field label="Description" hint="What should people know? Keep it short.">
            {p => <Textarea {...p} rows={4} value={form.description} onChange={e => set("description", e.target.value)} />}
          </Field>

          {choice !== "looking" && (
            <SwitchRow checked={form.online} onChange={v => set("online", v)} label="It happens online" />
          )}

          {form.online && choice !== "looking" ? (
            <Field label={choice === "show" ? "Online link" : "Link"}>
              {p => <Input {...p} type="url" value={form.link} placeholder="https://" onChange={e => set("link", e.target.value)} />}
            </Field>
          ) : (
            <PlacesAutocomplete
              label="Where"
              value={form.where}
              placeholder="Venue, address or city"
              onChange={(r, raw) => setForm(f => ({ ...f, where: r?.name || raw, lat: r?.lat ?? null, lng: r?.lng ?? null }))}
            />
          )}

          {choice === "show" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">{p => <Input {...p} type="date" value={form.start} onChange={e => set("start", e.target.value)} />}</Field>
              <Field label="Ends" hint="Leave empty for one day">{p => <Input {...p} type="date" value={form.end} onChange={e => set("end", e.target.value)} />}</Field>
            </div>
          )}

          {(choice === "opencall" || choice === "looking") && (
            <Field label={choice === "opencall" ? "Apply by" : "Until"} hint={choice === "looking" ? "Optional" : undefined}>
              {p => <Input {...p} type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} />}
            </Field>
          )}

          {choice === "opencall" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="How many artists" hint="Optional">
                {p => <Input {...p} type="number" min={1} value={form.numArtists} onChange={e => set("numArtists", e.target.value)} />}
              </Field>
              {!form.online && (
                <Field label="Where to apply" hint="Optional link">
                  {p => <Input {...p} type="url" value={form.link} placeholder="https://" onChange={e => set("link", e.target.value)} />}
                </Field>
              )}
            </div>
          )}

          {choice === "collab" && form.collabType === "commission" && (
            <Field label="Prices from" hint="Optional, for example €300">
              {p => <Input {...p} value={form.price} onChange={e => set("price", e.target.value)} />}
            </Field>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-label font-semibold text-fg">{maxImages === 1 ? "Image" : "Images"}</span>
            <div className="flex flex-wrap gap-2">
              {form.images.map(src => (
                <div key={src} className="relative h-20 w-20 overflow-hidden rounded-control border-hair border-line bg-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-contain p-1" />
                  <button type="button" aria-label="Remove image" onClick={() => set("images", form.images.filter(s => s !== src))}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-pill border-outline border-ink bg-surface hover:bg-sunken">
                    <X size={12} aria-hidden />
                  </button>
                </div>
              ))}
              {form.images.length < maxImages && (
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className={cn("flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-control border-hair border-dashed border-line-strong font-ui text-caption text-fg-3 hover:border-ink hover:text-fg", uploading && "opacity-60")}>
                  <ImagePlus size={18} aria-hidden /> {uploading ? "Uploading" : "Add"}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple={maxImages > 1} hidden onChange={e => upload(e.target.files)} />
          </div>

          {choice !== "looking" && (
            <SwitchRow checked={form.isPublic} onChange={v => set("isPublic", v)} label="Show it in the Scene" hint="Switch off to keep it as a private draft." />
          )}
        </div>
      )}
    </Modal>
  );
}
