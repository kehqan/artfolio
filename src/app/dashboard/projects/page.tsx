"use client";
// Your projects: every show, event and collection a curator is gathering
// art for, as cards with their cover, dates and one status line.
import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, ButtonLink, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { type ProjectView, loadProjects } from "@/lib/projects";
import { ProjectCard } from "./ProjectCard";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectView[] | null>(null);
  const [off, setOff] = useState(false);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const list = await loadProjects(sb, user.id);
      if (!list) { setOff(true); setProjects([]); return; }
      setProjects(list);
    });
  }, []);

  const live = (projects || []).filter(p => p.status !== "done");
  const done = (projects || []).filter(p => p.status === "done");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Projects" description="Each show, event or collection you're gathering art for, with every work, artist and agreement in one place."
        actions={<ButtonLink variant="primary" href="/dashboard/projects/new"><Plus size={16} aria-hidden /> New project</ButtonLink>} />

      {off && <Alert tone="warn">Projects aren&rsquo;t switched on in the database yet. Run the curator projects SQL in Supabase, then refresh.</Alert>}

      {projects === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-72 rounded-card" />)}</div>
      ) : projects.length === 0 ? (
        <EmptyState icon={<FolderOpen size={22} aria-hidden />} title="Start your first project"
          description="An exhibition, an event or a collection. A few quick questions, and you can skip any of them."
          action={<ButtonLink variant="primary" href="/dashboard/projects/new">Start a project</ButtonLink>} />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {live.map(p => <li key={p.id}><ProjectCard p={p} /></li>)}
            <li>
              <Link href="/dashboard/projects/new"
                className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 rounded-card border-outline border-dashed border-line-strong font-ui text-body-sm font-semibold text-fg-3 transition-colors hover:border-ink hover:text-fg">
                <Plus size={22} aria-hidden /> New project
              </Link>
            </li>
          </ul>
          {done.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-h3 text-fg-2">Finished</h2>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {done.map(p => <li key={p.id}><ProjectCard p={p} /></li>)}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
