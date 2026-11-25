"use client";
// A project as a card: cover (or the first gathered works), name, dates and
// one status line. Used on Projects and on a curator's Home.
import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Badge, cn } from "@/components/ui";
import { type ProjectView, KIND_SHORT, dateLine, projectHref, statusLine } from "@/lib/projects";

export function ProjectCard({ p }: { p: ProjectView }) {
  const thumbs = p.works.map(w => w.images?.[0]).filter(Boolean).slice(0, 3) as string[];
  return (
    <Link href={projectHref(p.id)}
      className={cn("group flex h-full flex-col overflow-hidden rounded-card border-hair border-line bg-surface transition",
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-ink hover:shadow-hard-2 focus-visible:border-ink focus-visible:shadow-hard-2 focus-visible:outline-none",
        p.status === "done" && "opacity-70")}>
      <span className="relative block aspect-[16/9] border-b-hair border-line bg-sunken">
        {p.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : thumbs.length ? (
          <span className="absolute inset-0 grid grid-cols-3 gap-2 p-3">
            {thumbs.map(t => (
              <span key={t} className="relative overflow-hidden rounded-control bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t} alt="" className="absolute inset-0 h-full w-full object-contain p-1" />
              </span>
            ))}
          </span>
        ) : (
          <FolderOpen size={28} aria-hidden className="absolute inset-0 m-auto text-fg-3" />
        )}
        {p.toSign > 0 && <Badge tone="mango" className="absolute left-3 top-3">{p.toSign} to sign</Badge>}
      </span>
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-ui text-caption font-semibold uppercase tracking-eyebrow text-fg-3">{KIND_SHORT[p.kind]} · {dateLine(p)}</span>
        <span className="font-display text-h3 leading-tight text-fg">{p.title}</span>
        <span className="mt-auto pt-2 font-ui text-body-sm text-fg-2">{statusLine(p)}</span>
      </span>
    </Link>
  );
}
