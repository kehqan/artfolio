"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Play, BookOpen, FileText, MessageSquare, Plus, X, ExternalLink,
  Youtube, Search, Filter, ArrowRight, Trash2, Globe, Clock,
  Star, Users, ChevronDown, Sparkles, TrendingUp, Award,
  Video, Newspaper, Hash, Eye,
} from "lucide-react";

/* ─── Types ───────────────────────────────────────────────────────── */
type ResourceType = "video" | "article" | "post";
type Resource = {
  id: string; type: ResourceType; title: string; url?: string;
  description?: string; thumbnail_url?: string; created_at: string;
  user_id?: string;
  poster_name?: string; poster_avatar?: string; poster_username?: string;
};

/* ─── Resource type config ────────────────────────────────────────── */
const RES_TYPES: Record<ResourceType, { label: string; icon: React.ReactNode; color: string; bg: string; accent: string }> = {
  video:   { label: "Video",   icon: <Play size={13} />,        color: "#FF6B6B", bg: "#FFF0F0", accent: "#FF6B6B" },
  article: { label: "Article", icon: <FileText size={13} />,    color: "#0EA5E9", bg: "#E0F2FE", accent: "#0EA5E9" },
  post:    { label: "Post",    icon: <MessageSquare size={13} />, color: "#8B5CF6", bg: "#EDE9FE", accent: "#8B5CF6" },
};

/* ─── Curated topic categories (Udemy-style browse) ──────────────── */
const TOPICS = [
  { key: "all",       label: "All",              emoji: "✨" },
  { key: "pricing",   label: "Pricing & Sales",  emoji: "💰" },
  { key: "gallery",   label: "Galleries & Shows", emoji: "🏛️" },
  { key: "marketing", label: "Marketing",         emoji: "📣" },
  { key: "technique", label: "Technique",         emoji: "🎨" },
  { key: "business",  label: "Art Business",      emoji: "📊" },
  { key: "digital",   label: "Digital Art",       emoji: "💻" },
  { key: "legal",     label: "Contracts & Legal", emoji: "📋" },
];

/* ─── Curated featured "courses" (static, Udemy-style hero cards) ── */
const FEATURED = [
  {
    title: "Pricing Your Artwork Confidently",
    desc: "Stop undercharging. Learn cost-based, market-based, and value-based pricing strategies that work for visual artists.",
    emoji: "💰", topic: "pricing",
    color: "#FFD400", bg: "#111110",
    level: "Beginner", duration: "45 min",
  },
  {
    title: "Working With Galleries: The Inside Guide",
    desc: "Consignment rates, commission structures, contract red flags, and how to build long-term gallery relationships.",
    emoji: "🏛️", topic: "gallery",
    color: "#4ECDC4", bg: "#0D3330",
    level: "Intermediate", duration: "1.5 hrs",
  },
  {
    title: "Building a Collector Base from Scratch",
    desc: "Your first 10 collectors, CRM basics, follow-up strategies, and turning one-time buyers into lifelong patrons.",
    emoji: "👥", topic: "business",
    color: "#FF6B6B", bg: "#1A0A0A",
    level: "Beginner", duration: "1 hr",
  },
  {
    title: "Instagram for Artists: What Actually Works",
    desc: "Algorithm-proof posting strategies, story formats that convert followers into buyers, and what to never post.",
    emoji: "📣", topic: "marketing",
    color: "#8B5CF6", bg: "#1A1025",
    level: "All levels", duration: "2 hrs",
  },
];

/* ─── Curated reading list (static, always visible) ──────────────── */
const READING_LIST = [
  { title: "How to Price Art (And Stop Guessing)", tag: "pricing", emoji: "💰" },
  { title: "The Artist's Guide to Contracts",      tag: "legal",   emoji: "📋" },
  { title: "Social Media Without Burning Out",      tag: "marketing", emoji: "📣" },
  { title: "What Galleries Look for in an Artist",  tag: "gallery", emoji: "🏛️" },
  { title: "Setting Up Your First Open Studio",     tag: "business", emoji: "🎨" },
  { title: "Digital Tools Every Artist Should Know", tag: "digital", emoji: "💻" },
];

