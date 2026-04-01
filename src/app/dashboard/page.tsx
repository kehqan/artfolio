"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  ImageIcon, Globe, BarChart3, CalendarDays,
  FolderOpen, Handshake, Users, TrendingUp,
  CheckSquare, Plus, ArrowRight, ExternalLink,
  Eye, DollarSign, Clock,
} from "lucide-react";

type Stats = {
  artworks: number; available: number; sold: number;
  exhibitions: number; collabs: number;
  sales_total: number; tasks_pending: number;
};

const SECTION_CARDS = [
  {
    key: "studio",
    label: "Studio",
    desc: "Your artworks, collections & public portfolio",
    color: "#FFD400",
    textColor: "#111110",
    icon: ImageIcon,
    links: [
      { href: "/dashboard/artworks",    label: "Artworks",    icon: ImageIcon,  desc: "Manage inventory"    },
      { href: "/dashboard/collections", label: "Collections", icon: FolderOpen, desc: "Group your works"     },
      { href: "/dashboard/portfolio",   label: "Portfolio",   icon: Globe,      desc: "Your public page"    },
    ],
    cta: { href: "/dashboard/artworks/new", label: "Add Artwork" },
  },
  {
    key: "scene",
    label: "Scene",
    desc: "Exhibitions, collaborations & community",
    color: "#4ECDC4",
    textColor: "#111110",
    icon: Globe,
    links: [
      { href: "/dashboard/exhibitions", label: "Exhibitions", icon: Globe,       desc: "Plan shows"          },
      { href: "/dashboard/pool",        label: "Collabs",     icon: Handshake,   desc: "Find partners"       },
      { href: "/",                      label: "Explore",     icon: Users,       desc: "Browse community"    },
    ],
    cta: { href: "/dashboard/exhibitions/new", label: "New Exhibition" },
  },
  {
    key: "business",
    label: "Business",
    desc: "Sales, clients & performance analytics",
    color: "#FF6B6B",
    textColor: "#111110",
    icon: BarChart3,
    links: [
      { href: "/dashboard/sales",       label: "Sales",       icon: BarChart3,   desc: "Track revenue"       },
      { href: "/dashboard/clients",     label: "Clients",     icon: Users,       desc: "Collector CRM"       },
      { href: "/dashboard/analytics",   label: "Analytics",   icon: TrendingUp,  desc: "Growth insights"     },
    ],
    cta: { href: "/dashboard/sales/new", label: "Log Sale" },
  },
  {
    key: "planner",
    label: "Planner",
    desc: "Tasks, deadlines & calendar events",
    color: "#8B5CF6",
    textColor: "#fff",
    icon: CalendarDays,
    links: [
      { href: "/dashboard/tasks",       label: "Tasks",       icon: CheckSquare, desc: "To-dos & checklist"  },
      { href: "/dashboard/calendar",    label: "Calendar",    icon: CalendarDays, desc: "Events & deadlines" },
    ],
    cta: { href: "/dashboard/tasks", label: "Add Task" },
  },
];

