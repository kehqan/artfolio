"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Plus, X, ArrowLeft, Search, ChevronLeft,
  ChevronRight, MoreHorizontal, Trash2,
  Columns, Table2, CalendarDays,
  Megaphone,
} from "lucide-react";

// ── Config ──────────────────────────────────────────────────────
const PROMO_STAGES = [
  { key: "idea",       label: "Ideas",     color: "#9B8F7A", bg: "#F5F0E8" },
  { key: "creating",  label: "Creating",  color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "scheduled", label: "Scheduled", color: "#CA8A04", bg: "#FEF9C3" },
  { key: "published", label: "Published", color: "#16A34A", bg: "#DCFCE7" },
];
const STAGE_MAP = Object.fromEntries(PROMO_STAGES.map(s => [s.key, s]));

const PLATFORMS = [
  { key: "instagram",   label: "Instagram",   color: "#E1306C" },
  { key: "tiktok",      label: "TikTok",      color: "#010101" },
  { key: "website",     label: "Website",     color: "#4A90D9" },
  { key: "email",       label: "Email",       color: "#EA4335" },
  { key: "newsletter",  label: "Newsletter",  color: "#FF6B6B" },
  { key: "other",       label: "Other",       color: "#9B8F7A" },
];

const CONTENT_TYPES = [
  { key: "post",       label: "Post"       },
  { key: "reel",       label: "Reel"       },
  { key: "story",      label: "Story"      },
  { key: "blog",       label: "Blog"       },
  { key: "email",      label: "Email"      },
  { key: "ad",         label: "Ad"         },
  { key: "other",      label: "Other"      },
];

const PLATFORM_MAP   = Object.fromEntries(PLATFORMS.map(p => [p.key, p]));
const TYPE_MAP       = Object.fromEntries(CONTENT_TYPES.map(t => [t.key, t]));
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

type ContentItem = {
  id: string; user_id: string; artwork_id?: string;
  title: string; platform: string; content_type: string;
  status: string; caption?: string; publish_date?: string;
  publish_time?: string; media_urls?: string[]; link?: string;
  notes?: string; created_at: string;
};
type Artwork = { id: string; title: string; images?: string[] };
type ViewTab = "kanban" | "calendar" | "list";

