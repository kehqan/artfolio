"use client";
// A curator's project, as anyone can see it. Three ways in:
//   - the curator turned on its public page (shows the signed works too)
//   - it's open to artists (it also shows in Scene)
//   - an invitation link: /project/<id>?invite=<token>
// Artists offer their works from here. Someone without an account joins
// first and comes straight back (register ?next=).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, Button, ButtonLink, EmptyState, Eyebrow, Skeleton, cn } from "@/components/ui";
import { Mat, PublicFooter, PublicHeader, publicWrap } from "@/components/public/PublicChrome";
import { OfferWorkModal, type OfferTarget } from "@/components/OfferWorkModal";
import { type PublicProject, DEAL_LABEL, KIND_LABEL, dateLine, isCuratorRole, placeLine, projectHref } from "@/lib/projects";

export default function PublicProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<PublicProject | null | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<{ id: string; role: string | null } | null>(null);
  const [offer, setOffer] = useState<OfferTarget | null>(null);
  const [offered, setOffered] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("invite");
    setToken(t);
    const sb = createClient();
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();
        setMe({ id: user.id, role: prof?.role || null });
        // Opening an invitation while signed in ties it to this account.
        if (t) await sb.rpc("accept_project_invite", { p_token: t });
        const { count } = await sb.from("deals").select("id", { count: "exact", head: true }).eq("project_id", id).eq("artist_id", user.id).not("status", "in", "(declined,withdrawn)");
        setOffered((count || 0) > 0);
      }
      const { data, error } = await sb.rpc("public_project", { p_id: id, p_token: t });
      setP(error ? null : (data as PublicProject | null));
    })();
  }, [id]);

  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/project/${id}`;
  const mine = !!(me && p?.owner && me.id === p.owner.id);
  const canOffer = !!p && p.status === "active" && (p.is_open || !!p.invite) && !mine;
  const asArtist = me && !isCuratorRole(me.role) && me.role !== "venue" && me.role !== "gallery";

  if (p === undefined) return (
    <Shell signedIn={!!me}>
      <Skeleton className="aspect-[21/9] w-full rounded-card" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </Shell>
  );
  if (!p) return (
    <Shell signedIn={!!me}>
      <EmptyState title="This project isn't public" description="The curator may have closed it, or the link is incomplete. Ask them for a new link."
        action={<ButtonLink variant="secondary" href="/explore">Explore Artomango</ButtonLink>} />
    </Shell>
  );

  const lf = p.looking_for || {};
  const firstName = (p.owner?.name || "").split(/\s+/)[0] || "the curator";

  const cta = !canOffer ? null : offered ? (
    <div className="flex flex-col gap-2">
      <p className="font-ui text-body font-semibold text-fg">You&rsquo;ve offered work to this project.</p>
      <ButtonLink variant="secondary" href="/dashboard/messages?tab=deals" className="self-start">See it in Deals</ButtonLink>
    </div>
  ) : me ? (
    asArtist ? (
      <Button variant="primary" className="self-start" onClick={() => setOffer({ recipientId: p.owner!.id, name: p.owner!.name, avatar: p.owner!.avatar, projectId: p.id, contextTitle: p.title })}>
        Offer your work
      </Button>
    ) : <p className="font-ui text-body-sm text-fg-3">Artists offer their works here. You&rsquo;re signed in with a {me.role === "curator" ? "curator" : "venue"} account.</p>
  ) : (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <ButtonLink variant="primary" href={`/register?role=artist&next=${encodeURIComponent(here)}`}>Join free to offer your work</ButtonLink>
      <ButtonLink variant="ghost" href={`/login?next=${encodeURIComponent(here)}`}>I have an account</ButtonLink>
    </div>
  );

  return (
    <Shell signedIn={!!me}>
      {mine && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border-hair border-line bg-mango-soft px-4 py-3 font-ui text-body-sm text-fg">
          <span>This is how others see your project{p.is_public ? "" : ". The public page is off, so only artists it's open to or invited can open it"}.</span>
          <Link href={projectHref(p.id)} className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"><ArrowLeft size={14} aria-hidden /> Back to the project</Link>
        </div>
      )}

      <header className="flex flex-col overflow-hidden rounded-card border-outline border-ink bg-surface shadow-hard-1">
        {p.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_url} alt="" className="aspect-[21/9] max-h-[420px] w-full border-b-outline border-ink object-cover" />
        )}
        <div className="flex flex-col gap-5 p-5 sm:p-8">
          {p.invite && !mine && (
            <p className="font-ui text-body text-fg-2">
              {p.invite.name ? `${p.invite.name.split(/\s+/)[0]}, ` : ""}{firstName} would like you to be part of this.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Eyebrow>{KIND_LABEL[p.kind]}</Eyebrow>
            <h1 className="font-display text-display leading-[0.95] text-fg">{p.title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 font-ui text-body text-fg-2">
              <span className="inline-flex items-center gap-1.5"><CalendarDays size={16} aria-hidden /> {dateLine(p)}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={16} aria-hidden /> {placeLine(p)}</span>
            </div>
          </div>
          {p.owner && (
            <div className="flex items-center gap-3">
              <Avatar name={p.owner.name} src={p.owner.avatar} size="md" />
              <span className="flex flex-col">
                <span className="font-ui text-caption text-fg-3">Curated by</span>
                <span className="font-ui text-body font-semibold text-fg">{p.owner.name}</span>
              </span>
            </div>
          )}
          {cta}
        </div>
      </header>

      {(p.about || lf.mediums?.length || lf.deal) && (
        <section className="grid gap-6 lg:grid-cols-3">
          {p.about && (
            <div className="flex flex-col gap-2 lg:col-span-2">
              <Eyebrow>About</Eyebrow>
              <p className="max-w-[64ch] whitespace-pre-line font-ui text-lead text-fg">{p.about}</p>
            </div>
          )}
          {(lf.mediums?.length || lf.deal || lf.count) && (p.is_open || p.invite || mine) ? (
            <div className={cn("flex flex-col gap-3 rounded-card border-hair border-line bg-surface p-5", !p.about && "lg:col-span-3")}>
              <Eyebrow>Looking for</Eyebrow>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 font-ui text-body-sm">
                {!!lf.mediums?.length && <><dt className="text-fg-3">Kinds</dt><dd className="text-fg">{lf.mediums.join(", ")}</dd></>}
                {lf.deal && <><dt className="text-fg-3">Works</dt><dd className="text-fg">{DEAL_LABEL[lf.deal]}{lf.deal === "sale" && lf.commission != null ? `, ${lf.commission}% commission` : ""}</dd></>}
                {!!lf.count && <><dt className="text-fg-3">How many</dt><dd className="text-fg">About {lf.count} works</dd></>}
              </dl>
            </div>
          ) : null}
        </section>
      )}

      {p.works.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Eyebrow>In the {p.kind === "collection" ? "collection" : "show"}</Eyebrow>
            <h2 className="font-display text-h2 leading-tight text-fg">{p.works.length} {p.works.length === 1 ? "work" : "works"} from {new Set(p.works.map(w => w.artist)).size} {new Set(p.works.map(w => w.artist)).size === 1 ? "artist" : "artists"}</h2>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {p.works.map(w => (
              <li key={w.id}>
                <Link href={`/artwork/${w.id}/passport`} className="group flex flex-col gap-2">
                  <Mat src={w.image} alt={w.title} className="aspect-square rounded-card border-hair border-line transition group-hover:border-ink" />
                  <span className="flex flex-col">
                    <span className="truncate font-ui text-body-sm font-semibold text-fg">{w.title}</span>
                    <span className="truncate font-ui text-caption text-fg-3">{w.artist}{w.width_cm && w.height_cm ? ` · ${Number(w.width_cm)} × ${Number(w.height_cm)} cm` : ""}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <OfferWorkModal open={!!offer} target={offer} onClose={() => { setOffer(null); createClient().from("deals").select("id", { count: "exact", head: true }).eq("project_id", id).eq("artist_id", me?.id || "").then(({ count }) => setOffered((count || 0) > 0)); }} />
    </Shell>
  );
}

function Shell({ children, signedIn }: { children: React.ReactNode; signedIn: boolean }) {
  return (
    <div className="min-h-screen bg-page text-fg">
      <PublicHeader signedIn={signedIn} />
      <main className={cn(publicWrap, "flex max-w-[1100px] flex-col gap-10 py-10")}>{children}</main>
      <PublicFooter />
    </div>
  );
}
