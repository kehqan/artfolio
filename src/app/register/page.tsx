"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Alert, Button, Chip, Field, Input, Label, PasswordInput, Select, Textarea, cn,
} from "@/components/ui";
import { AuthLink, AuthShell } from "@/components/auth/AuthShell";

type Role = "artist" | "venue";
type Step = "role" | "art" | "account";

const MEDIUMS = ["Oil painting", "Acrylic", "Watercolor", "Photography", "Sculpture", "Digital art", "Printmaking", "Drawing", "Ceramics", "Installation", "Video", "Mixed media", "Textile", "Performance"];
const STYLES = ["Abstract", "Realism", "Contemporary", "Minimalist", "Expressionism", "Surrealism", "Conceptual", "Street art", "Portrait", "Landscape", "Figurative", "Geometric"];
const VENUE_TYPES = ["Gallery", "Café", "Restaurant", "Hotel", "Office", "Cultural center", "Studio", "Pop-up space", "Museum", "Theater"];
const ART_STYLES = ["Abstract", "Realism", "Contemporary", "Minimalist", "Photography", "Illustration", "Sculpture", "Mixed media", "Any style"];
const YEARS = ["Less than 1 year", "1–3 years", "3–5 years", "5–10 years", "10–20 years", "20+ years"];

const ROLES: { key: Role; title: string; line: string; points: string[]; Icon: typeof Palette }[] = [
  {
    key: "artist", title: "I’m an artist", line: "Manage, show and sell your work.", Icon: Palette,
    points: ["Your works, with photos, prices and history", "A public page and storefront", "Sales, collectors and contracts", "Venues and open calls to show at"],
  },
  {
    key: "venue", title: "I run a venue", line: "Find artists and fill your walls.", Icon: Building2,
    points: ["Browse artists near you", "Plan and publish exhibitions", "Post open calls and collabs", "Manage events"],
  },
];

function StepBar({ step }: { step: Step }) {
  const steps: Step[] = ["role", "art", "account"];
  const idx = steps.indexOf(step);
  return (
    <div className="mb-6 flex flex-col gap-2">
      <span className="font-ui text-caption font-semibold text-fg-3">Step {idx + 1} of 3</span>
      <div className="flex gap-1.5" aria-hidden>
        {steps.map((s, i) => (
          <span key={s} className={cn("h-1.5 flex-1 rounded-pill", i <= idx ? "bg-ink" : "bg-n-200")} />
        ))}
      </div>
    </div>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="mb-4 inline-flex items-center gap-1.5 font-ui text-label font-semibold text-fg-3 hover:text-fg">
      <ArrowLeft size={14} aria-hidden /> {children}
    </button>
  );
}

