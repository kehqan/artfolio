"use client";
// Start a project, one question at a time. A project is an exhibition, an
// event or show, or a collection that a curator gathers art for.
//
//   1. What are you putting together?   (one tap)
//   2. What's it called?                 (saved here, so nothing is lost)
//   3. When is it?                       · I don't know yet
//   4. Where?                            · Online · I don't know yet
//   5. What's it about?                  · Skip
//   6. What are you looking for?         · Skip
//   7. A cover image                     · I'll add one later
//   8. Open it to artists?               (one tap: shows in Scene, or invite only)
//   9. Done: invite your first artist
//
// /dashboard/projects/new?id=<id>&step=<step> asks just that one question
// again for a saved project, then goes back to the project page.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { Alert, Button, ButtonLink, Chip, Input, Textarea, cn } from "@/components/ui";
import { uploadImage } from "@/lib/venue";
import {
  type LookingFor, type Project, type ProjectDeal, type ProjectKind,
  DEAL_LABEL, KIND_LABEL, PROJECT_COLS, dateLine, placeLine, projectHref,
} from "@/lib/projects";

type Step = "kind" | "title" | "when" | "where" | "about" | "looking" | "cover" | "open" | "done";
const STEPS: Step[] = ["kind", "title", "when", "where", "about", "looking", "cover", "open", "done"];
const QUESTIONS = STEPS.length - 1;

const MEDIUMS = ["Painting", "Drawing", "Photography", "Sculpture", "Print", "Digital", "Textile", "Ceramics", "Installation", "Video", "Mixed media"];

