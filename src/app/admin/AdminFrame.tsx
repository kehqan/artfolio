"use client";
// The admin's own frame: a quiet top bar with the admin's places.
// Only Kasra (role admin) gets here; middleware and the database both check.
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { MangoMark } from "@/components/brand/MangoMark";
import { cn } from "@/components/ui";

const PLACES = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/home", label: "Home page" },
  { href: "/dashboard/calls", label: "Open calls" },
];

export default function AdminFrame({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen bg-page font-ui text-fg">
      <header className="sticky top-0 z-30 border-b-hair border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-6 px-4 sm:px-6">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <MangoMark size={22} />
            <span className="font-display text-[20px] font-extrabold leading-none">Admin</span>
          </Link>
          <nav aria-label="Admin" className="-mb-px flex h-full min-w-0 flex-1 gap-1 overflow-x-auto">
            {PLACES.map(p => {
              const on = p.href === "/admin" ? path === "/admin" : path.startsWith(p.href);
              return (
                <Link key={p.href} href={p.href} aria-current={on ? "page" : undefined}
                  className={cn("flex h-full items-center whitespace-nowrap border-b-2 px-3 text-label font-semibold transition-colors",
                    on ? "border-ink text-fg" : "border-transparent text-fg-3 hover:text-fg")}>
                  {p.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/dashboard" className="hidden shrink-0 items-center gap-1.5 text-label font-semibold text-fg-3 hover:text-fg sm:flex">
            <ArrowLeft size={14} aria-hidden /> Back to the app
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