export default function PromotionPage() {
  const params       = useParams<{ id?: string }>();
  const artworkId    = params?.id || null; // If accessed from /dashboard/artworks/[id]/promotion

  const [content, setContent]       = useState<ContentItem[]>([]);
  const [artworks, setArtworks]     = useState<Artwork[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<ViewTab>("kanban");
  const [search, setSearch]         = useState("");
  const [filterArtwork, setFilterArtwork] = useState(artworkId || "all");
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm]     = useState(false);
  const [selected, setSelected]     = useState<ContentItem | null>(null);
  const [saving, setSaving]         = useState(false);
  const [dragId, setDragId]         = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState<string | null>(null);
  const [cardMenu, setCardMenu]     = useState<string | null>(null);
  const [calMonth, setCalMonth]     = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });

  const [form, setForm] = useState({
    title: "", platform: "instagram", content_type: "post",
    status: "idea", caption: "", publish_date: "", publish_time: "",
    link: "", notes: "", artwork_id: artworkId || "",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: ct }, { data: aw }] = await Promise.all([
      supabase.from("promotion_content").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("artworks").select("id,title,images").eq("user_id", user.id).order("title"),
    ]);
    setContent(ct || []);
    setArtworks(aw || []);
    setLoading(false);
  }

  async function saveContent(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    await supabase.from("promotion_content").insert({
      user_id: user.id, ...form,
      artwork_id: form.artwork_id || null,
      publish_date: form.publish_date || null,
      publish_time: form.publish_time || null,
      link: form.link || null, notes: form.notes || null,
      caption: form.caption || null,
    });
    setShowForm(false);
    resetForm(); setSaving(false); load();
  }

  function resetForm() {
    setForm({ title:"", platform:"instagram", content_type:"post", status:"idea", caption:"", publish_date:"", publish_time:"", link:"", notes:"", artwork_id: artworkId||"" });
  }

  async function moveToStage(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("promotion_content").update({ status }).eq("id", id);
    setContent(p => p.map(c => c.id === id ? { ...c, status } : c));
    if (selected?.id === id) setSelected(p => p ? { ...p, status } : p);
  }

  async function deleteContent(id: string) {
    if (!confirm("Delete this content item?")) return;
    const supabase = createClient();
    await supabase.from("promotion_content").delete().eq("id", id);
    setContent(p => p.filter(c => c.id !== id));
    setSelected(null); setCardMenu(null);
  }

  // ── Drag & Drop ──────────────────────────────────────────────
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id);
  }
  function onDragOver(e: React.DragEvent, key: string) { e.preventDefault(); setDragOver(key); }
  function onDrop(e: React.DragEvent, key: string) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (id) moveToStage(id, key);
    setDragId(null); setDragOver(null);
  }
  function onDragEnd() { setDragId(null); setDragOver(null); }

  // ── Filter ──────────────────────────────────────────────────
  const filtered = content.filter(c => {
    const q = search.toLowerCase();
    return (!search || c.title.toLowerCase().includes(q) || (c.caption||"").toLowerCase().includes(q))
      && (filterArtwork === "all" || c.artwork_id === filterArtwork)
      && (filterPlatform === "all" || c.platform === filterPlatform)
      && (filterStatus === "all" || c.status === filterStatus);
  });

  const sf = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const inputStyle: React.CSSProperties = { width:"100%", padding:"9px 12px", background:"#fff", border:"2px solid #E0D8CA", fontSize:13, fontFamily:"inherit", outline:"none", color:"#111110" };

  // ── Calendar helpers ──────────────────────────────────────────
  function isoDate(d: Date) { return d.toISOString().split("T")[0]; }
  function getDaysInMonth(y: number, m: number) { return new Date(y, m+1, 0).getDate(); }
  function getFirstDow(y: number, m: number) { let d = new Date(y, m, 1).getDay(); return d===0?6:d-1; }

  // ── Content Card ─────────────────────────────────────────────
  const ContentCard = ({ item }: { item: ContentItem }) => {
    const stage    = STAGE_MAP[item.status] || PROMO_STAGES[0];
    const platform = PLATFORM_MAP[item.platform];
    const artwork  = artworks.find(a => a.id === item.artwork_id);
    const artImg   = artwork && Array.isArray(artwork.images) ? artwork.images[0] : null;
    const isDragging = dragId === item.id;
    const menuOpen = cardMenu === item.id;

    return (
      <div draggable onDragStart={e => onDragStart(e, item.id)} onDragEnd={onDragEnd}
        style={{ background:"#fff", border:"2px solid #111110", boxShadow: isDragging?"none":"3px 3px 0 #111110", opacity: isDragging?0.4:1, marginBottom:10, cursor:"grab", userSelect:"none", transition:"box-shadow 0.12s, transform 0.12s" }}
        onMouseEnter={e => { if(!isDragging){(e.currentTarget as HTMLElement).style.transform="translate(-1px,-2px)";(e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110";}}}
        onMouseLeave={e => {(e.currentTarget as HTMLElement).style.transform="";(e.currentTarget as HTMLElement).style.boxShadow=isDragging?"none":"3px 3px 0 #111110";}}>

        {/* Artwork thumbnail strip */}
        {artImg && (
          <div style={{ height:60, overflow:"hidden", borderBottom:"1px solid #E0D8CA", position:"relative" }}>
            <img src={artImg} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.3)", display:"flex", alignItems:"flex-end", padding:"6px 10px" }}>
              <span style={{ fontSize:9, fontWeight:800, color:"#fff", textTransform:"uppercase", letterSpacing:"0.08em" }}>{artwork?.title}</span>
            </div>
          </div>
        )}

        <div onClick={() => setSelected(item)} style={{ padding:"10px 12px", cursor:"pointer" }}>
          {/* Platform + type */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
            <div style={{ padding:"2px 8px", background: platform?.color||"#9B8F7A", fontSize:8, fontWeight:900, color:"#fff", textTransform:"uppercase", letterSpacing:"0.1em" }}>
              {platform?.label||item.platform}
            </div>
            <div style={{ padding:"2px 7px", background:"#F5F0E8", border:"1px solid #E0D8CA", fontSize:8, fontWeight:700, color:"#9B8F7A", textTransform:"uppercase" }}>
              {TYPE_MAP[item.content_type]?.label||item.content_type}
            </div>
          </div>
          {/* Title */}
          <div style={{ fontSize:13, fontWeight:800, color:"#111110", marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div>
          {/* Caption preview */}
          {item.caption && (
            <div style={{ fontSize:10, color:"#9B8F7A", lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
              {item.caption}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 12px 10px" }}>
          {item.publish_date
            ? <span style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", background:"#F5F0E8", border:"1px solid #E0D8CA", padding:"2px 7px" }}>
                {new Date(item.publish_date).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
              </span>
            : <span/>}
          {/* 3-dot menu */}
          <div style={{ position:"relative" }}>
            <button onClick={e=>{e.stopPropagation();setCardMenu(menuOpen?null:item.id);}}
              style={{ width:26, height:26, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <MoreHorizontal size={13}/>
            </button>
            {menuOpen && (
              <div style={{ position:"absolute", bottom:"calc(100% + 4px)", right:0, background:"#fff", border:"2px solid #111110", boxShadow:"4px 4px 0 #111110", zIndex:30, minWidth:150, overflow:"hidden" }}
                onClick={e=>e.stopPropagation()}>
                {[
                  { label:"View detail", action:()=>{setSelected(item);setCardMenu(null);} },
                  { label:"Mark published", action:()=>{moveToStage(item.id,"published");setCardMenu(null);} },
                  { label:"Delete", action:()=>deleteContent(item.id), danger:true },
                ].map(a=>(
                  <button key={a.label} onClick={a.action}
                    style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"9px 14px", border:"none", borderBottom:"1px solid #F5F0E8", background:"none", cursor:"pointer", fontSize:12, fontWeight:600, color:(a as any).danger?"#FF6B6B":"#111110", textAlign:"left" }}
                    onMouseEnter={e=>(e.currentTarget.style.background=(a as any).danger?"#FFF5F5":"#FFFBEA")}
                    onMouseLeave={e=>(e.currentTarget.style.background="none")}>
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Calendar ─────────────────────────────────────────────────
  const CalendarView = () => {
    const { year, month } = calMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDow    = getFirstDow(year, month);
    const todayStr    = isoDate(new Date());

    return (
      <div style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
        {/* Nav */}
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"2px solid #111110", background:"#FFFBEA" }}>
          <button onClick={()=>setCalMonth(p=>{ let m=p.month-1,y=p.year; if(m<0){m=11;y--;} return {year:y,month:m}; })}
            style={{ width:30, height:30, border:"2px solid #111110", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <ChevronLeft size={14}/>
          </button>
          <span style={{ fontSize:16, fontWeight:900, color:"#111110", flex:1 }}>{MONTHS[month]} {year}</span>
          <button onClick={()=>setCalMonth(p=>{ let m=p.month+1,y=p.year; if(m>11){m=0;y++;} return {year:y,month:m}; })}
            style={{ width:30, height:30, border:"2px solid #111110", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <ChevronRight size={14}/>
          </button>
        </div>
        {/* Day headers */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #E0D8CA" }}>
          {DAYS_SHORT.map(d=>(
            <div key={d} style={{ padding:"8px 0", textAlign:"center", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.08em", borderRight:"1px solid #E0D8CA" }}>{d}</div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {/* Empty cells before first */}
          {Array.from({length:firstDow}).map((_,i)=>(
            <div key={`p${i}`} style={{ minHeight:100, borderBottom:"1px solid #E0D8CA", borderRight:"1px solid #E0D8CA", background:"#FAFAF8" }}/>
          ))}
          {/* Days */}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const day = i+1;
            const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
            const dayItems = filtered.filter(c=>c.publish_date===dateStr);
            const isToday = dateStr===todayStr;
            const colIdx = (firstDow+i)%7;
            return (
              <div key={day} style={{ minHeight:100, borderBottom:"1px solid #E0D8CA", borderRight:colIdx===6?"none":"1px solid #E0D8CA", padding:"8px 8px 4px", background:"#fff" }}>
                <div style={{ marginBottom:4 }}>
                  {isToday
                    ? <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:22, height:22, background:"#111110", color:"#FFD400", fontSize:11, fontWeight:900, borderRadius:"50%" }}>{day}</span>
                    : <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>{day}</span>}
                </div>
                {dayItems.slice(0,3).map(item=>{
                  const pl = PLATFORM_MAP[item.platform];
                  return (
                    <div key={item.id} onClick={()=>setSelected(item)}
                      style={{ display:"flex", alignItems:"center", gap:4, padding:"2px 5px", marginBottom:2, background:STAGE_MAP[item.status]?.bg||"#F5F0E8", border:`1px solid ${STAGE_MAP[item.status]?.color||"#E0D8CA"}`, fontSize:9, fontWeight:700, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}>
                      <div style={{ width:5, height:5, borderRadius:"50%", background:pl?.color||"#9B8F7A", flexShrink:0 }}/>
                      {item.title}
                    </div>
                  );
                })}
                {dayItems.length>3 && <div style={{ fontSize:8, color:"#9B8F7A", fontWeight:700 }}>+{dayItems.length-3} more</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`*{box-sizing:border-box} .promo-col-drop{border-color:#FFD400!important;background:#FFFBEA!important}`}</style>
      {cardMenu && <div style={{ position:"fixed", inset:0, zIndex:9 }} onClick={()=>setCardMenu(null)}/>}

      <div>
        {/* ── Header ── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {artworkId && (
              <Link href={`/dashboard/artworks/${artworkId}`} style={{ textDecoration:"none" }}>
                <button style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#fff", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  <ArrowLeft size={13}/> Artwork
                </button>
              </Link>
            )}
            <div>
              <h1 style={{ fontSize:26, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", margin:0, display:"flex", alignItems:"center", gap:10 }}>
                <Megaphone size={22} color="#FFD400"/> Promotion
              </h1>
              <p style={{ fontSize:13, color:"#9B8F7A", margin:"4px 0 0" }}>{filtered.length} content items</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {/* View tabs */}
            <div style={{ display:"flex", border:"2px solid #111110", overflow:"hidden" }}>
              {[["kanban","Kanban","columns"],["calendar","Calendar","calendar"],["list","List","table"]].map(([k,l,_iconKey])=>(
                <button key={k} onClick={()=>setTab(k as ViewTab)}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 12px", border:"none", borderRight:"1px solid #E0D8CA", background:tab===k?"#111110":"#fff", color:tab===k?"#FFD400":"#111110", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                  {l}
                </button>
              ))}
            </div>
            {/* Filters */}
            <select value={filterArtwork} onChange={e=>setFilterArtwork(e.target.value)}
              style={{ height:34, padding:"0 10px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
              <option value="all">All artworks</option>
              {artworks.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
            <select value={filterPlatform} onChange={e=>setFilterPlatform(e.target.value)}
              style={{ height:34, padding:"0 10px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
              <option value="all">All platforms</option>
              {PLATFORMS.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
              style={{ height:34, padding:"0 10px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
              <option value="all">All statuses</option>
              {PROMO_STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            {/* Search */}
            <div style={{ display:"flex", alignItems:"center", gap:6, border:"2px solid #111110", padding:"0 10px", background:"#fff", height:34 }}>
              <Search size={12} color="#9B8F7A"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…"
                style={{ border:"none", outline:"none", fontSize:12, fontFamily:"inherit", background:"transparent", width:110, color:"#111110" }}/>
            </div>
            <button onClick={()=>setShowForm(true)}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#FFD400", border:"2px solid #111110", fontSize:12, fontWeight:800, cursor:"pointer", boxShadow:"2px 2px 0 #111110", whiteSpace:"nowrap" }}>
              <Plus size={14} strokeWidth={3}/> New Content
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════
            KANBAN VIEW
        ════════════════════════════════════ */}
        {tab === "kanban" && (
          <div style={{ display:"flex", gap:16, overflowX:"auto", paddingBottom:20, alignItems:"flex-start" }}>
            {PROMO_STAGES.map(stage=>{
              const items = filtered.filter(c=>c.status===stage.key);
              const isDragTarget = dragOver===stage.key && dragId!==null;
              return (
                <div key={stage.key}
                  onDragOver={e=>onDragOver(e,stage.key)}
                  onDrop={e=>onDrop(e,stage.key)}
                  onDragLeave={e=>{ if(!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null); }}
                  className={isDragTarget?"promo-col-drop":""}
                  style={{ minWidth:260, width:260, flexShrink:0, background:"#FAFAF8", border:`2px solid ${isDragTarget?"#FFD400":"#E0D8CA"}`, padding:"12px 12px 4px", transition:"border-color 0.15s" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:stage.color, border:"2px solid #111110", flexShrink:0 }}/>
                    <span style={{ fontSize:11, fontWeight:900, color:"#111110", textTransform:"uppercase", letterSpacing:"0.1em", flex:1 }}>{stage.label}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", background:"#fff", border:"1px solid #E0D8CA", padding:"1px 7px", borderRadius:12 }}>{items.length}</span>
                    <button onClick={()=>{setShowForm(true);setForm(p=>({...p,status:stage.key}));}}
                      style={{ width:22, height:22, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
                      <Plus size={11}/>
                    </button>
                  </div>
                  {items.length===0 && <div style={{ padding:"18px 0", textAlign:"center", border:"2px dashed #E0D8CA", marginBottom:10, color:"#d4cfc4", fontSize:11, fontWeight:600 }}>Drop here</div>}
                  {items.map(item=><ContentCard key={item.id} item={item}/>)}
                  <button onClick={()=>{setShowForm(true);setForm(p=>({...p,status:stage.key}));}}
                    style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"center", width:"100%", padding:"8px", border:"2px dashed #d4cfc4", background:"transparent", fontSize:11, fontWeight:700, color:"#9B8F7A", cursor:"pointer", marginBottom:8 }}>
                    <Plus size={11}/> Add here
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════
            CALENDAR VIEW
        ════════════════════════════════════ */}
        {tab === "calendar" && <CalendarView/>}

        {/* ════════════════════════════════════
            LIST VIEW
        ════════════════════════════════════ */}
        {tab === "list" && (
          <div style={{ background:"#fff", border:"2px solid #111110", boxShadow:"3px 3px 0 #111110", overflow:"hidden" }}>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:800 }}>
                <thead>
                  <tr>
                    {["Title","Artwork","Platform","Type","Status","Publish Date","Actions"].map((h,i)=>(
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", borderBottom:"2px solid #111110", borderRight:i<6?"1px solid #E0D8CA":"none", background:"#F5F0E8", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"#9B8F7A" }}>Loading…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding:40, textAlign:"center", color:"#9B8F7A" }}>No content yet — create your first item above.</td></tr>
                  ) : filtered.map(item=>{
                    const stage = STAGE_MAP[item.status]||PROMO_STAGES[0];
                    const pl    = PLATFORM_MAP[item.platform];
                    const aw    = artworks.find(a=>a.id===item.artwork_id);
                    const td: React.CSSProperties = { padding:"10px 14px", borderBottom:"1px solid #E0D8CA", borderRight:"1px solid #E0D8CA", fontSize:13, verticalAlign:"middle" };
                    return (
                      <tr key={item.id} style={{ cursor:"pointer" }}
                        onMouseEnter={e=>{Array.from(e.currentTarget.cells).forEach(c=>{(c as HTMLElement).style.background="#FFFBEA";})}}
                        onMouseLeave={e=>{Array.from(e.currentTarget.cells).forEach(c=>{(c as HTMLElement).style.background="transparent";})}}
                        onClick={()=>setSelected(item)}>
                        <td style={td}><div style={{ fontWeight:700, color:"#111110", maxWidth:200, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.title}</div></td>
                        <td style={td}><div style={{ fontSize:12, color:"#9B8F7A", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{aw?.title||"—"}</div></td>
                        <td style={td}><div style={{ display:"inline-block", padding:"2px 8px", background:pl?.color||"#9B8F7A", fontSize:10, fontWeight:800, color:"#fff" }}>{pl?.label||item.platform}</div></td>
                        <td style={td}><div style={{ fontSize:11, color:"#5C5346" }}>{TYPE_MAP[item.content_type]?.label||item.content_type}</div></td>
                        <td style={td}>
                          <div style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 8px", background:stage.bg, border:`1.5px solid ${stage.color}`, fontSize:10, fontWeight:800, color:stage.color, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                            {stage.label}
                          </div>
                        </td>
                        <td style={td}><div style={{ fontSize:12, color:"#9B8F7A" }}>{item.publish_date ? new Date(item.publish_date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}</div></td>
                        <td style={{ ...td, borderRight:"none" }} onClick={e=>e.stopPropagation()}>
                          <button onClick={()=>deleteContent(item.id)} style={{ width:28, height:28, border:"1.5px solid #FF6B6B", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
                            <Trash2 size={12} color="#FF6B6B"/>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            CONTENT DETAIL MODAL
        ════════════════════════════════════ */}
        {selected && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={()=>setSelected(null)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:500, maxHeight:"90vh", overflowY:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", borderBottom:"2px solid #111110", background:"#FFFBEA" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ padding:"2px 8px", background:PLATFORM_MAP[selected.platform]?.color||"#9B8F7A", fontSize:9, fontWeight:900, color:"#fff", textTransform:"uppercase" }}>{PLATFORM_MAP[selected.platform]?.label||selected.platform}</div>
                  <div style={{ padding:"2px 7px", background:"#F5F0E8", border:"1px solid #E0D8CA", fontSize:9, fontWeight:700, color:"#9B8F7A", textTransform:"uppercase" }}>{TYPE_MAP[selected.content_type]?.label||selected.content_type}</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>deleteContent(selected.id)} style={{ width:30, height:30, border:"1.5px solid #FF6B6B", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><Trash2 size={12} color="#FF6B6B"/></button>
                  <button onClick={()=>setSelected(null)} style={{ width:30, height:30, border:"1.5px solid #E0D8CA", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}><X size={13}/></button>
                </div>
              </div>
              <div style={{ padding:"20px 20px 24px" }}>
                <h2 style={{ fontSize:20, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", marginBottom:16 }}>{selected.title}</h2>
                {/* Stage change */}
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>Status</div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {PROMO_STAGES.map(s=>{
                      const active = selected.status===s.key;
                      return <button key={s.key} onClick={()=>moveToStage(selected.id,s.key)}
                        style={{ padding:"4px 10px", border:`2px solid ${active?s.color:"#E0D8CA"}`, background:active?s.color:"#fff", fontSize:10, fontWeight:800, color:active?"#fff":"#9B8F7A", cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.08em" }}>
                        {active&&"✓ "}{s.label}
                      </button>;
                    })}
                  </div>
                </div>
                {/* Meta */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 }}>
                  {[
                    ["Artwork", artworks.find(a=>a.id===selected.artwork_id)?.title],
                    ["Publish date", selected.publish_date ? new Date(selected.publish_date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"}) : null],
                    ["Time", selected.publish_time||null],
                    ["Link", selected.link ? "View →" : null],
                  ].filter(([,v])=>v).map(([k,v])=>(
                    <div key={k as string} style={{ background:"#F5F0E8", padding:"8px 12px" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:2 }}>{k}</div>
                      {k==="Link" ? <a href={selected.link} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, fontWeight:700, color:"#4A90D9" }}>View published ↗</a>
                        : <div style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{v}</div>}
                    </div>
                  ))}
                </div>
                {selected.caption && (
                  <div style={{ background:"#FFFBEA", border:"1px solid #E0D8CA", padding:"12px 14px", marginBottom:16 }}>
                    <div style={{ fontSize:9, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Caption / Text</div>
                    <p style={{ fontSize:13, color:"#5C5346", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{selected.caption}</p>
                  </div>
                )}
                {selected.notes && (
                  <div style={{ background:"#F5F0E8", padding:"10px 14px" }}>
                    <div style={{ fontSize:9, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:4 }}>Notes</div>
                    <p style={{ fontSize:12, color:"#5C5346", lineHeight:1.6, margin:0 }}>{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════
            NEW CONTENT FORM
        ════════════════════════════════════ */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={()=>setShowForm(false)}>
            <div onClick={e=>e.stopPropagation()}
              style={{ background:"#fff", border:"2px solid #111110", boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto" }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"2px solid #111110", background:"#FFD400" }}>
                <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", margin:0 }}>New Content Item</h2>
                <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18}/></button>
              </div>
              <form onSubmit={saveContent} style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Title *</label>
                  <input required value={form.title} onChange={sf("title")} placeholder="Post title / content name" style={inputStyle}
                    onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Artwork</label>
                  <select value={form.artwork_id} onChange={sf("artwork_id")} style={{ ...inputStyle, cursor:"pointer" }}>
                    <option value="">— No specific artwork —</option>
                    {artworks.map(a=><option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Platform *</label>
                    <select value={form.platform} onChange={sf("platform")} style={{ ...inputStyle, cursor:"pointer" }}>
                      {PLATFORMS.map(p=><option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Type *</label>
                    <select value={form.content_type} onChange={sf("content_type")} style={{ ...inputStyle, cursor:"pointer" }}>
                      {CONTENT_TYPES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Status</label>
                    <select value={form.status} onChange={sf("status")} style={{ ...inputStyle, cursor:"pointer" }}>
                      {PROMO_STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Publish date</label>
                    <input type="date" value={form.publish_date} onChange={sf("publish_date")} style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")}/>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Time</label>
                    <input type="time" value={form.publish_time} onChange={sf("publish_time")} style={inputStyle}
                      onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")}/>
                  </div>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Caption / Text</label>
                  <textarea rows={4} value={form.caption} onChange={(e) => setForm(p => ({...p, caption: e.target.value}))} placeholder="Write your post caption here…"
                    style={{ ...inputStyle, resize:"vertical" }}
                    onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Link (after publishing)</label>
                  <input type="url" value={form.link} onChange={sf("link")} placeholder="https://…" style={inputStyle}
                    onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")}/>
                </div>
                <div>
                  <label style={{ display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:6 }}>Notes</label>
                  <textarea rows={2} value={form.notes} onChange={(e) => setForm(p => ({...p, notes: e.target.value}))} placeholder="Internal notes…"
                    style={{ ...inputStyle, resize:"vertical" }}
                    onFocus={e=>(e.target.style.borderColor="#FFD400")} onBlur={e=>(e.target.style.borderColor="#E0D8CA")}/>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={()=>setShowForm(false)} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer" }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ flex:1, padding:"11px", border:"2px solid #111110", background:"#FFD400", color:"#111110", fontSize:13, fontWeight:800, cursor:"pointer", boxShadow:"3px 3px 0 #111110" }}>
                    {saving ? "Saving…" : "Create Content"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
