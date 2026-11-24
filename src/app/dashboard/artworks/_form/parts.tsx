"use client";
/**
 * Shared building blocks for the new and edit artwork forms.
 * Presentation only: each page keeps its own loading and saving logic.
 */
import { useRef, useState, type ReactNode } from "react";
import {
  Check, Hash, ImagePlus, Layers, Link2, MapPin, X, ExternalLink,
  Frame, Monitor, Printer, Shapes, type LucideIcon,
} from "lucide-react";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { Card, Chip, Field, Heading, Input, Select, Switch, Textarea, cn } from "@/components/ui";
import { STAGES, formatPrice } from "@/lib/artwork-stage";

// ── Config ─────────────────────────────────────────────────────────
export type ArtType = "physical" | "digital" | "print" | "mixed";

export const ART_TYPES: Array<{ key: ArtType; label: string; desc: string; icon: LucideIcon }> = [
  { key: "physical", label: "Physical",        desc: "Painting, sculpture, drawing",              icon: Frame },
  { key: "digital",  label: "Digital",         desc: "Digital painting, photography, generative", icon: Monitor },
  { key: "print",    label: "Print or edition", desc: "Lithograph, screen print, numbered run",   icon: Printer },
  { key: "mixed",    label: "Mixed media",     desc: "Physical and digital together",             icon: Shapes },
];

const SALE_METHODS = [
  { key: "direct",           label: "Direct purchase" },
  { key: "inquiry",          label: "Inquiry only" },
  { key: "price_on_request", label: "Price on request" },
  { key: "auction",          label: "Auction" },
  { key: "not_for_sale",     label: "Not for sale" },
];

const AUTH_TYPES = [
  { key: "original",        label: "Original work",   desc: "One-of-a-kind piece" },
  { key: "limited_edition", label: "Limited edition", desc: "Part of a numbered limited series" },
  { key: "reproduction",    label: "Reproduction",    desc: "Copy or print of an original" },
];

const FILE_FORMATS = ["PNG", "JPG", "SVG", "GIF", "MP4", "WEBP", "TIFF", "PDF", "PSD", "AI", "GLB", "Other"];
const CURRENCIES = ["EUR", "USD", "GBP", "CZK", "CHF", "JPY", "CAD"];

export const MAX_IMAGES = 8;

export const WALL_TERMS = [
  { key: "either", label: "For sale or on loan" },
  { key: "sale", label: "For sale" },
  { key: "loan", label: "On loan only" },
];

export type ArtworkForm = {
  title: string; year: string; medium: string; description: string; notes: string;
  width_cm: string; height_cm: string; depth_cm: string; framed: boolean;
  file_format: string; resolution: string; digital_file_url: string;
  edition_total: string; edition_number: string; edition_code: string;
  authentication_status: string;
  price: string; currency: string; status: string; sale_method: string;
  venue_location: string; location_name: string;
  materials_cost: string; time_spent: string;
  /** "" = not offered; otherwise 'sale' | 'loan' | 'either'. */
  wall_terms: string;
};

export type Moodboard = {
  id: string; title: string; provider: string;
  thumbnail_url?: string; og_image?: string; url: string;
};

type ChangeHandler = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

// ── Layout pieces ──────────────────────────────────────────────────
export function FormSection({ title, description, right, children }: {
  title: string; description?: ReactNode; right?: ReactNode; children: ReactNode;
}) {
  return (
    <Card padding="none">
      <div className="flex items-start justify-between gap-3 border-b-hair border-line px-5 py-3.5">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Heading level={2} size="h3">{title}</Heading>
          {description && <p className="font-ui text-caption text-fg-3">{description}</p>}
        </div>
        {right}
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </Card>
  );
}