/* ─── YouTube ID extractor ────────────────────────────────────────── */
function getYtId(url?: string) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
  return m ? m[1] : null;
}

/* ══════════════════════════════════════════════════════════════════ */
export default function EducationHub() {
  const sb = createClient();

  /* ── Data ─────────────────────────────────────────────────────── */
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  /* ── UI ───────────────────────────────────────────────────────── */
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ResourceType>("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"browse" | "community">("browse");

  /* ── Add form ─────────────────────────────────────────────────── */
  const [form, setForm] = useState({ type: "video" as ResourceType, title: "", url: "", description: "" });

  /* ─── Load ────────────────────────────────────────────────────── */
  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: ress } = await sb
      .from("education_resources")
      .select("id,type,title,url,description,thumbnail_url,created_at,user_id")
      .order("created_at", { ascending: false });

    if (ress && ress.length > 0) {
      const uids = Array.from(new Set(ress.map((r: any) => r.user_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};
      if (uids.length) {
        const { data: profs } = await sb.from("profiles").select("id,full_name,username,avatar_url").in("id", uids);
        (profs || []).forEach((p: any) => { profileMap[p.id] = p; });
      }
      setResources(ress.map((r: any) => ({
        ...r,
        poster_name: profileMap[r.user_id]?.full_name || null,
        poster_avatar: profileMap[r.user_id]?.avatar_url || null,
        poster_username: profileMap[r.user_id]?.username || null,
      })));
    } else {
      setResources([]);
    }
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      await sb.from("education_resources").insert({ ...form, user_id: user.id });
    }
    setForm({ type: "video", title: "", url: "", description: "" });
    setShowAddForm(false);
    setSaving(false);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this resource?")) return;
    await sb.from("education_resources").delete().eq("id", id);
    setResources(prev => prev.filter(r => r.id !== id));
  }

  /* ─── Filtered community resources ───────────────────────────── */
  const filtered = resources.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || r.title.toLowerCase().includes(q) || (r.description || "").toLowerCase().includes(q);
    const matchType = typeFilter === "all" || r.type === typeFilter;
    return matchSearch && matchType;
  });

  const videoCount   = resources.filter(r => r.type === "video").length;
  const articleCount = resources.filter(r => r.type === "article").length;
  const postCount    = resources.filter(r => r.type === "post").length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;600;700;800;900&display=swap');

        :root {
          --cream: #FAF7F3;
          --warm: #F5F0E8;
          --border: #E8E0D0;
          --ink: #111110;
          --muted: #9B8F7A;
          --yellow: #FFD400;
          --font: 'Darker Grotesque', sans-serif;
          --r: 20px;
          --shadow: 4px 5px 0 #111110;
        }

        .edu-wrap { padding-bottom: 80px; font-family: var(--font); }

        /* ── Hero banner ── */
        .edu-hero {
          background: var(--ink);
          border-radius: var(--r);
          border: 2.5px solid var(--ink);
          box-shadow: var(--shadow);
          padding: 36px 40px;
          margin-bottom: 28px;
          position: relative;
          overflow: hidden;
        }
        .edu-hero::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 60% 80% at 80% 50%, rgba(255,212,0,0.08), transparent),
                      radial-gradient(ellipse 40% 60% at 20% 80%, rgba(78,205,196,0.06), transparent);
          pointer-events: none;
        }
        .edu-hero-inner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .edu-hero-eyebrow { font-size: 10px; font-weight: 800; color: rgba(255,212,0,0.6); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px; }
        .edu-hero-title { font-size: clamp(26px, 3vw, 40px); font-weight: 900; color: #fff; letter-spacing: -1.2px; line-height: 1.1; margin-bottom: 10px; }
        .edu-hero-title span { color: var(--yellow); }
        .edu-hero-sub { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.45); line-height: 1.6; max-width: 440px; }
        .edu-hero-stats { display: flex; gap: 28px; margin-top: 20px; }
        .edu-hero-stat-n { font-size: 28px; font-weight: 900; color: var(--yellow); letter-spacing: -1px; line-height: 1; }
        .edu-hero-stat-l { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.35); margin-top: 2px; }
        .edu-hero-cta {
          display: flex; align-items: center; gap: 7px;
          padding: 12px 22px;
          background: var(--yellow); color: var(--ink);
          border: 2.5px solid var(--yellow); border-radius: 12px;
          font-size: 14px; font-weight: 900; cursor: pointer;
          font-family: inherit; text-decoration: none; flex-shrink: 0;
          box-shadow: 3px 3px 0 rgba(255,255,255,0.15);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .edu-hero-cta:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 rgba(255,255,255,0.2); }

        /* ── Tabs ── */
        .edu-tabs {
          display: flex; gap: 0;
          border-bottom: 2.5px solid var(--border);
          margin-bottom: 28px;
        }
        .edu-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 22px; border: none; background: transparent;
          font-family: inherit; font-size: 14px; font-weight: 700;
          cursor: pointer; color: var(--muted);
          border-bottom: 2.5px solid transparent; margin-bottom: -2.5px;
          transition: color 0.15s;
        }
        .edu-tab.active { color: var(--ink); border-bottom-color: var(--yellow); }
        .edu-tab-badge {
          font-size: 10px; font-weight: 800;
          background: var(--warm); color: var(--muted);
          padding: 1px 7px; border-radius: 99px;
        }
        .edu-tab.active .edu-tab-badge { background: var(--yellow); color: var(--ink); }

        /* ── Section headers ── */
        .edu-section-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .edu-section-title {
          font-size: 18px; font-weight: 900; color: var(--ink); letter-spacing: -0.4px;
          display: flex; align-items: center; gap: 8px;
        }

        /* ── Featured cards ── */
        .featured-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 36px;
        }
        .featured-card {
          border-radius: var(--r); overflow: hidden;
          border: 2.5px solid var(--ink);
          box-shadow: var(--shadow);
          cursor: pointer; position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
          text-decoration: none; display: block;
        }
        .featured-card:hover { transform: translate(-2px, -2px); box-shadow: 6px 7px 0 var(--ink); }
        .featured-card-top {
          padding: 22px 20px 16px;
          position: relative; min-height: 160px;
          display: flex; flex-direction: column; justify-content: space-between;
        }
        .featured-card-emoji { font-size: 32px; margin-bottom: 10px; display: block; }
        .featured-card-title { font-size: 15px; font-weight: 900; line-height: 1.25; letter-spacing: -0.3px; }
        .featured-card-meta { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
        .featured-card-pill {
          font-size: 9px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; padding: 3px 8px; border-radius: 99px;
          background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7);
        }
        .featured-card-bottom {
          background: #fff; padding: 14px 20px;
          border-top: 2px solid var(--ink);
        }
        .featured-card-desc { font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.5; }
        .featured-card-arrow {
          display: inline-flex; align-items: center; gap: 4px;
          margin-top: 10px; font-size: 12px; font-weight: 800; color: var(--ink);
        }

        /* ── Topic filter pills ── */
        .topic-pills {
          display: flex; gap: 8px; flex-wrap: wrap;
          margin-bottom: 20px;
        }
        .topic-pill {
          display: flex; align-items: center; gap: 5px;
          padding: 6px 14px; border-radius: 99px;
          border: 2px solid var(--border); background: #fff;
          font-size: 12px; font-weight: 800; color: var(--muted);
          cursor: pointer; font-family: inherit;
          transition: all 0.15s;
        }
        .topic-pill:hover { border-color: var(--ink); color: var(--ink); }
        .topic-pill.active { background: var(--ink); border-color: var(--ink); color: var(--yellow); }

        /* ── Reading list ── */
        .reading-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
          margin-bottom: 36px;
        }
        .reading-card {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: #fff; border: 2px solid var(--border);
          border-radius: 14px; cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
        }
        .reading-card:hover { border-color: var(--ink); box-shadow: 2px 2px 0 var(--ink); transform: translate(-1px, -1px); }
        .reading-card-emoji { font-size: 20px; flex-shrink: 0; }
        .reading-card-title { font-size: 13px; font-weight: 800; color: var(--ink); line-height: 1.3; }
        .reading-card-tag { font-size: 10px; font-weight: 700; color: var(--muted); margin-top: 2px; }

        /* ── Progress banner ── */
        .progress-banner {
          background: linear-gradient(135deg, #FFFBEA 0%, #FFF8D6 100%);
          border: 2.5px solid var(--ink);
          border-radius: var(--r);
          box-shadow: var(--shadow);
          padding: 24px 28px;
          margin-bottom: 36px;
          display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
        }
        .progress-banner-icon {
          width: 52px; height: 52px; border-radius: 16px;
          background: var(--yellow); border: 2.5px solid var(--ink);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .progress-banner-title { font-size: 17px; font-weight: 900; color: var(--ink); letter-spacing: -0.4px; }
        .progress-banner-sub { font-size: 13px; font-weight: 600; color: var(--muted); margin-top: 3px; }
        .progress-bar-wrap { flex: 1; min-width: 180px; }
        .progress-bar-track {
          height: 8px; background: var(--border); border-radius: 99px;
          border: 1.5px solid var(--ink); overflow: hidden; margin-top: 8px;
        }
        .progress-bar-fill { height: 100%; background: var(--yellow); border-radius: 99px; transition: width 0.6s ease; }

        /* ── Community search + filters ── */
        .community-bar {
          display: flex; gap: 10px; align-items: center;
          margin-bottom: 20px; flex-wrap: wrap;
        }
        .edu-search {
          flex: 1; min-width: 200px;
          display: flex; align-items: center; gap: 8px;
          padding: 9px 14px;
          background: #fff; border: 2.5px solid var(--border);
          border-radius: 12px;
          transition: border-color 0.15s;
        }
        .edu-search:focus-within { border-color: var(--ink); }
        .edu-search input {
          flex: 1; border: none; background: transparent;
          font-family: inherit; font-size: 13px; font-weight: 600; color: var(--ink);
          outline: none;
        }
        .edu-search input::placeholder { color: var(--muted); }
        .type-filter-group { display: flex; gap: 6px; }
        .type-filter-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 7px 12px; border-radius: 10px;
          border: 2px solid var(--border); background: #fff;
          font-size: 12px; font-weight: 800; color: var(--muted);
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .type-filter-btn:hover { border-color: var(--ink); color: var(--ink); }
        .type-filter-btn.active { background: var(--ink); border-color: var(--ink); color: var(--yellow); }
        .add-resource-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 16px;
          background: var(--yellow); color: var(--ink);
          border: 2.5px solid var(--ink); border-radius: 12px;
          font-size: 13px; font-weight: 800; cursor: pointer;
          font-family: inherit; box-shadow: 3px 3px 0 var(--ink);
          transition: transform 0.15s, box-shadow 0.15s; white-space: nowrap;
        }
        .add-resource-btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }

        /* ── Resource cards (community) ── */
        .resource-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .res-card {
          background: #fff; border: 2.5px solid var(--ink);
          border-radius: var(--r);
          box-shadow: 3px 4px 0 var(--ink);
          overflow: hidden; display: flex; flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .res-card:hover { transform: translate(-1px, -2px); box-shadow: 5px 6px 0 var(--ink); }

        /* Video thumbnail */
        .res-card-thumb {
          width: 100%; aspect-ratio: 16/9;
          background: #111; position: relative; overflow: hidden;
          flex-shrink: 0;
        }
        .res-card-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .res-card-thumb-empty {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          background: var(--warm);
        }
        .res-card-play {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.3);
          transition: background 0.15s;
        }
        .res-card:hover .res-card-play { background: rgba(0,0,0,0.5); }
        .res-card-play-btn {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--yellow); border: 3px solid var(--ink);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
        }

        .res-card-body { padding: 16px 18px; flex: 1; display: flex; flex-direction: column; }
        .res-card-type-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .res-card-type-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 3px 9px; border-radius: 99px;
          font-size: 10px; font-weight: 800;
        }
        .res-card-title { font-size: 14px; font-weight: 900; color: var(--ink); line-height: 1.3; letter-spacing: -0.2px; margin-bottom: 8px; }
        .res-card-desc { font-size: 12px; font-weight: 600; color: var(--muted); line-height: 1.55; flex: 1; }
        .res-card-footer {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: 14px; padding-top: 12px;
          border-top: 1.5px solid var(--border);
        }
        .res-card-poster { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .res-card-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--yellow); border: 2px solid var(--ink);
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; font-weight: 900; color: var(--ink);
          overflow: hidden; flex-shrink: 0;
        }
        .res-card-poster-name { font-size: 11px; font-weight: 700; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .res-card-link {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px; font-weight: 800; color: var(--ink);
          text-decoration: none; flex-shrink: 0;
          padding: 4px 10px; border-radius: 8px;
          border: 1.5px solid var(--border);
          transition: border-color 0.15s, background 0.15s;
        }
        .res-card-link:hover { border-color: var(--ink); background: var(--warm); }

        /* Delete btn (owner only) */
        .res-card-delete {
          background: none; border: none; cursor: pointer;
          color: var(--muted); padding: 4px; display: flex;
          transition: color 0.15s;
        }
        .res-card-delete:hover { color: #EF4444; }

        /* ── Empty state ── */
        .edu-empty {
          padding: 60px 24px; text-align: center;
          background: #fff; border: 2.5px dashed var(--border);
          border-radius: var(--r);
        }
        .edu-empty-emoji { font-size: 40px; margin-bottom: 12px; }
        .edu-empty-title { font-size: 18px; font-weight: 900; color: var(--ink); margin-bottom: 6px; }
        .edu-empty-sub { font-size: 13px; font-weight: 600; color: var(--muted); }

        /* ── Modal overlay ── */
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(17,17,16,0.6); backdrop-filter: blur(4px);
          z-index: 500; display: flex; align-items: center; justify-content: center;
          padding: 24px; animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .modal-box {
          background: #fff; border: 2.5px solid var(--ink);
          border-radius: var(--r); box-shadow: 8px 8px 0 var(--ink);
          width: 100%; max-width: 480px;
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
        .modal-head {
          padding: 20px 24px; border-bottom: 2px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          background: var(--cream);
        }
        .modal-title { font-size: 17px; font-weight: 900; color: var(--ink); letter-spacing: -0.4px; }
        .modal-close {
          width: 30px; height: 30px; border-radius: 8px;
          border: 2px solid var(--border); background: #fff;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; font-family: inherit; transition: border-color 0.15s;
        }
        .modal-close:hover { border-color: var(--ink); }
        .modal-body { padding: 24px; }
        .modal-label { font-size: 11px; font-weight: 800; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; display: block; }
        .modal-input {
          width: 100%; padding: 10px 14px;
          border: 2.5px solid var(--border); border-radius: 12px;
          font-family: inherit; font-size: 14px; font-weight: 600; color: var(--ink);
          background: #fff; outline: none; transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .modal-input:focus { border-color: var(--ink); }
        .modal-input::placeholder { color: var(--muted); }
        .modal-field { margin-bottom: 16px; }
        .modal-type-row { display: flex; gap: 8px; margin-bottom: 18px; }
        .modal-type-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 9px 12px; border-radius: 10px;
          border: 2px solid var(--border); background: #fff;
          font-size: 12px; font-weight: 800; color: var(--muted);
          cursor: pointer; font-family: inherit; transition: all 0.15s;
        }
        .modal-type-btn.active { background: var(--ink); border-color: var(--ink); color: var(--yellow); }
        .modal-footer {
          display: flex; gap: 10px;
          padding: 16px 24px; border-top: 2px solid var(--border);
          background: var(--cream);
        }
        .modal-btn-cancel {
          flex: 1; padding: 11px; border: 2px solid var(--border); border-radius: 12px;
          background: #fff; font-family: inherit; font-size: 13px; font-weight: 700;
          cursor: pointer; color: var(--muted); transition: border-color 0.15s;
        }
        .modal-btn-cancel:hover { border-color: var(--ink); color: var(--ink); }
        .modal-btn-save {
          flex: 1; padding: 11px; border: 2.5px solid var(--ink); border-radius: 12px;
          background: var(--yellow); font-family: inherit; font-size: 13px; font-weight: 800;
          cursor: pointer; color: var(--ink); box-shadow: 3px 3px 0 var(--ink);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .modal-btn-save:hover { transform: translate(-1px,-1px); box-shadow: 4px 4px 0 var(--ink); }
        .modal-btn-save:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .featured-grid { grid-template-columns: repeat(2, 1fr); }
          .resource-grid { grid-template-columns: repeat(2, 1fr); }
          .reading-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 680px) {
          .featured-grid { grid-template-columns: 1fr; }
          .resource-grid { grid-template-columns: 1fr; }
          .reading-grid { grid-template-columns: 1fr; }
          .edu-hero { padding: 24px 20px; }
          .edu-hero-title { font-size: 24px; }
        }
      `}</style>

      <div className="edu-wrap">

        {/* ══════════════════════════════════════
            HERO
        ══════════════════════════════════════ */}
        <div className="edu-hero">
          <div className="edu-hero-inner">
            <div>
              <div className="edu-hero-eyebrow">📚 Education Hub</div>
              <h1 className="edu-hero-title">
                The business of art<br />
                <span>is a learnable skill.</span>
              </h1>
              <p className="edu-hero-sub">
                Curated resources, community-shared knowledge, and practical guides for artists who want to sustain their practice.
              </p>
              <div className="edu-hero-stats">
                <div>
                  <div className="edu-hero-stat-n">{resources.length || "—"}</div>
                  <div className="edu-hero-stat-l">Community resources</div>
                </div>
                <div>
                  <div className="edu-hero-stat-n">{videoCount}</div>
                  <div className="edu-hero-stat-l">Videos</div>
                </div>
                <div>
                  <div className="edu-hero-stat-n">{articleCount}</div>
                  <div className="edu-hero-stat-l">Articles</div>
                </div>
              </div>
            </div>
            <button className="edu-hero-cta" onClick={() => { setActiveTab("community"); setShowAddForm(true); }}>
              <Plus size={15} strokeWidth={3} /> Share a resource
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════
            TABS
        ══════════════════════════════════════ */}
        <div className="edu-tabs">
          <button className={`edu-tab${activeTab === "browse" ? " active" : ""}`} onClick={() => setActiveTab("browse")}>
            <BookOpen size={14} /> Browse
          </button>
          <button className={`edu-tab${activeTab === "community" ? " active" : ""}`} onClick={() => setActiveTab("community")}>
            <Users size={14} /> Community
            <span className="edu-tab-badge">{resources.length}</span>
          </button>
        </div>

        {/* ══════════════════════════════════════
            BROWSE TAB
        ══════════════════════════════════════ */}
        {activeTab === "browse" && (
          <div>

            {/* Progress banner */}
            <div className="progress-banner">
              <div className="progress-banner-icon">
                <Award size={24} color="#111110" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="progress-banner-title">Your Learning Journey</div>
                <div className="progress-banner-sub">Explore topics below — each resource you open counts toward your growth</div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${Math.min(100, (resources.length / 20) * 100)}%` }} />
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", letterSpacing: "-0.8px" }}>{resources.length}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>resources shared</div>
              </div>
            </div>

            {/* Featured guides */}
            <div className="edu-section-head">
              <div className="edu-section-title">
                <Sparkles size={16} color="#FFD400" /> Featured Guides
              </div>
            </div>
            <div className="featured-grid" style={{ marginBottom: 36 }}>
              {FEATURED.map((f, i) => (
                <div key={i} className="featured-card">
                  <div className="featured-card-top" style={{ background: f.bg }}>
                    <div>
                      <span className="featured-card-emoji">{f.emoji}</span>
                      <div className="featured-card-title" style={{ color: f.color }}>{f.title}</div>
                    </div>
                    <div className="featured-card-meta">
                      <span className="featured-card-pill">{f.level}</span>
                      <span className="featured-card-pill">⏱ {f.duration}</span>
                    </div>
                  </div>
                  <div className="featured-card-bottom">
                    <div className="featured-card-desc">{f.desc}</div>
                    <div className="featured-card-arrow">
                      Explore <ArrowRight size={12} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Browse by topic */}
            <div className="edu-section-head">
              <div className="edu-section-title">
                <Hash size={16} /> Browse by Topic
              </div>
            </div>
            <div className="topic-pills">
              {TOPICS.map(t => (
                <button
                  key={t.key}
                  className={`topic-pill${topicFilter === t.key ? " active" : ""}`}
                  onClick={() => setTopicFilter(t.key)}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>

            {/* Reading list */}
            <div className="reading-grid">
              {READING_LIST
                .filter(r => topicFilter === "all" || r.tag === topicFilter)
                .map((r, i) => (
                  <div key={i} className="reading-card">
                    <div className="reading-card-emoji">{r.emoji}</div>
                    <div>
                      <div className="reading-card-title">{r.title}</div>
                      <div className="reading-card-tag">{TOPICS.find(t => t.key === r.tag)?.label}</div>
                    </div>
                    <ArrowRight size={14} color="var(--muted)" style={{ marginLeft: "auto", flexShrink: 0 }} />
                  </div>
                ))}
            </div>

            {/* Trending in community */}
            {resources.length > 0 && (
              <div>
                <div className="edu-section-head" style={{ marginTop: 16 }}>
                  <div className="edu-section-title">
                    <TrendingUp size={16} color="#16A34A" /> Trending from the Community
                  </div>
                  <button className="edu-tab" onClick={() => setActiveTab("community")} style={{ fontSize: 12, padding: "6px 12px", color: "var(--muted)" }}>
                    See all <ArrowRight size={12} />
                  </button>
                </div>
                <div className="resource-grid">
                  {resources.slice(0, 3).map(r => <ResourceCard key={r.id} resource={r} userId={userId} onDelete={handleDelete} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            COMMUNITY TAB
        ══════════════════════════════════════ */}
        {activeTab === "community" && (
          <div>
            <div className="community-bar">
              <div className="edu-search">
                <Search size={14} color="var(--muted)" />
                <input
                  placeholder="Search resources…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "var(--muted)" }}><X size={13} /></button>}
              </div>

              <div className="type-filter-group">
                {(["all", "video", "article", "post"] as const).map(t => (
                  <button
                    key={t}
                    className={`type-filter-btn${typeFilter === t ? " active" : ""}`}
                    onClick={() => setTypeFilter(t)}
                  >
                    {t === "all" ? "All" : t === "video" ? <><Play size={11} /> Videos</> : t === "article" ? <><FileText size={11} /> Articles</> : <><MessageSquare size={11} /> Posts</>}
                  </button>
                ))}
              </div>

              <button className="add-resource-btn" onClick={() => setShowAddForm(true)}>
                <Plus size={13} strokeWidth={3} /> Share resource
              </button>
            </div>

            {loading ? (
              <div style={{ padding: "60px 24px", textAlign: "center", color: "var(--muted)", fontSize: 14, fontWeight: 600 }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="edu-empty">
                <div className="edu-empty-emoji">📭</div>
                <div className="edu-empty-title">{search ? "No results found" : "No resources yet"}</div>
                <div className="edu-empty-sub">{search ? "Try a different search term" : "Be the first to share something useful with the community"}</div>
              </div>
            ) : (
              <div className="resource-grid">
                {filtered.map(r => <ResourceCard key={r.id} resource={r} userId={userId} onDelete={handleDelete} />)}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            ADD RESOURCE MODAL
        ══════════════════════════════════════ */}
        {showAddForm && (
          <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
            <form className="modal-box" onSubmit={handleAdd}>
              <div className="modal-head">
                <div className="modal-title">Share a Resource</div>
                <button type="button" className="modal-close" onClick={() => setShowAddForm(false)}><X size={14} /></button>
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: 16 }}>
                  <label className="modal-label">Type</label>
                  <div className="modal-type-row">
                    {(["video", "article", "post"] as ResourceType[]).map(t => {
                      const cfg = RES_TYPES[t];
                      return (
                        <button key={t} type="button" className={`modal-type-btn${form.type === t ? " active" : ""}`} onClick={() => setForm(p => ({ ...p, type: t }))}>
                          {cfg.icon} {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="modal-field">
                  <label className="modal-label">Title *</label>
                  <input className="modal-input" required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder={form.type === "video" ? "e.g. How to price your paintings" : form.type === "article" ? "e.g. Gallery contracts explained" : "e.g. My experience at Open Studios"} />
                </div>
                <div className="modal-field">
                  <label className="modal-label">{form.type === "video" ? "YouTube URL" : form.type === "article" ? "Article URL" : "Link (optional)"}</label>
                  <input className="modal-input" type="url" value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://…" />
                </div>
                <div className="modal-field">
                  <label className="modal-label">Description</label>
                  <textarea className="modal-input" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What's this about? What will someone learn?" style={{ resize: "vertical" }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-btn-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="modal-btn-save" disabled={saving}>{saving ? "Saving…" : "Share resource"}</button>
              </div>
            </form>
          </div>
        )}

      </div>
    </>
  );
}

/* ─── Resource Card component ─────────────────────────────────────── */
function ResourceCard({ resource: r, userId, onDelete }: { resource: Resource; userId: string | null; onDelete: (id: string) => void }) {
  const cfg = RES_TYPES[r.type] || RES_TYPES.article;
  const ytId = r.type === "video" ? getYtId(r.url) : null;
  const thumbSrc = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : r.thumbnail_url || null;
  const posterInitials = (r.poster_name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const isOwner = userId && r.user_id === userId;

  return (
    <div className="res-card">
      {/* Thumbnail (video or article hero) */}
      {thumbSrc ? (
        <div className="res-card-thumb">
          <img src={thumbSrc} alt={r.title} />
          {r.type === "video" && (
            <div className="res-card-play">
              <div className="res-card-play-btn"><Play size={16} color="#111110" fill="#111110" /></div>
            </div>
          )}
        </div>
      ) : (
        <div className="res-card-thumb res-card-thumb-empty">
          <div style={{ fontSize: 32, opacity: 0.25 }}>
            {r.type === "video" ? "▶" : r.type === "article" ? "📄" : "💬"}
          </div>
        </div>
      )}

      <div className="res-card-body">
        <div className="res-card-type-row">
          <span className="res-card-type-badge" style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.icon} {cfg.label}
          </span>
          {isOwner && (
            <button className="res-card-delete" onClick={() => onDelete(r.id)} title="Remove">
              <Trash2 size={13} />
            </button>
          )}
        </div>

        <div className="res-card-title">{r.title}</div>
        {r.description && <div className="res-card-desc">{r.description}</div>}

        <div className="res-card-footer">
          <div className="res-card-poster">
            <div className="res-card-avatar">
              {r.poster_avatar ? <img src={r.poster_avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : posterInitials}
            </div>
            <div className="res-card-poster-name">{r.poster_name || "Anonymous"}</div>
          </div>
          {r.url && (
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="res-card-link">
              {r.type === "video" ? <><Play size={10} /> Watch</> : <><ExternalLink size={10} /> Open</>}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