const KINDS: { key: ProjectKind; line: string }[] = [
  { key: "exhibition", line: "A show in a gallery, a space or a pop-up" },
  { key: "event", line: "A festival, a fair, an evening, a performance" },
  { key: "collection", line: "Art you're gathering for yourself or a client" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);   // set once saved
  const [single, setSingle] = useState<Step | null>(null);         // editing one answer
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Answers
  const [kind, setKind] = useState<ProjectKind>("exhibition");
  const [title, setTitle] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const [place, setPlace] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [online, setOnline] = useState(false);
  const [about, setAbout] = useState("");
  const [mediums, setMediums] = useState<string[]>([]);
  const [count, setCount] = useState("");
  const [deal, setDeal] = useState<ProjectDeal | null>(null);
  const [commission, setCommission] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const id = q.get("id");
    const step = q.get("step") as Step | null;
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMe(user.id);
      if (!id) return;
      const { data } = await sb.from("projects").select(PROJECT_COLS).eq("id", id).eq("owner_id", user.id).maybeSingle();
      if (!data) return;
      const p = data as Project;
      setProject(p); fill(p);
      if (step && STEPS.includes(step) && step !== "done") { setSingle(step); setAt(STEPS.indexOf(step)); }
    });
  }, []);

  function fill(p: Project) {
    const lf = p.looking_for || {};
    setKind(p.kind); setTitle(p.title); setStarts(p.starts_on || ""); setEnds(p.ends_on || "");
    setPlace(p.place || ""); setCoords(p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : null); setOnline(p.online);
    setAbout(p.about || ""); setMediums(lf.mediums || []); setCount(lf.count ? String(lf.count) : "");
    setDeal(lf.deal || null); setCommission(lf.commission != null ? String(lf.commission) : ""); setCover(p.cover_url);
  }

  const step = STEPS[at];
  const sb = createClient();

  /** Save a patch; the first save (the title) creates the project. */
  async function save(patch: Partial<Project>): Promise<Project | null> {
    if (!me) return null;
    setBusy(true); setError("");
    const res = project
      ? await sb.from("projects").update(patch).eq("id", project.id).select(PROJECT_COLS).single()
      : await sb.from("projects").insert({ owner_id: me, kind, title: title.trim(), ...patch }).select(PROJECT_COLS).single();
    setBusy(false);
    if (res.error || !res.data) {
      setError(res.error?.message?.includes("projects") && res.error?.message?.includes("exist")
        ? "Projects aren't switched on yet. Run the curator projects SQL in Supabase, then try again."
        : "That didn't save. Please try again.");
      return null;
    }
    setProject(res.data as Project);
    return res.data as Project;
  }

  /** Move on: back to the project when editing one answer, else the next question. */
  function next(p?: Project | null) {
    if (single && (p || project)) { router.push(projectHref((p || project)!.id)); return; }
    setAt(i => Math.min(STEPS.length - 1, i + 1));
  }
  async function answer(patch: Partial<Project>) {
    if (!project && step !== "title") { next(); return; }
    const p = await save(patch);
    if (p) next(p);
  }
  const back = () => { setError(""); setAt(i => Math.max(0, i - 1)); };

  async function addCover(files: FileList | null) {
    const f = files?.[0];
    if (!f || !me) return;
    setUploading(true); setError("");
    const url = await uploadImage(sb, me, f, "project");
    setUploading(false);
    if (!url) { setError("That image didn't upload. Use a JPG, PNG or WebP under 10 MB."); return; }
    setCover(url);
    if (fileRef.current) fileRef.current.value = "";
  }

  const lookingFor = (): LookingFor => ({
    mediums, count: count ? Number(count) : null, deal,
    commission: deal === "sale" && commission.trim() ? Number(commission) : null,
  });

  let body: React.ReactNode = null;
  switch (step) {
    case "kind":
      body = (
        <Screen title="What are you putting together?" hint="This shapes the questions after it. You can change it later.">
          <div className="flex flex-col gap-2">
            {KINDS.map(k => (
              <button key={k.key} type="button"
                onClick={() => { setKind(k.key); if (project) answer({ kind: k.key }); else next(); }}
                className={cn("flex items-center justify-between gap-4 rounded-card border-hair bg-surface px-4 py-3.5 text-left transition hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none",
                  kind === k.key && project ? "border-ink" : "border-line")}>
                <span className="flex flex-col gap-0.5">
                  <span className="font-ui text-body font-semibold text-fg">{KIND_LABEL[k.key]}</span>
                  <span className="font-ui text-body-sm text-fg-3">{k.line}</span>
                </span>
                <ArrowRight size={16} aria-hidden className="shrink-0 text-fg-3" />
              </button>
            ))}
          </div>
        </Screen>
      );
      break;

    case "title":
      body = (
        <Screen title="What's it called?" hint="A working title is fine. Artists see it on your invitation."
          onSubmit={() => title.trim() && answer({ title: title.trim(), kind })}
          primary={<Button type="submit" variant="primary" disabled={!title.trim() || busy}>{busy ? "Saving…" : <>Continue <ArrowRight size={15} aria-hidden /></>}</Button>}>
          <Input autoFocus value={title} maxLength={160} onChange={e => setTitle(e.target.value)}
            placeholder={kind === "collection" ? "e.g. Works on paper for the new office" : kind === "event" ? "e.g. Night of Small Works" : "e.g. Spring Light"} className="h-12 text-body" />
        </Screen>
      );
      break;

    case "when":
      body = (
        <Screen title={kind === "collection" ? "Is there a date to work towards?" : "When is it?"}
          hint={kind === "collection" ? "A handover or a deadline, if there is one. Collections can just be ongoing." : "Artists decide fast when they know the dates. Rough dates are fine."}
          onSubmit={() => answer({ starts_on: starts || null, ends_on: ends && (!starts || ends >= starts) ? ends : null })}
          primary={<Button type="submit" variant="primary" disabled={busy || (!!starts && !!ends && ends < starts)}>{busy ? "Saving…" : <>Continue <ArrowRight size={15} aria-hidden /></>}</Button>}
          secondary={<Button variant="ghost" onClick={() => { setStarts(""); setEnds(""); answer({ starts_on: null, ends_on: null }); }}>{kind === "collection" ? "It's ongoing" : "I don't know yet"}</Button>}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-label font-semibold text-fg">{kind === "collection" ? "From" : "Opens"}</span>
              <Input type="date" value={starts} onChange={e => setStarts(e.target.value)} className="h-12 text-body" />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-label font-semibold text-fg">{kind === "collection" ? "Until" : "Closes"}</span>
              <Input type="date" value={ends} min={starts || undefined} onChange={e => setEnds(e.target.value)} className="h-12 text-body" />
            </label>
          </div>
          {!!starts && !!ends && ends < starts && <p className="font-ui text-body-sm text-bad">It closes before it opens. Check the dates.</p>}
        </Screen>
      );
      break;

    case "where":
      body = (
        <Screen title="Where will it be?" hint={kind === "collection" ? "Where the works will live, if you know." : "The venue or the city. Artists near it see your project first."}
          onSubmit={() => answer({ place: place.trim() || null, lat: coords?.lat ?? null, lng: coords?.lng ?? null, online })}
          primary={<Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : <>Continue <ArrowRight size={15} aria-hidden /></>}</Button>}
          secondary={<Button variant="ghost" onClick={() => { setPlace(""); setCoords(null); setOnline(false); answer({ place: null, lat: null, lng: null, online: false }); }}>I don&rsquo;t know yet</Button>}>
          <PlacesAutocomplete value={place} placeholder="Search a venue or a city"
            onChange={(r, raw) => { setPlace(r?.name || raw); setCoords(r ? { lat: r.lat, lng: r.lng } : null); }} />
          <div className="flex flex-wrap gap-2">
            <Chip selected={online} onClick={() => setOnline(o => !o)}>{place.trim() ? "Online too" : "It's online"}</Chip>
          </div>
        </Screen>
      );
      break;

    case "about":
      body = (
        <Screen title="What's it about?" hint="A few lines, the way you'd tell an artist over coffee. The idea, the mood, who it's for."
          onSubmit={() => answer({ about: about.trim() || null })}
          primary={<Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : <>Continue <ArrowRight size={15} aria-hidden /></>}</Button>}
          secondary={<Button variant="ghost" onClick={() => answer({})}>Skip</Button>}>
          <Textarea autoFocus rows={5} maxLength={4000} value={about} onChange={e => setAbout(e.target.value)}
            placeholder="Light, water and the first warm weeks of the year. Small works, mostly on paper, by artists from the city." aria-label="About the project" />
        </Screen>
      );
      break;

    case "looking":
      body = (
        <Screen title="What are you looking for?" hint="Pick what helps. All of it goes with your invitations, so artists know what they're saying yes to."
          onSubmit={() => answer({ looking_for: lookingFor() })}
          primary={<Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : <>Continue <ArrowRight size={15} aria-hidden /></>}</Button>}
          secondary={<Button variant="ghost" onClick={() => answer({})}>Skip</Button>}>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-ui text-label font-semibold text-fg">Kinds of work</legend>
            <div className="flex flex-wrap gap-2">
              {MEDIUMS.map(m => <Chip key={m} selected={mediums.includes(m)} onClick={() => setMediums(x => x.includes(m) ? x.filter(y => y !== m) : [...x, m])}>{m}</Chip>)}
            </div>
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-ui text-label font-semibold text-fg">How do the works come in?</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DEAL_LABEL) as ProjectDeal[]).map(k => <Chip key={k} selected={deal === k} onClick={() => setDeal(deal === k ? null : k)}>{DEAL_LABEL[k]}</Chip>)}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-label font-semibold text-fg">About how many works?</span>
              <Input inputMode="numeric" value={count} onChange={e => setCount(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="e.g. 20" className="h-12 text-body" />
            </label>
            {deal === "sale" && (
              <label className="flex flex-col gap-1.5">
                <span className="font-ui text-label font-semibold text-fg">Your commission on sales</span>
                <span className="relative">
                  <Input inputMode="numeric" value={commission} onChange={e => setCommission(e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="e.g. 30" className="h-12 pr-10 text-body" />
                  <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-ui text-body-sm text-fg-3">%</span>
                </span>
              </label>
            )}
          </div>
        </Screen>
      );
      break;

    case "cover":
      body = (
        <Screen title="Add a cover image" hint="A mood picture, the venue, or a work you love. It's the face of your invitations."
          onSubmit={() => answer({ cover_url: cover })}
          primary={<Button type="submit" variant="primary" disabled={busy || uploading}>{busy ? "Saving…" : <>{cover ? "Continue" : "Continue without"} <ArrowRight size={15} aria-hidden /></>}</Button>}
          secondary={!cover ? <Button variant="ghost" onClick={() => answer({})}>I&rsquo;ll add one later</Button> : undefined}>
          {cover ? (
            <div className="relative overflow-hidden rounded-card border-hair border-line bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="aspect-[16/9] w-full object-cover" />
              <button type="button" aria-label="Remove image" onClick={() => setCover(null)}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-pill border-outline border-ink bg-surface hover:bg-sunken">
                <X size={14} aria-hidden />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className={cn("flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-card border-outline border-dashed border-line-strong font-ui text-body-sm font-semibold text-fg-3 transition-colors hover:border-ink hover:text-fg", uploading && "opacity-60")}>
              <ImagePlus size={24} aria-hidden /> {uploading ? "Uploading…" : "Choose an image"}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => addCover(e.target.files)} />
        </Screen>
      );
      break;

    case "open":
      body = (
        <Screen title="Let artists find it?" hint="Open projects show up in Scene, where artists look for places to show. They offer their works, and you say yes or no thanks.">
          <div className="flex flex-col gap-2">
            {([
              [true, "Yes, let artists offer work", "It shows in Scene. You can close it any time."],
              [false, "No, I'll invite artists myself", "Only the artists you invite see it."],
            ] as [boolean, string, string][]).map(([v, label, line]) => (
              <button key={String(v)} type="button" disabled={busy} onClick={() => answer({ is_open: v })}
                className={cn("flex items-center justify-between gap-4 rounded-card border-hair bg-surface px-4 py-3.5 text-left transition hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none",
                  single && project?.is_open === v ? "border-ink" : "border-line")}>
                <span className="flex flex-col gap-0.5">
                  <span className="font-ui text-body font-semibold text-fg">{label}</span>
                  <span className="font-ui text-body-sm text-fg-3">{line}</span>
                </span>
                <ArrowRight size={16} aria-hidden className="shrink-0 text-fg-3" />
              </button>
            ))}
          </div>
        </Screen>
      );
      break;

    case "done":
      body = project ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span aria-hidden className="grid h-12 w-12 place-items-center rounded-pill border-outline border-ink bg-mango text-on-mango"><Check size={22} strokeWidth={3} /></span>
            <h1 className="font-display text-h1 leading-tight text-fg">{project.title} is ready</h1>
            <p className="font-ui text-body text-fg-2">Now bring artists in. Pick a work you&rsquo;d love to include and we&rsquo;ll write the invitation for you.</p>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-card border-hair border-line bg-surface p-4 font-ui text-body-sm">
            <dt className="text-fg-3">What</dt><dd className="text-fg">{KIND_LABEL[project.kind]}</dd>
            <dt className="text-fg-3">When</dt><dd className="text-fg">{dateLine(project)}</dd>
            <dt className="text-fg-3">Where</dt><dd className="text-fg">{placeLine(project)}</dd>
            <dt className="text-fg-3">Artists</dt><dd className="text-fg">{project.is_open ? "Can find it in Scene and offer work" : "Only the ones you invite"}</dd>
            {project.looking_for?.deal && <><dt className="text-fg-3">Works</dt><dd className="text-fg">{DEAL_LABEL[project.looking_for.deal]}</dd></>}
          </dl>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
            <ButtonLink variant="ghost" href={projectHref(project.id)} className="sm:mr-auto">Open the project</ButtonLink>
            <ButtonLink variant="primary" href={`/dashboard/looking?project=${project.id}`}>Invite your first artist <ArrowRight size={15} aria-hidden /></ButtonLink>
          </div>
        </div>
      ) : null;
      break;
  }

  const closeHref = project ? projectHref(project.id) : "/dashboard/projects";
  const idx = at;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-var(--shell-header)-4rem-var(--tabbar-space,0px))] w-full max-w-[560px] flex-col gap-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} disabled={idx <= 0 || step === "done" || !!single}
          aria-label="Back" className="grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg disabled:invisible">
          <ArrowLeft size={17} aria-hidden />
        </button>
        <div className="flex flex-1 gap-1" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={QUESTIONS} aria-valuenow={Math.min(idx, QUESTIONS)}>
          {!single && Array.from({ length: QUESTIONS }).map((_, i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-pill transition-colors duration-base", i < idx || step === "done" ? "bg-ink" : i === idx ? "bg-mango" : "bg-line")} />
          ))}
        </div>
        <Link href={closeHref} aria-label={project ? "Close, your project is saved" : "Close"} title={project ? "Your project is saved" : undefined}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-control border-hair border-line bg-surface text-fg-2 transition-colors hover:border-ink hover:text-fg">
          {step === "done" ? <Check size={17} aria-hidden /> : <X size={17} aria-hidden />}
        </Link>
      </div>

      {error && <Alert tone="bad">{error}</Alert>}

      <div key={step} className="flex flex-1 flex-col animate-drop-in">{body}</div>

      {project && !single && step !== "done" && step !== "kind" && step !== "title" && (
        <p className="text-center font-ui text-caption text-fg-3">Saved as you go. Close anytime and pick up later.</p>
      )}
    </div>
  );
}

function Screen({ title, hint, children, primary, secondary, onSubmit }: {
  title: string; hint?: string; children?: React.ReactNode; primary?: React.ReactNode; secondary?: React.ReactNode; onSubmit?: () => void;
}) {
  return (
    <form className="flex flex-col gap-6" onSubmit={e => { e.preventDefault(); onSubmit?.(); }}>
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 leading-tight text-fg">{title}</h1>
        {hint && <p className="font-ui text-body text-fg-2">{hint}</p>}
      </div>
      {children && <div className="flex flex-col gap-4">{children}</div>}
      {(primary || secondary) && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1 sm:mr-auto">{secondary}</div>
          {primary && <div className="flex flex-col sm:block [&>button]:w-full sm:[&>button]:w-auto">{primary}</div>}
        </div>
      )}
    </form>
  );
}
