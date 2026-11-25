"use client";
// Home for a curator: someone gathering art for an exhibition, an event or
// a collection. It answers, in this order:
//   1. What's the one thing to do now? (an artist said yes, a project to start)
//   2. My live projects, each with its status line
//   3. Artists asking for a place to show, to invite
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ButtonLink, Eyebrow, Heading, Skeleton } from "@/components/ui";
import { NextStepCard } from "@/components/home/NextStepCard";
import { type ProjectView, loadProjects, projectHref } from "@/lib/projects";
import { ProjectCard } from "../projects/ProjectCard";

export function CuratorHome() {
  const [name, setName] = useState("");
  const [projects, setProjects] = useState<ProjectView[] | null>(null);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: prof }, list] = await Promise.all([
        sb.from("profiles").select("full_name").eq("id", user.id).single(),
        loadProjects(sb, user.id),
      ]);
      setName((prof?.full_name || "").trim().split(/\s+/)[0] || "there");
      setProjects(list || []);
    });
  }, []);

  const hour = new Date().getHours();
  const timeWord = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const todayFmt = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const live = (projects || []).filter(p => p.status !== "done");
  const toSign = live.reduce((n, p) => n + p.toSign, 0);
  const works = live.reduce((n, p) => n + p.works.length, 0);
  const sub = projects === null ? " "
    : live.length === 0 ? "Start a project, then invite artists into it."
    : [`${live.length} ${live.length === 1 ? "project" : "projects"} on the go`, works ? `${works} ${works === 1 ? "work" : "works"} gathered` : null, toSign ? `${toSign} to sign` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Eyebrow suppressHydrationWarning>{todayFmt}</Eyebrow>
          {projects ? <Heading level={1} size="h1" suppressHydrationWarning>{timeWord}, {name}.</Heading> : <Skeleton className="h-10 w-72" />}
          <p className="font-ui text-body text-fg-2">{sub}</p>
        </div>
        {live.length > 0 && <ButtonLink variant="secondary" href="/dashboard/projects/new"><Plus size={16} aria-hidden /> New project</ButtonLink>}
      </header>

      {projects && <CuratorNextStep live={live} />}

      {live.length > 0 && (
        <section aria-labelledby="projects-head" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <Eyebrow>On the go</Eyebrow>
              <h2 id="projects-head" className="font-display text-h2 leading-tight text-fg">Your projects</h2>
            </div>
            <Link href="/dashboard/projects" className="inline-flex items-center gap-1 font-ui text-label font-semibold text-fg-2 hover:text-fg">All projects <ArrowRight size={13} aria-hidden /></Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.slice(0, 3).map(p => <li key={p.id}><ProjectCard p={p} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function CuratorNextStep({ live }: { live: ProjectView[] }) {
  // An artist offered works to an open project: answer first.
  for (const p of live) {
    const d = p.deals.find(x => x.status === "sent" && x.started_by === x.artist_id);
    if (d) return <NextStepCard tone="mango" eyebrow={`Your turn · ${p.title}`} image={d.works[0]?.images?.[0] ?? null}
      title={`${d.other?.full_name || "An artist"} would like to join`}
      line="They offered their work to your project. Have a look, then say yes or no thanks."
      primary={{ label: "Have a look", href: `/dashboard/messages?tab=deals&deal=${d.id}` }} />;
  }
  // An artist said yes: the agreement is the next move.
  for (const p of live) {
    const d = p.deals.find(x => x.status === "interested");
    if (d) return <NextStepCard tone="mango" eyebrow={`Your turn · ${p.title}`} image={d.works[0]?.images?.[0] ?? null}
      title={`${d.other?.full_name || "An artist"} said yes`}
      line="Send the agreement. It's filled in from the project, so it's mostly one tap."
      primary={{ label: "Open the project", href: projectHref(p.id) }} />;
  }
  if (live.length === 0) return <NextStepCard eyebrow="Next step" title="Start your first project"
    line="An exhibition, an event or a collection. A few quick questions, one at a time, and you can skip any of them."
    primary={{ label: "Start a project", href: "/dashboard/projects/new" }}
    progress={[
      { label: "Account", done: true },
      { label: "First project", done: false },
      { label: "First artist invited", done: false },
      { label: "First agreement signed", done: false },
    ]} />;
  const empty = live.find(p => p.deals.length === 0);
  if (empty) return <NextStepCard eyebrow={`Next step · ${empty.title}`} title="Invite your first artist"
    line="Pick a work you'd love to include. We write the invitation for you, with your dates and place."
    primary={{ label: "Find artists", href: `/dashboard/looking?project=${empty.id}` }} />;
  return null;
}