export default function DashboardPage() {
  const [profile, setProfile] = useState<{ full_name?: string; role?: string; username?: string } | null>(null);
  const [stats, setStats]     = useState<Stats>({ artworks:0, available:0, sold:0, exhibitions:0, collabs:0, sales_total:0, tasks_pending:0 });
  const [artworks, setArtworks] = useState<any[]>([]);
  const [greeting, setGreeting] = useState("Good morning");
  const today = new Date();

  useEffect(() => {
    const h = today.getHours();
    if (h >= 5  && h < 12) setGreeting("Good morning");
    else if (h >= 12 && h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const [{ data: prof }, { data: aw }, { data: ex }, { data: co }, { data: tk }] = await Promise.all([
        supabase.from("profiles").select("full_name,role,username").eq("id", user.id).single(),
        supabase.from("artworks").select("id,title,status,images,price,medium").eq("user_id", user.id).order("created_at", { ascending: false }).limit(6),
        supabase.from("exhibitions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("collaborations").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("tasks").select("id,status").eq("user_id", user.id),
      ]);

      setProfile(prof);
      setArtworks(aw || []);

      const awList = aw || [];
      const tkList = tk || [];
      setStats({
        artworks:      awList.length,
        available:     awList.filter((a: any) => String(a.status).toLowerCase() === "available").length,
        sold:          awList.filter((a: any) => String(a.status).toLowerCase() === "sold").length,
        exhibitions:   (ex as any)?.count || 0,
        collabs:       (co as any)?.count || 0,
        sales_total:   0,
        tasks_pending: tkList.filter((t: any) => t.status === "pending" || t.status === "in_progress").length,
      });
    });
  }, []);

  const fname = profile?.full_name?.split(" ")[0] || "Artist";

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 }}>
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: 0 }}>
          {greeting}, {fname} 👋
        </h1>
      </div>

      {/* ── Stat strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Works",    value: stats.artworks,      icon: ImageIcon,    color: "#FFD400" },
          { label: "Available",      value: stats.available,     icon: Eye,          color: "#4ECDC4" },
          { label: "Exhibitions",    value: stats.exhibitions,   icon: Globe,        color: "#FF6B6B" },
          { label: "Active Tasks",   value: stats.tasks_pending, icon: Clock,        color: "#8B5CF6" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} style={{ background: "#fff", border: "2px solid #111110", padding: "16px 18px", boxShadow: "3px 3px 0 #111110", position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, background: stat.color, border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={14} color="#111110" />
                </div>
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#111110", lineHeight: 1, marginBottom: 4 }}>{stat.value}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{stat.label}</div>
              {/* Accent corner */}
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 40, height: 40, background: stat.color, opacity: 0.1, borderTopLeftRadius: 40 }} />
            </div>
          );
        })}
      </div>

      {/* ── 4 Section cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 28 }}>
        {SECTION_CARDS.map(section => {
          const SIcon = section.icon;
          return (
            <div key={section.key} style={{ background: "#fff", border: "2px solid #111110", overflow: "hidden", boxShadow: "3px 3px 0 #111110" }}>
              {/* Section header */}
              <div style={{ padding: "16px 20px 12px", borderBottom: "2px solid #111110", background: section.color, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 28, height: 28, background: "#111110", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <SIcon size={13} color={section.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: "#111110", letterSpacing: "-0.2px" }}>{section.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(17,17,16,0.6)" }}>{section.desc}</div>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div style={{ padding: "8px 0" }}>
                {section.links.map((link, i) => {
                  const LIcon = link.icon;
                  return (
                    <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: i < section.links.length - 1 ? "1px solid #F5F0E8" : "none", transition: "background 0.1s", cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                        onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                        <div style={{ width: 30, height: 30, background: "#F5F0E8", border: "1.5px solid #E0D8CA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <LIcon size={13} color="#5C5346" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#111110" }}>{link.label}</div>
                          <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 500 }}>{link.desc}</div>
                        </div>
                        <ArrowRight size={13} color="#d4cfc4" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* CTA */}
              <div style={{ padding: "10px 16px", borderTop: "1px solid #E0D8CA", background: "#FAFAF8" }}>
                <Link href={section.cta.href} style={{ textDecoration: "none" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: "2px solid #111110", background: "#111110", color: "#FFD400", fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: "2px 2px 0 " + section.color }}>
                    <Plus size={12} strokeWidth={3} /> {section.cta.label}
                  </button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Recent artworks ── */}
      {artworks.length > 0 && (
        <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "3px 3px 0 #111110", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "2px solid #111110" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Recent Artworks</div>
            <Link href="/dashboard/artworks" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)" }}>
            {artworks.slice(0, 6).map((aw: any, i: number) => {
              const img = Array.isArray(aw.images) ? aw.images[0] : null;
              const statusColor: Record<string, string> = { available: "#4ECDC4", sold: "#111110", reserved: "#FFD400", "in progress": "#8B5CF6", concept: "#9B8F7A" };
              const sc = statusColor[String(aw.status).toLowerCase()] || "#9B8F7A";
              return (
                <Link key={aw.id} href={`/dashboard/artworks/${aw.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ borderRight: i < 5 ? "1px solid #E0D8CA" : "none", cursor: "pointer", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                    onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                    <div style={{ aspectRatio: "1/1", background: "#F5F0E8", position: "relative", overflow: "hidden" }}>
                      {img
                        ? <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <ImageIcon size={20} color="#9B8F7A" />
                          </div>
                      }
                      <div style={{ position: "absolute", bottom: 6, left: 6, width: 8, height: 8, borderRadius: "50%", background: sc, border: "1.5px solid #fff" }} />
                    </div>
                    <div style={{ padding: "8px 10px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                      <div style={{ fontSize: 9, color: "#9B8F7A", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.medium || "—"}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick links row ── */}
      {profile?.username && (
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/profile/${profile.username}`} style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px solid #111110", background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
              <ExternalLink size={11} /> View Public Portfolio
            </button>
          </Link>
          <Link href="/dashboard/artworks/new" style={{ textDecoration: "none" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "2px solid #111110", background: "#FFD400", fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
              <Plus size={11} strokeWidth={3} /> Add Artwork
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
