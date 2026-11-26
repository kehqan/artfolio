"use client";
// Write a new agreement: pick the kind, fill in the terms, add the other
// side, then save a draft or send it for signature.
import { forFilter } from "@/lib/validate";
import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, FileText, Handshake, ImageIcon, Palette, Plus, Search, Send, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Avatar, Badge, Button, ButtonLink, Card, Field, Input, Select, Skeleton, Switch, Textarea, cn } from "@/components/ui";
import { formatPrice } from "@/components/public/PublicChrome";

type ContractType = "exhibition" | "collaboration" | "commission" | "general";
type Party = { id?: string; name: string; email: string; role: string; avatar_url?: string; username?: string; isExternal?: boolean };
type Artwork = { id: string; title: string; images?: string[]; medium?: string; price?: number; currency?: string | null; status: string };

const CONTRACT_TYPES: { key: ContractType; label: string; short: string; desc: string; who: string; icon: LucideIcon }[] = [
  { key: "exhibition", label: "Exhibition agreement", short: "Exhibition", icon: ImageIcon, who: "Artist and venue",
    desc: "You show work at a venue. Dates, commission, insurance and transport." },
  { key: "collaboration", label: "Collaboration agreement", short: "Collaboration", icon: Handshake, who: "Artist and artist",
    desc: "Two of you make something together. Credit, ownership and how money is split." },
  { key: "commission", label: "Commission agreement", short: "Commission", icon: Palette, who: "Artist and buyer or venue",
    desc: "You make a work on request. What it is, the fee, the deposit and delivery." },
  { key: "general", label: "General agreement", short: "Partnership", icon: FileText, who: "Anyone",
    desc: "Anything else. Write what you agreed in plain words." },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card padding="lg">
      <h2 className="mb-4 font-display text-h3 text-fg">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </Card>
  );
}
const Two = ({ children }: { children: React.ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;

// ── Who you're agreeing with ───────────────────────────────────────
function PartyPicker({ value, onChange, myId }: { value: Party | null; onChange: (p: Party | null) => void; myId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showExt, setShowExt] = useState(false);
  const [ext, setExt] = useState({ name: "", email: "", role: "artist" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0);

  function handleQuery(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const clean = forFilter(q);
    if (!clean) { searchSeq.current++; setResults([]); return; }
    // Waits until typing pauses, and drops answers to older searches.
    const ticket = ++searchSeq.current;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await createClient().from("profiles")
        .select("id,full_name,username,role,avatar_url")
        .neq("id", myId)
        .or(`full_name.ilike.%${clean}%,username.ilike.%${clean}%`)
        .limit(6);
      if (ticket !== searchSeq.current) return;
      setResults(data || []);
      setSearching(false);
    }, 300);
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-control border-hair border-line bg-sunken px-3 py-2.5">
        <Avatar name={value.name} src={value.avatar_url} size="sm" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-ui text-label font-semibold text-fg">{value.name}</span>
          <span className="truncate font-ui text-caption capitalize text-fg-3">
            {value.role === "gallery" ? "venue" : value.role}{value.isExternal ? " · not on Artomango" : ""}{value.email ? <span className="normal-case"> · {value.email}</span> : null}
          </span>
        </span>
        <button type="button" aria-label="Change the other side" onClick={() => onChange(null)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-pill text-fg-3 hover:bg-surface hover:text-fg">
          <X size={15} aria-hidden />
        </button>
      </div>
    );
  }

  if (showExt) {
    return (
      <div className="flex flex-col gap-3 rounded-control border-hair border-line bg-sunken p-3">
        <p className="font-ui text-label font-semibold text-fg">Someone not on Artomango</p>
        <Field label="Name">{p => <Input {...p} value={ext.name} onChange={e => setExt(x => ({ ...x, name: e.target.value }))} />}</Field>
        <Field label="Email" hint="We email them the signing link when you send it. Leave it empty to send the link yourself.">
          {p => <Input {...p} type="email" value={ext.email} onChange={e => setExt(x => ({ ...x, email: e.target.value }))} />}
        </Field>
        <Field label="They are">
          {p => (
            <Select {...p} value={ext.role} onChange={e => setExt(x => ({ ...x, role: e.target.value }))}>
              <option value="artist">An artist</option>
              <option value="venue">A venue or gallery</option>
              <option value="collector">A collector</option>
              <option value="other">Someone else</option>
            </Select>
          )}
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowExt(false)}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={!ext.name.trim()}
            onClick={() => { onChange({ name: ext.name.trim(), email: ext.email.trim(), role: ext.role, isExternal: true }); setShowExt(false); setExt({ name: "", email: "", role: "artist" }); }}>
            Add them
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-10 items-center gap-2 rounded-control border-hair border-line-strong bg-surface px-3 focus-within:border-ink focus-within:shadow-hard-1">
        <Search size={16} aria-hidden className="text-fg-3" />
        <input value={query} onChange={e => handleQuery(e.target.value)} aria-label="Search people on Artomango" placeholder="Search people on Artomango"
          className="flex-1 bg-transparent font-ui text-control text-fg outline-none placeholder:text-fg-3" />
        {searching && <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-ink" />}
      </div>
      {results.length > 0 && (
        <ul className="overflow-hidden rounded-control border-outline border-ink bg-surface shadow-hard-2">
          {results.map(u => (
            <li key={u.id}>
              <button type="button" onClick={() => { onChange({ id: u.id, name: u.full_name, email: "", role: u.role || "artist", avatar_url: u.avatar_url, username: u.username }); setQuery(""); setResults([]); }}
                className="flex w-full items-center gap-3 border-b-hair border-line px-3 py-2.5 text-left last:border-b-0 hover:bg-sunken">
                <Avatar name={u.full_name || "?"} src={u.avatar_url} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-ui text-label font-semibold text-fg">{u.full_name}</span>
                  <span className="truncate font-ui text-caption text-fg-3">{u.username ? `@${u.username}` : u.role}</span>
                </span>
                <ChevronRight size={15} aria-hidden className="text-fg-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim() && !searching && results.length === 0 && <p className="font-ui text-caption text-fg-3">No one by that name on Artomango.</p>}
      <button type="button" onClick={() => setShowExt(true)}
        className="inline-flex w-fit items-center gap-1.5 font-ui text-label font-semibold text-fg-2 hover:text-fg hover:underline hover:underline-offset-4">
        <Plus size={15} aria-hidden /> They&apos;re not on Artomango
      </button>
    </div>
  );
}

// ── Works this agreement covers ────────────────────────────────────
function ArtworkPicker({ artworks, selected, onChange }: { artworks: Artwork[]; selected: string[]; onChange: (ids: string[]) => void }) {
  if (artworks.length === 0) return <p className="font-ui text-body-sm text-fg-3">You haven&apos;t added any works yet.</p>;
  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {artworks.map(aw => {
        const on = selected.includes(aw.id);
        const img = Array.isArray(aw.images) ? aw.images[0] : null;
        return (
          <li key={aw.id}>
            <button type="button" aria-pressed={on} onClick={() => onChange(on ? selected.filter(x => x !== aw.id) : [...selected, aw.id])}
              className={cn("flex w-full items-center gap-3 rounded-control border-outline px-2.5 py-2 text-left transition-colors duration-fast",
                on ? "border-ink bg-mango-soft" : "border-line hover:border-line-strong")}>
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-chip bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {img ? <img loading="lazy" decoding="async" src={img} alt="" className="h-full w-full object-contain" /> : <ImageIcon size={15} aria-hidden className="text-fg-3" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-ui text-label font-semibold text-fg">{aw.title}</span>
                <span className="truncate font-ui text-caption text-fg-3">{[aw.medium, aw.price ? formatPrice(Number(aw.price), aw.currency || "EUR") : null].filter(Boolean).join(" · ") || "No details"}</span>
              </span>
              <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full border-outline", on ? "border-ink bg-ink text-on-inverse" : "border-line-strong")}>
                {on && <Check size={12} strokeWidth={3} aria-hidden />}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function NewContractInner() {
  const router = useRouter();
  const params = useSearchParams();
  const preTypeRaw = params.get("type");
  const preType = CONTRACT_TYPES.some(t => t.key === preTypeRaw) ? (preTypeRaw as ContractType) : null;

  const [step, setStep] = useState<"type" | "form">(preType ? "form" : "type");
  const [cType, setCType] = useState<ContractType>(preType || "exhibition");
  const [myId, setMyId] = useState("");
  const [myName, setMyName] = useState("");
  const [myRole, setMyRole] = useState("artist");
  const [myEmail, setMyEmail] = useState("");
  const [counterparty, setCounterparty] = useState<Party | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [linkedArtworks, setLinkedArtworks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [form, setForm] = useState({
    title: "", description: "", special_conditions: "", venue_name: "", venue_address: "", start_date: "", end_date: "",
    // Exhibition
    commission_pct: "", artwork_insurance: false, insurance_value: "", installation_date: "", deinstallation_date: "",
    opening_event_date: "", transport_by: "artist", unsold_return_by: "",
    // Collaboration
    ip_split: "50/50", credit_line: "", revenue_split: "", deliverables: "",
    // Commission
    commission_fee: "", deposit_pct: "30", deposit_due_date: "", final_payment_date: "", artwork_specs: "",
    revision_rounds: "2", delivery_method: "pickup",
    // General
    agreed_terms: "",
  });

  const sf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMyId(user.id);
      setMyEmail(user.email || "");
      const [{ data: prof }, { data: aws }] = await Promise.all([
        sb.from("profiles").select("full_name,role").eq("id", user.id).single(),
        sb.from("artworks").select("id,title,images,medium,price,currency,status").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setMyName(prof?.full_name || "");
      setMyRole(prof?.role || "artist");
      setArtworks(aws || []);
    });
  }, []);

  // Suggest a title once the kind and the other side are known.
  useEffect(() => {
    if (!form.title && counterparty?.name) {
      const t = CONTRACT_TYPES.find(x => x.key === cType);
      setForm(p => ({ ...p, title: `${t?.short} with ${counterparty.name}` }));
    }
  }, [counterparty, cType]);

  const showArtworks = cType === "exhibition" || cType === "commission";
  const typeCfg = CONTRACT_TYPES.find(t => t.key === cType)!;

  async function handleSave(sendNow: boolean) {
    const errs: string[] = [];
    if (!form.title.trim()) errs.push("Give the agreement a title.");
    if (!counterparty) errs.push("Add who you're agreeing with.");
    if (errs.length) { setErrors(errs); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    setErrors([]); setSaving(true);

    const sb = createClient();
    const numOrNull = (v: string) => v.trim() === "" ? null : Number(v);

    // Someone not on Artomango signs with a secret link.
    const token = !counterparty!.id
      ? `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "")
      : null;

    const payload: Record<string, unknown> = {
      contract_type:        cType,
      status:               sendNow ? "sent" : "draft",
      title:                form.title.trim(),
      initiator_id:         myId,
      initiator_role:       myRole,
      initiator_name:       myName,
      initiator_email:      myEmail,
      counterparty_id:      counterparty!.id || null,
      counterparty_role:    counterparty!.role,
      counterparty_name:    counterparty!.name,
      counterparty_email:   counterparty!.email || null,
      counterparty_token:   token,
      description:          form.description  || null,
      special_conditions:   form.special_conditions || null,
      venue_name:           form.venue_name   || null,
      venue_address:        form.venue_address || null,
      start_date:           form.start_date   || null,
      end_date:             form.end_date     || null,
    };

    // Type-specific fields
    if (cType === "exhibition") {
      Object.assign(payload, {
        commission_pct:      numOrNull(form.commission_pct),
        artwork_insurance:   form.artwork_insurance,
        insurance_value:     numOrNull(form.insurance_value),
        installation_date:   form.installation_date   || null,
        deinstallation_date: form.deinstallation_date || null,
        opening_event_date:  form.opening_event_date  || null,
        transport_by:        form.transport_by         || null,
        unsold_return_by:    form.unsold_return_by     || null,
      });
    } else if (cType === "collaboration") {
      Object.assign(payload, {
        ip_split:     form.ip_split    || null,
        credit_line:  form.credit_line || null,
        revenue_split: form.revenue_split || null,
        deliverables: form.deliverables  || null,
      });
    } else if (cType === "commission") {
      Object.assign(payload, {
        commission_fee:     numOrNull(form.commission_fee),
        deposit_pct:        numOrNull(form.deposit_pct),
        deposit_due_date:   form.deposit_due_date   || null,
        final_payment_date: form.final_payment_date || null,
        artwork_specs:      form.artwork_specs       || null,
        revision_rounds:    numOrNull(form.revision_rounds),
        delivery_method:    form.delivery_method     || null,
      });
    } else {
      payload.agreed_terms = form.agreed_terms || null;
    }

    const { data: contract, error } = await sb.from("contracts").insert(payload).select().single();
    if (error || !contract) { setSaving(false); setErrors(["That didn't save. Please try again."]); return; }

    // Link artworks
    if (linkedArtworks.length > 0) {
      await sb.from("contract_artworks").insert(
        linkedArtworks.map(aid => ({ contract_id: contract.id, artwork_id: aid }))
      );
    }

    setSaving(false);
    router.push(`/dashboard/contracts/${contract.id}`);
  }

  // ── Step 1: what kind of agreement ──
  if (step === "type") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex items-start gap-3">
          <ButtonLink href="/dashboard/contracts" variant="ghost" size="sm" aria-label="Back to papers" className="mt-1"><ArrowLeft size={16} aria-hidden /></ButtonLink>
          <div>
            <h1 className="font-display text-h1 text-fg">New agreement</h1>
            <p className="mt-1 font-ui text-body text-fg-2">What kind of agreement is it?</p>
          </div>
        </div>
        <ul className="flex flex-col gap-3">
          {CONTRACT_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <li key={t.key}>
                <button type="button" onClick={() => { setCType(t.key); setStep("form"); }}
                  className="flex w-full items-center gap-4 rounded-card border-outline border-ink bg-surface p-4 text-left shadow-hard-1 transition-[transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:shadow-hard-2 sm:p-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-control border-outline border-ink bg-mango text-on-mango"><Icon size={20} aria-hidden /></span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-ui text-body font-semibold text-fg">{t.label}</span>
                    <span className="font-ui text-body-sm text-fg-2">{t.desc}</span>
                    <span className="font-ui text-caption text-fg-3">{t.who}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden className="shrink-0 text-fg-3" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const steps = [
    counterparty?.id ? `${counterparty.name} sees it in their Papers and gets an email.` : counterparty?.email ? `We email ${counterparty.name} a link to read and sign. No account needed.` : "You get a signing link to send them yourself.",
    "You both read it and sign by typing your full name.",
    "Once you've both signed, it's sealed and kept here.",
    "The key dates go into both of your planners.",
    showArtworks && linkedArtworks.length > 0 ? `The ${linkedArtworks.length === 1 ? "work is" : `${linkedArtworks.length} works are`} noted in ${linkedArtworks.length === 1 ? "its" : "their"} passport.` : null,
  ].filter(Boolean) as string[];

  // ── Step 2: the terms ──
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="ghost" size="sm" aria-label="Pick another kind" onClick={() => setStep("type")} className="mt-1"><ArrowLeft size={16} aria-hidden /></Button>
          <div className="min-w-0">
            <Badge tone="neutral">{typeCfg.label}</Badge>
            <h1 className="mt-1 truncate font-display text-h2 text-fg">{form.title || "New agreement"}</h1>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving}>Save draft</Button>
          <Button variant="primary" onClick={() => handleSave(true)} disabled={saving}>
            <Send size={15} aria-hidden /> {saving ? "Saving…" : "Send for signature"}
          </Button>
        </div>
      </div>

      {errors.length > 0 && <Alert tone="bad">{errors.join(" ")}</Alert>}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Section title="The basics">
            <Field label="Title">{p => <Input {...p} value={form.title} onChange={sf("title")} placeholder={`${typeCfg.short} with …`} />}</Field>
            <Field label="What it's about" hint="Optional. One or two plain sentences.">
              {p => <Textarea {...p} rows={2} value={form.description} onChange={sf("description")} />}
            </Field>
            <Two>
              <Field label="Starts">{p => <Input {...p} type="date" value={form.start_date} onChange={sf("start_date")} />}</Field>
              <Field label="Ends">{p => <Input {...p} type="date" value={form.end_date} onChange={sf("end_date")} />}</Field>
            </Two>
            {showArtworks && (
              <Two>
                <Field label="Venue or place" hint="Optional">{p => <Input {...p} value={form.venue_name} onChange={sf("venue_name")} placeholder="Gallery, studio…" />}</Field>
                <Field label="Address" hint="Optional">{p => <Input {...p} value={form.venue_address} onChange={sf("venue_address")} />}</Field>
              </Two>
            )}
          </Section>

          {cType === "exhibition" && (
            <Section title="The show">
              <Two>
                <Field label="Venue's commission %">{p => <Input {...p} type="number" min={0} max={100} inputMode="decimal" value={form.commission_pct} onChange={sf("commission_pct")} placeholder="40" />}</Field>
                <Field label="Who arranges transport">
                  {p => (
                    <Select {...p} value={form.transport_by} onChange={sf("transport_by")}>
                      <option value="artist">The artist</option>
                      <option value="venue">The venue</option>
                      <option value="shared">Shared, cost split</option>
                    </Select>
                  )}
                </Field>
              </Two>
              <div className="flex items-center justify-between gap-4">
                <span className="font-ui text-body-sm font-semibold text-fg">The venue insures the works</span>
                <Switch checked={form.artwork_insurance} onChange={v => setForm(p => ({ ...p, artwork_insurance: v }))} label="The venue insures the works" />
              </div>
              {form.artwork_insurance && (
                <Field label="Insured value (€)">{p => <Input {...p} type="number" min={0} inputMode="decimal" value={form.insurance_value} onChange={sf("insurance_value")} />}</Field>
              )}
              <Two>
                <Field label="Hanging">{p => <Input {...p} type="date" value={form.installation_date} onChange={sf("installation_date")} />}</Field>
                <Field label="Opening">{p => <Input {...p} type="date" value={form.opening_event_date} onChange={sf("opening_event_date")} />}</Field>
                <Field label="Taking down">{p => <Input {...p} type="date" value={form.deinstallation_date} onChange={sf("deinstallation_date")} />}</Field>
                <Field label="Unsold works back by">{p => <Input {...p} type="date" value={form.unsold_return_by} onChange={sf("unsold_return_by")} />}</Field>
              </Two>
            </Section>
          )}

          {cType === "collaboration" && (
            <Section title="Working together">
              <Field label="Who owns the work">
                {p => (
                  <Select {...p} value={form.ip_split} onChange={sf("ip_split")}>
                    <option value="50/50">Both of you, equally</option>
                    <option value="initiator">You</option>
                    <option value="counterparty">The other side</option>
                    <option value="custom">Something else (explain below)</option>
                  </Select>
                )}
              </Field>
              <Field label="How money is split">{p => <Input {...p} value={form.revenue_split} onChange={sf("revenue_split")} placeholder="50/50, or 60% artist and 40% venue" />}</Field>
              <Field label="Credit line">{p => <Input {...p} value={form.credit_line} onChange={sf("credit_line")} placeholder="A and B in collaboration" />}</Field>
              <Field label="Who delivers what" hint="Optional">{p => <Textarea {...p} rows={2} value={form.deliverables} onChange={sf("deliverables")} />}</Field>
            </Section>
          )}

          {cType === "commission" && (
            <Section title="The commission">
              <Two>
                <Field label="Fee (€)">{p => <Input {...p} type="number" min={0} inputMode="decimal" value={form.commission_fee} onChange={sf("commission_fee")} />}</Field>
                <Field label="Deposit %">{p => <Input {...p} type="number" min={0} max={100} inputMode="decimal" value={form.deposit_pct} onChange={sf("deposit_pct")} />}</Field>
                <Field label="Deposit due">{p => <Input {...p} type="date" value={form.deposit_due_date} onChange={sf("deposit_due_date")} />}</Field>
                <Field label="Rest due">{p => <Input {...p} type="date" value={form.final_payment_date} onChange={sf("final_payment_date")} />}</Field>
              </Two>
              <Field label="The work" hint="Size, medium, subject, references.">{p => <Textarea {...p} rows={3} value={form.artwork_specs} onChange={sf("artwork_specs")} />}</Field>
              <Two>
                <Field label="Rounds of changes">
                  {p => (
                    <Select {...p} value={form.revision_rounds} onChange={sf("revision_rounds")}>
                      {["1", "2", "3", "5"].map(v => <option key={v} value={v}>{v === "1" ? "1 round" : `${v} rounds`}</option>)}
                    </Select>
                  )}
                </Field>
                <Field label="Delivery">
                  {p => (
                    <Select {...p} value={form.delivery_method} onChange={sf("delivery_method")}>
                      <option value="pickup">Picked up in person</option>
                      <option value="shipping">Shipped by the artist</option>
                      <option value="digital">Digital</option>
                      <option value="venue">Collected by the venue</option>
                    </Select>
                  )}
                </Field>
              </Two>
            </Section>
          )}

          {cType === "general" && (
            <Section title="What you agreed">
              <Field label="In your own words" hint="No legal language needed. Be clear about what each of you commits to.">
                {p => <Textarea {...p} rows={6} value={form.agreed_terms} onChange={sf("agreed_terms")} />}
              </Field>
            </Section>
          )}

          <Section title="Anything else">
            <Field label="Extra terms" hint="Optional. Exceptions or details you both agreed on.">
              {p => <Textarea {...p} rows={3} value={form.special_conditions} onChange={sf("special_conditions")} />}
            </Field>
          </Section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--shell-header)+2rem)]">
          <Section title="Between">
            <div className="flex items-center gap-3 rounded-control border-hair border-line px-3 py-2.5">
              {myName ? <Avatar name={myName} size="sm" /> : <Skeleton className="h-8 w-8 rounded-full" />}
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-ui text-label font-semibold text-fg">{myName || "You"}</span>
                <span className="font-ui text-caption text-fg-3">You</span>
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-ui text-label font-semibold text-fg">And</span>
              <PartyPicker value={counterparty} onChange={setCounterparty} myId={myId} />
            </div>
          </Section>

          {showArtworks && (
            <Section title={linkedArtworks.length ? `Works (${linkedArtworks.length})` : "Works"}>
              <ArtworkPicker artworks={artworks} selected={linkedArtworks} onChange={setLinkedArtworks} />
            </Section>
          )}

          <Card padding="lg" className="bg-sunken">
            <h2 className="mb-3 font-ui text-label font-semibold text-fg">When you send it</h2>
            <ol className="flex flex-col gap-2">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 font-ui text-body-sm text-fg-2">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink font-ui text-caption font-bold text-on-inverse">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewContractPage() {
  return (
    <Suspense fallback={<div className="flex flex-col gap-3"><Skeleton className="h-10 w-1/2 rounded-control" /><Skeleton className="h-64 rounded-card" /></div>}>
      <NewContractInner />
    </Suspense>
  );
}