function ChipGroup({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-ui text-label font-semibold text-fg">
        {label}{required && <span className="text-bad"> *</span>}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint && <p className="font-ui text-caption text-fg-3">{hint}</p>}
    </fieldset>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  // artist
  const [mediums, setMediums] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [years, setYears] = useState("");
  const [city, setCity] = useState("");
  const [cityCoords, setCityCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ig, setIg] = useState("");
  const [bio, setBio] = useState("");
  // venue
  const [vName, setVName] = useState("");
  const [vType, setVType] = useState("");
  const [vStyles, setVStyles] = useState<string[]>([]);
  const [vCity, setVCity] = useState("");
  const [vCityCoords, setVCityCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [vIg, setVIg] = useState("");
  // account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function tog(arr: string[], set: (v: string[]) => void, val: string) {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  }
  function canArt() { return role === "artist" ? mediums.length > 0 : vName.trim() !== "" && vType !== ""; }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!role) return;
    setLoading(true); setErr("");
    try {
      const sb = createClient();
      const { data, error: e2 } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: name, role } } });
      if (e2) { setErr(e2.message); setLoading(false); return; }
      if (data.user) {
        const p: Record<string, unknown> = { id: data.user.id, full_name: name, email, role, onboarding_done: true };
        if (role === "artist") { p.mediums = mediums; p.style_tags = styles; p.years_active = years; p.location = city; p.lat = cityCoords?.lat || null; p.lng = cityCoords?.lng || null; p.instagram = ig; p.bio = bio; }
        await sb.from("profiles").upsert(p);
        router.push("/dashboard");
      }
    } catch { setErr("Something went wrong. Please try again."); setLoading(false); }
  }

  const signIn = <>Already have an account? <AuthLink href="/login">Sign in</AuthLink></>;

  // ── STEP 1: role ──
  if (step === "role") return (
    <AuthShell title="Join Artomango" description="Pick the one that fits. It shapes what you see first." footer={signIn} width="md" before={<StepBar step={step} />}>
      <div className="grid gap-4 sm:grid-cols-2">
        {ROLES.map(({ key, title, line, points, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setRole(key); setStep("art"); }}
            className={cn(
              "group flex flex-col gap-4 rounded-card border-hair border-line bg-surface p-5 text-left",
              "transition-[transform,box-shadow,border-color] duration-base ease-out",
              "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-2",
              "focus-visible:border-ink focus-visible:outline-none focus-visible:shadow-hard-2",
            )}
          >
            <span className="grid h-10 w-10 place-items-center rounded-control bg-sunken text-fg transition-colors duration-fast group-hover:bg-mango">
              <Icon size={20} aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-display text-h3 text-fg">{title}</span>
              <span className="font-ui text-body-sm text-fg-2">{line}</span>
            </span>
            <ul className="flex flex-col gap-1.5 border-t-hair border-line pt-4">
              {points.map(p => (
                <li key={p} className="flex items-start gap-2 font-ui text-body-sm text-fg-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-fg-3" />{p}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </AuthShell>
  );

  // ── STEP 2: about the art / venue ──
  if (step === "art" && role) return (
    <AuthShell
      title={role === "artist" ? "Tell us about your work" : "Tell us about your venue"}
      description={role === "artist"
        ? "This helps venues and collectors find you. You can change all of it later."
        : "This helps artists understand what you’re looking for. You can change all of it later."}
      footer={signIn}
      width="md"
      before={<><BackButton onClick={() => setStep("role")}>Change role</BackButton><StepBar step={step} /></>}
    >
      <div className="flex flex-col gap-6">
        {role === "artist" ? (
          <>
            <ChipGroup label="What do you work in?" required hint="Pick all that apply.">
              {MEDIUMS.map(m => <Chip key={m} selected={mediums.includes(m)} onClick={() => tog(mediums, setMediums, m)}>{m}</Chip>)}
            </ChipGroup>
            <ChipGroup label="How would you describe your style?">
              {STYLES.map(s => <Chip key={s} selected={styles.includes(s)} onClick={() => tog(styles, setStyles, s)}>{s}</Chip>)}
            </ChipGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Years making art">
                {(p) => (
                  <Select {...p} value={years} onChange={e => setYears(e.target.value)}>
                    <option value="">Choose one</option>
                    {YEARS.map(y => <option key={y}>{y}</option>)}
                  </Select>
                )}
              </Field>
              <Field label="Instagram">
                {(p) => <Input {...p} placeholder="@yourhandle" value={ig} onChange={e => setIg(e.target.value)} />}
              </Field>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Where are you based?</Label>
              <PlacesAutocomplete
                value={city}
                placeholder="Search your city or studio"
                onChange={(result, raw) => { setCity(raw); setCityCoords(result ? { lat: result.lat, lng: result.lng } : null); }}
              />
            </div>
            <Field label="Short bio" hint="Shown on your public page.">
              {(p) => <Textarea {...p} rows={3} placeholder="A few lines about your work and practice" value={bio} onChange={e => setBio(e.target.value)} />}
            </Field>
          </>
        ) : (
          <>
            <Field label="Venue name">
              {(p) => <Input {...p} required placeholder="e.g. Galerie Nord" value={vName} onChange={e => setVName(e.target.value)} />}
            </Field>
            <ChipGroup label="What kind of place is it?" required>
              {VENUE_TYPES.map(t => <Chip key={t} selected={vType === t} onClick={() => setVType(t)}>{t}</Chip>)}
            </ChipGroup>
            <ChipGroup label="What kind of art are you looking for?">
              {ART_STYLES.map(s => <Chip key={s} selected={vStyles.includes(s)} onClick={() => tog(vStyles, setVStyles, s)}>{s}</Chip>)}
            </ChipGroup>
            <div className="flex flex-col gap-1.5">
              <Label>Where is it?</Label>
              <PlacesAutocomplete
                value={vCity}
                placeholder="Search your venue’s address"
                onChange={(result, raw) => { setVCity(raw); setVCityCoords(result ? { lat: result.lat, lng: result.lng } : null); }}
              />
            </div>
            <Field label="Instagram">
              {(p) => <Input {...p} placeholder="@yourvenue" value={vIg} onChange={e => setVIg(e.target.value)} />}
            </Field>
          </>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" onClick={() => setStep("account")}>Skip for now</Button>
          <Button variant="primary" disabled={!canArt()} onClick={() => setStep("account")}>Continue</Button>
        </div>
      </div>
    </AuthShell>
  );

  // ── STEP 3: account ──
  return (
    <AuthShell
      title="Create your account"
      description={`Last step. You’re joining as ${role === "venue" ? "a venue" : "an artist"}. It’s free.`}
      footer={
        <div className="flex flex-col gap-3">
          <span>{signIn}</span>
          <span className="font-ui text-caption text-fg-3">By creating an account you agree to the Terms of Service and Privacy Policy.</span>
        </div>
      }
      before={<><BackButton onClick={() => setStep("art")}>Back</BackButton><StepBar step="account" /></>}
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        {err && <Alert tone="bad">{err}</Alert>}
        <Field label={role === "venue" ? "Your name" : "Full name"} hint={role === "venue" ? "The person running the account." : "As you sign your work."}>
          {(p) => <Input {...p} required autoFocus autoComplete="name" value={name} onChange={e => setName(e.target.value)} />}
        </Field>
        <Field label="Email">
          {(p) => <Input {...p} type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          {(p) => <PasswordInput {...p} required minLength={8} autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} />}
        </Field>
        <Button type="submit" variant="primary" disabled={loading} className="mt-2 w-full">
          {loading ? "Creating your account…" : role === "venue" ? "Create venue account" : "Create artist account"}
        </Button>
      </form>
    </AuthShell>
  );
}