/** One-of-many option rows (authenticity, sale method). */
function OptionList({ legend, options, value, onSelect }: {
  legend: string;
  options: Array<{ key: string; label: string; desc?: string }>;
  value: string;
  onSelect: (key: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 font-ui text-label font-semibold text-fg">{legend}</legend>
      {options.map(o => {
        const on = value === o.key;
        return (
          <button key={o.key} type="button" aria-pressed={on} onClick={() => onSelect(o.key)}
            className={cn(
              "flex items-center gap-3 rounded-control border-hair px-3.5 text-left transition-colors duration-fast",
              o.desc ? "py-2.5" : "py-2",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
              on ? "border-ink bg-sunken" : "border-line bg-surface hover:border-line-strong",
            )}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-ui text-body-sm font-semibold text-fg">{o.label}</span>
              {o.desc && <span className="font-ui text-caption text-fg-3">{o.desc}</span>}
            </span>
            <span aria-hidden className={cn(
              "grid h-5 w-5 shrink-0 place-items-center rounded-full border-outline",
              on ? "border-ink bg-ink text-on-inverse" : "border-line-strong",
            )}>
              {on && <Check size={12} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2.5 font-ui text-body-sm text-fg">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-[var(--color-ink)]" />
      {children}
    </label>
  );
}

// ── Art type ───────────────────────────────────────────────────────
/** Large cards for the first step of a new artwork. */
export function ArtTypeCards({ onPick }: { onPick: (t: ArtType) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ART_TYPES.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.key} type="button" onClick={() => onPick(t.key)}
            className={cn(
              "group flex items-start gap-4 rounded-card border-hair border-line bg-surface p-5 text-left",
              "transition-[transform,box-shadow,border-color] duration-base ease-out",
              "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-2",
              "focus-visible:border-ink focus-visible:outline-none focus-visible:shadow-hard-2",
            )}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-control bg-sunken text-fg-2 transition-colors group-hover:text-fg">
              <Icon size={20} strokeWidth={1.75} aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="font-display text-h3 font-extrabold text-fg">{t.label}</span>
              <span className="font-ui text-body-sm text-fg-2">{t.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Compact switcher for the edit page header. */
export function ArtTypeSwitch({ value, onChange }: { value: ArtType; onChange: (t: ArtType) => void }) {
  return (
    <div role="group" aria-label="Kind of work" className="flex flex-wrap gap-2">
      {ART_TYPES.map(t => {
        const Icon = t.icon;
        return (
          <Chip key={t.key} selected={value === t.key} onClick={() => onChange(t.key)}>
            <Icon size={14} aria-hidden /> {t.label}
          </Chip>
        );
      })}
    </div>
  );
}

// ── Images ─────────────────────────────────────────────────────────
export function ImageThumb({ src, main, pending, onRemove }: { src: string; main?: boolean; pending?: boolean; onRemove: () => void }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-control border-hair border-line bg-sunken">
      <img src={src} alt="" className="h-full w-full object-cover" />
      <button type="button" onClick={onRemove} aria-label="Remove image"
        className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-chip border-hair border-line bg-surface text-fg-2 shadow-hard-1 transition-colors hover:border-ink hover:text-fg">
        <X size={14} aria-hidden />
      </button>
      {(main || pending) && (
        <span className={cn(
          "absolute bottom-1.5 left-1.5 rounded-chip px-1.5 py-0.5 font-ui text-caption font-semibold",
          main ? "bg-inverse text-on-inverse" : "bg-surface text-fg-2",
        )}>
          {main ? "Cover" : "New"}
        </span>
      )}
    </div>
  );
}

export function Dropzone({ onFiles, remaining }: { onFiles: (files: FileList | null) => void; remaining: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <button type="button"
        onClick={() => ref.current?.click()}
        onDrop={e => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        className={cn(
          "flex w-full flex-col items-center gap-2 rounded-control border-outline border-dashed px-4 py-6 text-center transition-colors duration-fast",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          over ? "border-ink bg-sunken" : "border-line-strong bg-page hover:border-ink",
        )}>
        <ImagePlus size={22} strokeWidth={1.75} aria-hidden className="text-fg-3" />
        <span className="font-ui text-body-sm font-semibold text-fg">Drop images or click to upload</span>
        <span className="font-ui text-caption text-fg-3">JPG, PNG or WEBP · {remaining} of {MAX_IMAGES} left</span>
      </button>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => onFiles(e.target.files)} />
    </>
  );
}

// ── Moodboards ─────────────────────────────────────────────────────
function MoodboardPicker({ moodboards, linked, onToggle }: { moodboards: Moodboard[]; linked: string[]; onToggle: (id: string) => void }) {
  return (
    <FormSection
      title="Moodboards"
      description="Link the boards behind this work."
      right={<a href="/dashboard/mystore?tab=moodboards" target="_blank" rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1 font-ui text-label font-semibold text-fg-3 hover:text-fg">
        Manage <ExternalLink size={12} aria-hidden />
      </a>}
    >
      {moodboards.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-3 text-center">
          <Layers size={22} strokeWidth={1.75} aria-hidden className="text-fg-3" />
          <p className="font-ui text-body-sm text-fg-2">No moodboards yet.</p>
          <a href="/dashboard/mystore?tab=moodboards" target="_blank" rel="noopener noreferrer"
            className="font-ui text-label font-semibold text-fg underline underline-offset-2 hover:no-underline">
            Create one
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {moodboards.map(mb => {
            const on = linked.includes(mb.id);
            const thumb = mb.thumbnail_url || mb.og_image;
            return (
              <button key={mb.id} type="button" aria-pressed={on} onClick={() => onToggle(mb.id)}
                className={cn(
                  "flex items-center gap-3 rounded-control border-hair p-2 pr-3 text-left transition-colors duration-fast",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
                  on ? "border-ink bg-sunken" : "border-line bg-surface hover:border-line-strong",
                )}>
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-chip bg-sunken text-fg-3">
                  {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <Layers size={16} aria-hidden />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-ui text-body-sm font-semibold text-fg">{mb.title}</span>
                  <span className="font-ui text-caption capitalize text-fg-3">{mb.provider}</span>
                </span>
                <span aria-hidden className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-chip border-outline",
                  on ? "border-ink bg-ink text-on-inverse" : "border-line-strong",
                )}>
                  {on && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            );
          })}
          {linked.length > 0 && (
            <p className="font-ui text-caption text-fg-2">{linked.length} board{linked.length > 1 ? "s" : ""} linked</p>
          )}
        </div>
      )}
    </FormSection>
  );
}

// ── All fields ─────────────────────────────────────────────────────
export interface ArtworkFieldsProps {
  artType: ArtType;
  form: ArtworkForm;
  patch: (p: Partial<ArtworkForm>) => void;
  sf: ChangeHandler;
  venueCoords: { lat: number; lng: number } | null;
  setVenueCoords: (c: { lat: number; lng: number } | null) => void;
  moodboards: Moodboard[];
  linkedMb: string[];
  toggleMb: (id: string) => void;
  /** The images card, which differs between new and edit. */
  images: ReactNode;
  /** Extra controls at the end of the business card (e.g. collection). */
  businessExtra?: ReactNode;
  /** Extra cards at the end of the side column. */
  asideExtra?: ReactNode;
  editionHint?: string;
}

export function ArtworkFields({
  artType, form, patch, sf, venueCoords, setVenueCoords,
  moodboards, linkedMb, toggleMb, images, businessExtra, asideExtra, editionHint,
}: ArtworkFieldsProps) {
  const isPhysical = artType === "physical" || artType === "mixed";
  const isDigital = artType === "digital" || artType === "mixed";
  const isPrint = artType === "print";
  const size = [form.width_cm, form.height_cm, form.depth_cm].filter(Boolean).join(" × ");
  const profit = form.price && form.materials_cost && Number(form.price) > Number(form.materials_cost)
    ? formatPrice(Number(form.price) - Number(form.materials_cost), form.currency)
    : null;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">

      {/* ════ Main column ════ */}
      <div className="flex min-w-0 flex-col gap-5">
        <FormSection title="Details">
          <Field label="Title">
            {p => <Input {...p} value={form.title} onChange={sf("title")} placeholder="Untitled composition" required />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Year">
              {p => <Input {...p} type="number" inputMode="numeric" value={form.year} onChange={sf("year")} placeholder={String(new Date().getFullYear())} min="1000" max="2099" />}
            </Field>
            <Field label="Medium">
              {p => <Input {...p} value={form.medium} onChange={sf("medium")} placeholder={artType === "digital" ? "Digital painting" : "Oil on canvas"} />}
            </Field>
          </div>
          <Field label="Description" hint="Shown on your public pages.">
            {p => <Textarea {...p} rows={4} value={form.description} onChange={sf("description")} placeholder="The technique, the inspiration, the story behind it…" />}
          </Field>
          <Field label="Private notes" hint="Only you see these.">
            {p => <Textarea {...p} rows={2} value={form.notes} onChange={sf("notes")} placeholder="Storage location, reminders…" />}
          </Field>
        </FormSection>

        {isPhysical && (
          <FormSection title="Size and framing" description="In centimetres.">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Width">
                {p => <Input {...p} type="number" inputMode="decimal" min="0" value={form.width_cm} onChange={sf("width_cm")} placeholder="80" />}
              </Field>
              <Field label="Height">
                {p => <Input {...p} type="number" inputMode="decimal" min="0" value={form.height_cm} onChange={sf("height_cm")} placeholder="60" />}
              </Field>
              <Field label="Depth">
                {p => <Input {...p} type="number" inputMode="decimal" min="0" value={form.depth_cm} onChange={sf("depth_cm")} placeholder="2" />}
              </Field>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Checkbox checked={form.framed} onChange={() => patch({ framed: !form.framed })}>The work is framed</Checkbox>
              {(form.width_cm || form.height_cm) && (
                <span className="font-ui text-label tabular-nums text-fg-2">{size} cm</span>
              )}
            </div>
          </FormSection>
        )}

        {isDigital && (
          <FormSection title="Digital file">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="File format">
                {p => (
                  <Select {...p} value={form.file_format} onChange={sf("file_format")}>
                    <option value="">Choose a format</option>
                    {FILE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Resolution">
                {p => <Input {...p} value={form.resolution} onChange={sf("resolution")} placeholder="4000 × 3000 px" />}
              </Field>
            </div>
            <Field label="File link" hint="Optional. For delivery or display.">
              {p => (
                <div className="relative">
                  <Link2 size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
                  <Input {...p} type="url" value={form.digital_file_url} onChange={sf("digital_file_url")} placeholder="https://drive.google.com/…" className="pl-9" />
                </div>
              )}
            </Field>
          </FormSection>
        )}

        {isPrint && (
          <FormSection title="Edition" description={editionHint ?? "Each print gets its own code, made from its number and the size of the run."}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number of this print">
                {p => <Input {...p} type="number" inputMode="numeric" min="1" value={form.edition_number} onChange={sf("edition_number")} placeholder="1" />}
              </Field>
              <Field label="Prints in the run">
                {p => <Input {...p} type="number" inputMode="numeric" min="1" value={form.edition_total} onChange={sf("edition_total")} placeholder="50" />}
              </Field>
            </div>
            <Field label="Edition code" hint="Filled in for you. Type to use your own.">
              {p => (
                <div className="relative">
                  <Hash size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-3" />
                  <Input {...p} value={form.edition_code} onChange={sf("edition_code")} placeholder="AM-001/050" className="pl-9 font-code tracking-[0.04em]" />
                </div>
              )}
            </Field>
          </FormSection>
        )}

        <FormSection title="Authenticity">
          <OptionList legend="This work is" options={AUTH_TYPES} value={form.authentication_status}
            onSelect={k => patch({ authentication_status: k })} />
        </FormSection>

        <FormSection title="Location" description="Where the work is now: a studio, gallery or museum.">
          <div className="flex flex-col gap-2">
            <PlacesAutocomplete
              value={form.venue_location || form.location_name}
              placeholder="Gallery, studio, museum…"
              onChange={(result, raw) => {
                patch({ venue_location: raw, location_name: raw });
                if (result) setVenueCoords({ lat: result.lat, lng: result.lng });
                else setVenueCoords(null);
              }}
            />
            {venueCoords && (
              <p className="inline-flex items-center gap-1.5 font-ui text-caption font-medium text-ok">
                <MapPin size={13} aria-hidden /> Pinned. It will show on the art map.
              </p>
            )}
          </div>
        </FormSection>

        <FormSection title="Business" description="Private. Helps you price your work.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Materials cost">
              {p => <Input {...p} type="number" inputMode="decimal" min="0" value={form.materials_cost} onChange={sf("materials_cost")} placeholder="0" />}
            </Field>
            <Field label="Time spent" hint="In hours.">
              {p => <Input {...p} type="number" inputMode="decimal" min="0" value={form.time_spent} onChange={sf("time_spent")} placeholder="0" />}
            </Field>
          </div>
          {profit && (
            <div className="flex items-center justify-between gap-3 rounded-control bg-sunken px-4 py-3">
              <span className="font-ui text-body-sm text-fg-2">Estimated profit</span>
              <span className="font-ui text-body font-semibold tabular-nums text-ok">{profit}</span>
            </div>
          )}
          {businessExtra}
        </FormSection>
      </div>

      {/* ════ Side column ════ */}
      <div className="flex min-w-0 flex-col gap-5">
        {images}

        <FormSection title="Stage and sale">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 font-ui text-label font-semibold text-fg">Stage</legend>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(s => (
                <Chip key={s.key} selected={form.status === s.key} onClick={() => patch({ status: s.key })}>{s.label}</Chip>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-[minmax(0,1fr)_104px] gap-3">
            <Field label="Price">
              {p => <Input {...p} type="number" inputMode="decimal" min="0" value={form.price} onChange={sf("price")} placeholder="0" />}
            </Field>
            <Field label="Currency">
              {p => (
                <Select {...p} value={form.currency} onChange={sf("currency")}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </Select>
              )}
            </Field>
          </div>
          <OptionList legend="How it sells" options={SALE_METHODS} value={form.sale_method}
            onSelect={k => patch({ sale_method: form.sale_method === k ? "" : k })} />
          <div className="flex flex-col gap-3 border-t-hair border-line pt-4">
            <div className="flex items-start justify-between gap-4">
              <span className="flex flex-col">
                <span className="font-ui text-label font-semibold text-fg">Open to a wall</span>
                <span className="font-ui text-caption text-fg-3">You&apos;d show it in a café or venue. Venues near you can see it.</span>
              </span>
              <Switch checked={!!form.wall_terms} onChange={v => patch({ wall_terms: v ? "either" : "" })} label="Open to a wall" />
            </div>
            {form.wall_terms && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="On the wall it can be">
                {WALL_TERMS.map(t => <Chip key={t.key} selected={form.wall_terms === t.key} onClick={() => patch({ wall_terms: t.key })}>{t.label}</Chip>)}
              </div>
            )}
          </div>
        </FormSection>

        <MoodboardPicker moodboards={moodboards} linked={linkedMb} onToggle={toggleMb} />

        {asideExtra}
      </div>
    </div>
  );
}

/** Thin progress line shown while images upload. */
export function UploadProgress({ pct }: { pct: number }) {
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Uploading"
      className="h-1 overflow-hidden rounded-pill bg-n-100">
      <div className="h-full bg-ink transition-[width] duration-base ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
