"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Users, ImageIcon, Calendar, Settings, LayoutDashboard,
  Palette, Building2, Megaphone, Globe, Edit2, Trash2,
  Plus, X, Save, Search, Eye, EyeOff,
  RefreshCw, Shield, Check, LogOut, Monitor,
} from "lucide-react";

type Tab = "overview" | "users" | "artworks" | "events" | "hero" | "campaigns" | "settings";
type Profile = { id: string; full_name: string; username?: string; role?: string; avatar_url?: string; location?: string; created_at: string; bio?: string; };
type Artwork = { id: string; title: string; medium?: string; price?: number; status: string; images?: string[]; created_at: string; user_id: string; artist_name?: string; };
type Event = { id: string; title: string; event_type?: string; start_date?: string; is_online?: boolean; is_public?: boolean; user_id: string; artist_name?: string; venue?: string; };
type Slide = { id: string; image_url: string; order: number; active: boolean; text_content?: string; text_color?: string; text_x?: number; text_y?: number; text_size?: number; quote_open_x?: number; quote_open_y?: number; quote_close_x?: number; quote_close_y?: number; quote_color?: string; quote_size?: number; };
type HeroConfig = { id?: string; headline_line1?: string; headline_line2?: string; headline_line3?: string; subtext?: string; cta_label?: string; cta_href?: string; image_url?: string; image_credit_name?: string; image_credit_artwork?: string; };
type SiteSettings = { id?: string; site_name?: string; site_tagline?: string; join_enabled?: boolean; maintenance_mode?: boolean; footer_text?: string; og_title?: string; og_description?: string; };
type DragTarget = "text" | "open" | "close" | null;

function fmtDate(d?: string | null) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
function roleColor(r?: string) {
  if (r === "artist")  return { bg: "#DCFCE7", color: "#16A34A" };
  if (r === "gallery") return { bg: "#EDE9FE", color: "#8B5CF6" };
  if (r === "admin")   return { bg: "#FEF9C3", color: "#CA8A04" };
  return { bg: "#F5F0E8", color: "#9B8F7A" };
}

const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "2px solid #E8E0D0", borderRadius: 10, fontSize: 13, fontFamily: "inherit", fontWeight: 600, color: "#111110", background: "#fff", outline: "none" };
const lbl: React.CSSProperties = { display: "block", fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase" as const, letterSpacing: "0.14em", marginBottom: 5 };
const card: React.CSSProperties = { background: "#fff", border: "2px solid #E8E0D0", borderRadius: 14, padding: "14px 16px" };

function SlideEditor({ slide, onSave, onDelete }: { slide: Slide; onSave: (s: Slide) => void; onDelete: () => void }) {
  const [p, setP] = useState({ ...slide });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dragRef = useRef<DragTarget>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  function getPct(e: MouseEvent) {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: Math.min(98, Math.max(0, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(98, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) };
  }

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current || !canvasRef.current) return;
      const { x, y } = getPct(e);
      const t = dragRef.current;
      setP(prev => ({ ...prev, ...(t === "text" ? { text_x: x, text_y: y } : {}), ...(t === "open" ? { quote_open_x: x, quote_open_y: y } : {}), ...(t === "close" ? { quote_close_x: x, quote_close_y: y } : {}) }));
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  async function save() {
    setSaving(true);
    const sb = createClient();
    await sb.from("campaign_slides").update({ text_content: p.text_content, text_color: p.text_color, text_size: p.text_size, text_x: p.text_x, text_y: p.text_y, quote_open_x: p.quote_open_x, quote_open_y: p.quote_open_y, quote_close_x: p.quote_close_x, quote_close_y: p.quote_close_y, quote_color: p.quote_color, quote_size: p.quote_size, active: p.active, order: p.order }).eq("id", p.id);
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
    onSave(p as Slide);
  }

  const drag = (t: DragTarget) => (e: React.MouseEvent) => { e.preventDefault(); dragRef.current = t; };
  const COLORS = ["#ffffff","#111110","#FFD400","#4ECDC4","#FF6B6B"];

  return (
    <div style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
      <div ref={canvasRef} style={{ position: "relative", width: "100%", aspectRatio: "16/6", overflow: "hidden", cursor: "crosshair", userSelect: "none", background: "#111" }}>
        <img src={p.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        <div onMouseDown={drag("text")} style={{ position: "absolute", left: `${p.text_x || 10}%`, top: `${p.text_y || 50}%`, cursor: "grab", transform: "translate(0,-50%)", padding: "4px 8px", border: "1.5px dashed rgba(255,212,0,0.7)", borderRadius: 6, background: "rgba(0,0,0,0.3)" }}>
          <div style={{ fontFamily: "'Darker Grotesque',sans-serif", fontSize: `${(p.text_size || 72) * 0.2}px`, fontWeight: 900, color: p.text_color || "#fff", whiteSpace: "nowrap", pointerEvents: "none" }}>{p.text_content || "Text"}</div>
        </div>
        <div onMouseDown={drag("open")} style={{ position: "absolute", left: `${p.quote_open_x || 5}%`, top: `${p.quote_open_y || 10}%`, cursor: "grab", padding: "2px", border: "1.5px dashed rgba(255,212,0,0.6)", borderRadius: 4 }}>
          <span style={{ fontSize: `${(p.quote_size || 120) * 0.15}px`, color: p.quote_color || "#FFD400", fontWeight: 900, pointerEvents: "none", lineHeight: 1 }}>"</span>
        </div>
        <div onMouseDown={drag("close")} style={{ position: "absolute", left: `${p.quote_close_x || 80}%`, top: `${p.quote_close_y || 60}%`, cursor: "grab", padding: "2px", border: "1.5px dashed rgba(255,212,0,0.6)", borderRadius: 4 }}>
          <span style={{ fontSize: `${(p.quote_size || 120) * 0.15}px`, color: p.quote_color || "#FFD400", fontWeight: 900, pointerEvents: "none", lineHeight: 1 }}>"</span>
        </div>
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", color: "#FFD400", fontSize: 9, fontWeight: 800, padding: "2px 8px", borderRadius: 9999, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>Drag to reposition</div>
      </div>
      <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={lbl}>Text content</label>
          <input style={inp} value={p.text_content || ""} onChange={e => setP(v => ({ ...v, text_content: e.target.value }))} placeholder="Art while you breathe" />
        </div>
        <div>
          <label style={lbl}>Text color</label>
          <div style={{ display: "flex", gap: 6 }}>
            {COLORS.map(c => <div key={c} onClick={() => setP(v => ({ ...v, text_color: c }))} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: `2.5px solid ${p.text_color === c ? "#111110" : "#E8E0D0"}`, cursor: "pointer", boxShadow: p.text_color === c ? "0 0 0 2px #FFD400" : "none" }}/>)}
          </div>
        </div>
        <div>
          <label style={lbl}>Text size (px)</label>
          <input style={inp} type="number" value={p.text_size || 72} onChange={e => setP(v => ({ ...v, text_size: +e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Quote color</label>
          <div style={{ display: "flex", gap: 6 }}>
            {COLORS.map(c => <div key={c} onClick={() => setP(v => ({ ...v, quote_color: c }))} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: `2.5px solid ${p.quote_color === c ? "#111110" : "#E8E0D0"}`, cursor: "pointer", boxShadow: p.quote_color === c ? "0 0 0 2px #FFD400" : "none" }}/>)}
          </div>
        </div>
        <div>
          <label style={lbl}>Quote size (px)</label>
          <input style={inp} type="number" value={p.quote_size || 120} onChange={e => setP(v => ({ ...v, quote_size: +e.target.value }))} />
        </div>
        <div>
          <label style={lbl}>Slide order</label>
          <input style={inp} type="number" value={p.order || 0} onChange={e => setP(v => ({ ...v, order: +e.target.value }))} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", gridColumn: "1/-1" }} onClick={() => setP(v => ({ ...v, active: !v.active }))}>
          <div style={{ width: 40, height: 22, borderRadius: 11, background: p.active ? "#16A34A" : "#E8E0D0", border: "2px solid #111110", position: "relative", flexShrink: 0, transition: "background .2s" }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: p.active ? 22 : 2, transition: "left .2s" }}/>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{p.active ? "Active — shown in carousel" : "Hidden — not shown"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, gridColumn: "1/-1" }}>
          <button onClick={save} disabled={saving} style={{ flex: 1, padding: "9px 0", border: "2.5px solid #111110", borderRadius: 10, background: saved ? "#DCFCE7" : "#FFD400", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: saved ? "#16A34A" : "#111110" }}>
            {saved ? <><Check size={13}/> Saved!</> : saving ? "Saving…" : <><Save size={13}/> Save slide</>}
          </button>
          <button onClick={onDelete} style={{ padding: "9px 14px", border: "2px solid #FFE4E6", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#EF4444" }}>
            <Trash2 size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const sb = createClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [adminPass, setAdminPass] = useState("");
  const [authError, setAuthError] = useState("");
  const [users, setUsers]       = useState<Profile[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [events, setEvents]     = useState<Event[]>([]);
  const [slides, setSlides]     = useState<Slide[]>([]);
  const [hero, setHero]         = useState<HeroConfig>({});
  const [settings, setSettings] = useState<SiteSettings>({});
  const [loading, setLoading]   = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [artSearch, setArtSearch]   = useState("");
  const [evSearch, setEvSearch]     = useState("");
  const [editUser, setEditUser]     = useState<Profile | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [newSlideUrl, setNewSlideUrl] = useState("");
  const [addingSlide, setAddingSlide] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);
  const [heroUploadErr, setHeroUploadErr] = useState("");
  const heroFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("artomango_admin");
    if (stored === "granted") { setAuthed(true); loadAll(); }
    setAuthLoading(false);
  }, []);

  function tryAuth() {
    const PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "artomango2026";
    if (adminPass === PASS) { sessionStorage.setItem("artomango_admin", "granted"); setAuthed(true); setAuthError(""); loadAll(); }
    else setAuthError("Wrong password. Try again.");
  }
  function signOut() { sessionStorage.removeItem("artomango_admin"); setAuthed(false); }

  async function loadAll() {
    setLoading(true);
    const [{ data: u }, { data: aw }, { data: ev }, { data: sl }, { data: hc }, { data: st }] = await Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("artworks").select("id,title,medium,price,status,images,created_at,user_id").order("created_at", { ascending: false }).limit(200),
      sb.from("exhibitions").select("id,title,event_type,start_date,is_online,is_public,user_id,venue").order("created_at", { ascending: false }).limit(200),
      sb.from("campaign_slides").select("*").order("order"),
      sb.from("hero_config").select("*").limit(1).maybeSingle(),
      sb.from("site_settings").select("*").limit(1).maybeSingle(),
    ]);
    const pm: Record<string,string> = {};
    (u || []).forEach((p: any) => { pm[p.id] = p.full_name; });
    setUsers(u || []);
    setArtworks((aw || []).map((a: any) => ({ ...a, artist_name: pm[a.user_id] || "Unknown" })));
    setEvents((ev || []).map((e: any) => ({ ...e, artist_name: pm[e.user_id] || "Unknown" })));
    setSlides(sl || []);
    setHero(hc || {});
    setSettings(st || {});
    setLoading(false);
  }

  async function saveHero() {
    setSaving(true);
    if (hero.id) { await sb.from("hero_config").update(hero).eq("id", hero.id); }
    else { const { data } = await sb.from("hero_config").insert(hero).select().single(); if (data) setHero(data); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function saveSettings() {
    setSaving(true);
    if (settings.id) { await sb.from("site_settings").update(settings).eq("id", settings.id); }
    else { const { data } = await sb.from("site_settings").insert(settings).select().single(); if (data) setSettings(data); }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function uploadHeroImage(file: File) {
    setHeroUploading(true);
    setHeroUploadErr("");
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `hero/hero-banner-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage.from("artworks").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = sb.storage.from("artworks").getPublicUrl(path);
      setHero(p => ({ ...p, image_url: publicUrl }));
    } catch (e: any) {
      setHeroUploadErr(e?.message || "Upload failed. Check your Supabase storage bucket permissions.");
    }
    setHeroUploading(false);
  }

  async function updateUser(u: Profile) {
    await sb.from("profiles").update({ full_name: u.full_name, role: u.role, bio: u.bio, location: u.location, username: u.username }).eq("id", u.id);
    setUsers(p => p.map(x => x.id === u.id ? u : x)); setEditUser(null);
  }
  async function deleteUser(id: string) {
    if (!confirm("Delete this user permanently?")) return;
    await sb.from("profiles").delete().eq("id", id);
    setUsers(p => p.filter(x => x.id !== id));
  }
  async function setArtworkStatus(id: string, status: string) {
    await sb.from("artworks").update({ status }).eq("id", id);
    setArtworks(p => p.map(a => a.id === id ? { ...a, status } : a));
  }
  async function deleteArtwork(id: string) {
    if (!confirm("Delete this artwork?")) return;
    await sb.from("artworks").delete().eq("id", id);
    setArtworks(p => p.filter(a => a.id !== id));
  }
  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await sb.from("exhibitions").delete().eq("id", id);
    setEvents(p => p.filter(e => e.id !== id));
  }
  async function toggleEventPublic(id: string, cur: boolean) {
    await sb.from("exhibitions").update({ is_public: !cur }).eq("id", id);
    setEvents(p => p.map(e => e.id === id ? { ...e, is_public: !cur } : e));
  }
  async function addSlide() {
    if (!newSlideUrl.trim()) return;
    setAddingSlide(true);
    const { data } = await sb.from("campaign_slides").insert({ image_url: newSlideUrl.trim(), order: slides.length, active: true, text_x: 10, text_y: 50, text_content: "Art while you", text_color: "#ffffff", text_size: 72, quote_open_x: 5, quote_open_y: 10, quote_close_x: 80, quote_close_y: 60, quote_color: "#FFD400", quote_size: 120 }).select().single();
    if (data) setSlides(p => [...p, data]);
    setNewSlideUrl(""); setAddingSlide(false);
  }
  async function deleteSlide(id: string) {
    if (!confirm("Remove this slide?")) return;
    await sb.from("campaign_slides").delete().eq("id", id);
    setSlides(p => p.filter(s => s.id !== id));
  }

  const fUsers    = users.filter(u => !userSearch || u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || u.username?.toLowerCase().includes(userSearch.toLowerCase()));
  const fArtworks = artworks.filter(a => !artSearch || a.title.toLowerCase().includes(artSearch.toLowerCase()) || (a.artist_name||"").toLowerCase().includes(artSearch.toLowerCase()));
  const fEvents   = events.filter(e => !evSearch || e.title.toLowerCase().includes(evSearch.toLowerCase()));

  const stats = { users: users.length, artists: users.filter(u => u.role === "artist").length, galleries: users.filter(u => u.role === "gallery").length, artworks: artworks.length, available: artworks.filter(a => a.status?.toLowerCase() === "available").length, events: events.length, slides: slides.filter(s => s.active).length };

  if (authLoading) return <div style={{ minHeight:"100vh", background:"#111110", display:"flex", alignItems:"center", justifyContent:"center", fontSize:40 }}>🥭</div>;

  if (!authed) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@700;800;900&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Darker Grotesque',sans-serif;background:#111110}`}</style>
      <div style={{ minHeight:"100vh", background:"#111110", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:20, padding:"36px 32px", width:"100%", maxWidth:380, boxShadow:"8px 8px 0 #FFD400" }}>
          <div style={{ fontSize:44, textAlign:"center", marginBottom:16 }}>🥭</div>
          <h1 style={{ fontSize:24, fontWeight:900, color:"#111110", letterSpacing:"-0.8px", marginBottom:4, textAlign:"center" }}>Admin Panel</h1>
          <p style={{ fontSize:13, color:"#9B8F7A", fontWeight:600, textAlign:"center", marginBottom:24 }}>Enter the admin password to continue</p>
          <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} onKeyDown={e => e.key === "Enter" && tryAuth()} style={{ ...inp, marginBottom:12, fontSize:15 }} placeholder="Password" />
          {authError && <div style={{ fontSize:12, color:"#EF4444", fontWeight:700, marginBottom:10 }}>{authError}</div>}
          <button onClick={tryAuth} style={{ width:"100%", padding:13, border:"2.5px solid #111110", borderRadius:12, background:"#FFD400", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110" }}>
            <Shield size={14} style={{ display:"inline", marginRight:6, verticalAlign:"middle" }}/> Enter Admin
          </button>
          <a href="/" style={{ display:"block", textAlign:"center", marginTop:16, fontSize:12, color:"#9B8F7A", fontWeight:700, textDecoration:"none" }}>← Back to site</a>
        </div>
      </div>
    </>
  );

  const TABS: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key:"overview",  label:"Overview",    icon:<LayoutDashboard size={15}/> },
    { key:"users",     label:"Users",       icon:<Users size={15}/>,      count:stats.users },
    { key:"artworks",  label:"Artworks",    icon:<ImageIcon size={15}/>,  count:stats.artworks },
    { key:"events",    label:"Events",      icon:<Calendar size={15}/>,   count:stats.events },
    { key:"hero",      label:"Hero Banner", icon:<Monitor size={15}/> },
    { key:"campaigns", label:"Campaigns",   icon:<Megaphone size={15}/>,  count:stats.slides },
    { key:"settings",  label:"Settings",    icon:<Settings size={15}/> },
  ];

  const SaveBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} disabled={saving} style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 20px", border:"2.5px solid #111110", borderRadius:12, background:saved?"#DCFCE7":"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:saved?"3px 3px 0 #16A34A":"3px 3px 0 #111110", color:saved?"#16A34A":"#111110" }}>
      {saved ? <><Check size={14}/> Saved!</> : <><Save size={14}/> {saving ? "Saving…" : "Save"}</>}
    </button>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Darker Grotesque',sans-serif;background:#F5F0E8;color:#111110}
        input,textarea,select{font-family:inherit}
        input:focus,textarea:focus,select:focus{outline:none;border-color:#FFD400!important;box-shadow:0 0 0 3px rgba(255,212,0,.2)!important}
        .atab{display:flex;align-items:center;gap:7px;padding:14px 18px;border:none;background:transparent;color:#666;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap;transition:all .15s}
        .atab:hover{color:#fff}
        .atab.active{color:#FFD400;border-bottom-color:#FFD400}
        .cnt{background:#333;color:#FFD400;font-size:9px;font-weight:800;padding:1px 6px;border-radius:9999px;min-width:18px;text-align:center}
        .atab.active .cnt{background:#FFD400;color:#111110}
        .row-item{display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid #F5F0E8;transition:background .1s}
        .row-item:hover{background:#FFFBEA}
        .row-item:last-child{border-bottom:none}
        .badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:9999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
        .act-btn{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border:1.5px solid #E8E0D0;border-radius:8px;background:#fff;cursor:pointer;transition:all .15s;flex-shrink:0;text-decoration:none;color:#111110}
        .act-btn:hover{border-color:#111110;background:#FAF7F3}
        table{width:100%;border-collapse:collapse}
        th{font-size:10px;font-weight:800;color:#9B8F7A;text-transform:uppercase;letter-spacing:.12em;padding:10px 12px;border-bottom:2px solid #E8E0D0;text-align:left;white-space:nowrap}
        td{padding:10px 12px;border-bottom:1px solid #F5F0E8;font-size:13px;font-weight:600;color:#111110;vertical-align:middle}
        tr:last-child td{border-bottom:none}
        tr:hover td{background:#FFFBEA}
        @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        .fu{animation:fu .3s cubic-bezier(.16,1,.3,1) both}
        *::-webkit-scrollbar{display:none}*{scrollbar-width:none}
      `}</style>

      {/* Top bar */}
      <div style={{ background:"#111110", padding:"12px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>🥭</span>
          <span style={{ fontSize:15, fontWeight:900, color:"#FFD400", letterSpacing:"-0.3px" }}>artomango</span>
          <span style={{ fontSize:11, fontWeight:700, color:"#555", background:"#1a1a1a", padding:"2px 8px", borderRadius:6 }}>ADMIN</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => { setLoading(true); loadAll(); }} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", border:"1px solid #333", borderRadius:8, background:"transparent", color:"#666", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            <RefreshCw size={12}/> Refresh
          </button>
          <a href="/" target="_blank" style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", border:"1px solid #333", borderRadius:8, color:"#666", fontSize:12, fontWeight:700, textDecoration:"none" }}>
            <Globe size={12}/> View site
          </a>
          <button onClick={signOut} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", border:"1px solid #333", borderRadius:8, background:"transparent", color:"#555", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            <LogOut size={12}/> Sign out
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <nav style={{ background:"#111110", borderBottom:"2px solid #222", padding:"0 24px", display:"flex", alignItems:"center", overflowX:"auto" }}>
        {TABS.map(t => (
          <button key={t.key} className={`atab${tab===t.key?" active":""}`} onClick={() => setTab(t.key)}>
            {t.icon}{t.label}
            {t.count !== undefined && <span className="cnt">{t.count}</span>}
          </button>
        ))}
      </nav>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"28px 24px" }}>

        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <div className="fu">
            <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px", marginBottom:20 }}>Platform overview</h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:12, marginBottom:28 }}>
              {[
                { label:"Total users",  n:stats.users,    color:"#111110" },
                { label:"Artists",      n:stats.artists,  color:"#16A34A" },
                { label:"Galleries",    n:stats.galleries,color:"#8B5CF6" },
                { label:"Artworks",     n:stats.artworks, color:"#0EA5E9" },
                { label:"Available",    n:stats.available,color:"#16A34A" },
                { label:"Events",       n:stats.events,   color:"#FF6B6B" },
                { label:"Live slides",  n:stats.slides,   color:"#CA8A04" },
              ].map(s => (
                <div key={s.label} style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:14, padding:"16px 18px" }}>
                  <div style={{ fontSize:30, fontWeight:900, color:s.color, letterSpacing:"-1px" }}>{s.n}</div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", textTransform:"uppercase" as const, letterSpacing:"0.12em", marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
              <div style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", borderBottom:"2px solid #E8E0D0", background:"#FAF7F3", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:13, fontWeight:800 }}>Recent signups</span>
                  <button onClick={() => setTab("users")} style={{ fontSize:11, fontWeight:700, color:"#9B8F7A", background:"none", border:"none", cursor:"pointer" }}>See all →</button>
                </div>
                {users.slice(0,6).map(u => { const rc = roleColor(u.role); return (
                  <div key={u.id} className="row-item">
                    <div style={{ width:32, height:32, borderRadius:"50%", background:"#FFD400", border:"2px solid #E8E0D0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, overflow:"hidden", flexShrink:0 }}>
                      {u.avatar_url ? <img src={u.avatar_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : (u.full_name||"?")[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:800 }}>{u.full_name}</div>
                      {u.username && <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:600 }}>@{u.username}</div>}
                    </div>
                    <span className="badge" style={{ background:rc.bg, color:rc.color }}>{u.role||"user"}</span>
                  </div>
                ); })}
              </div>
              <div style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:16, overflow:"hidden" }}>
                <div style={{ padding:"12px 16px", borderBottom:"2px solid #E8E0D0", background:"#FAF7F3", display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:13, fontWeight:800 }}>Recent artworks</span>
                  <button onClick={() => setTab("artworks")} style={{ fontSize:11, fontWeight:700, color:"#9B8F7A", background:"none", border:"none", cursor:"pointer" }}>See all →</button>
                </div>
                {artworks.slice(0,6).map(a => (
                  <div key={a.id} className="row-item">
                    <div style={{ width:40, height:32, borderRadius:8, overflow:"hidden", background:"#F5F0E8", flexShrink:0 }}>
                      {Array.isArray(a.images) && a.images[0] ? <img src={a.images[0]} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><ImageIcon size={14} color="#C0B8A8"/></div>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.title}</div>
                      <div style={{ fontSize:11, color:"#9B8F7A" }}>{a.artist_name}</div>
                    </div>
                    <span className="badge" style={{ background:a.status?.toLowerCase()==="available"?"#DCFCE7":"#F5F0E8", color:a.status?.toLowerCase()==="available"?"#16A34A":"#9B8F7A" }}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab === "users" && (
          <div className="fu">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px" }}>Users <span style={{ fontSize:15, color:"#9B8F7A", fontWeight:700 }}>({fUsers.length})</span></h2>
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:"2px solid #E8E0D0", borderRadius:10, padding:"0 12px", height:38, minWidth:240 }}>
                <Search size={13} color="#9B8F7A"/>
                <input style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"transparent" }} value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users…"/>
              </div>
            </div>
            <div style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table>
                  <thead><tr><th>User</th><th>Username</th><th>Role</th><th>Location</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {fUsers.map(u => { const rc = roleColor(u.role); return (
                      <tr key={u.id}>
                        <td><div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:30, height:30, borderRadius:"50%", background:"#FFD400", border:"1.5px solid #E8E0D0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:900, overflow:"hidden", flexShrink:0 }}>
                            {u.avatar_url ? <img src={u.avatar_url} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : (u.full_name||"?")[0]}
                          </div>
                          <span style={{ fontWeight:800 }}>{u.full_name||"—"}</span>
                        </div></td>
                        <td style={{ color:"#9B8F7A" }}>{u.username ? `@${u.username}` : "—"}</td>
                        <td><span className="badge" style={{ background:rc.bg, color:rc.color }}>{u.role||"user"}</span></td>
                        <td style={{ color:"#9B8F7A" }}>{u.location||"—"}</td>
                        <td style={{ color:"#9B8F7A" }}>{fmtDate(u.created_at)}</td>
                        <td><div style={{ display:"flex", gap:5 }}>
                          <button className="act-btn" onClick={() => setEditUser({ ...u })}><Edit2 size={12}/></button>
                          <a href={u.username ? `/${u.username}` : "#"} target="_blank" className="act-btn"><Eye size={12}/></a>
                          <button className="act-btn" onClick={() => deleteUser(u.id)} style={{ borderColor:"#FFE4E6" }}><Trash2 size={12} color="#EF4444"/></button>
                        </div></td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
            </div>

            {editUser && (
              <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={() => setEditUser(null)}>
                <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:20, padding:24, width:"100%", maxWidth:440, boxShadow:"6px 6px 0 #111110" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
                    <h3 style={{ fontSize:17, fontWeight:900 }}>Edit user</h3>
                    <button onClick={() => setEditUser(null)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={18}/></button>
                  </div>
                  {[{label:"Full name",key:"full_name"},{label:"Username",key:"username"},{label:"Location",key:"location"}].map(f => (
                    <div key={f.key} style={{ marginBottom:12 }}>
                      <label style={lbl}>{f.label}</label>
                      <input style={inp} value={(editUser as any)[f.key]||""} onChange={e => setEditUser(p => ({ ...p!, [f.key]: e.target.value }))}/>
                    </div>
                  ))}
                  <div style={{ marginBottom:12 }}>
                    <label style={lbl}>Role</label>
                    <select style={{ ...inp }} value={editUser.role||""} onChange={e => setEditUser(p => ({ ...p!, role: e.target.value }))}>
                      <option value="">user</option><option value="artist">artist</option><option value="gallery">gallery</option><option value="admin">admin</option>
                    </select>
                  </div>
                  <div style={{ marginBottom:20 }}>
                    <label style={lbl}>Bio</label>
                    <textarea style={{ ...inp, resize:"vertical" }} rows={3} value={editUser.bio||""} onChange={e => setEditUser(p => ({ ...p!, bio: e.target.value }))}/>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={() => setEditUser(null)} style={{ flex:1, padding:11, border:"2px solid #E8E0D0", borderRadius:10, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                    <button onClick={() => updateUser(editUser)} style={{ flex:1, padding:11, border:"2.5px solid #111110", borderRadius:10, background:"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"2px 2px 0 #111110" }}>
                      <Save size={13} style={{ display:"inline", marginRight:6, verticalAlign:"middle" }}/> Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ARTWORKS ─── */}
        {tab === "artworks" && (
          <div className="fu">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px" }}>Artworks <span style={{ fontSize:15, color:"#9B8F7A", fontWeight:700 }}>({fArtworks.length})</span></h2>
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:"2px solid #E8E0D0", borderRadius:10, padding:"0 12px", height:38, minWidth:240 }}>
                <Search size={13} color="#9B8F7A"/>
                <input style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", fontWeight:600, background:"transparent", color:"#111110" }} value={artSearch} onChange={e => setArtSearch(e.target.value)} placeholder="Search artworks…"/>
              </div>
            </div>
            <div style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table>
                  <thead><tr><th>Artwork</th><th>Artist</th><th>Medium</th><th>Price</th><th>Status</th><th>Added</th><th>Actions</th></tr></thead>
                  <tbody>
                    {fArtworks.map(a => (
                      <tr key={a.id}>
                        <td><div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:40, height:32, borderRadius:8, overflow:"hidden", background:"#F5F0E8", flexShrink:0 }}>
                            {Array.isArray(a.images) && a.images[0] ? <img src={a.images[0]} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt=""/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><ImageIcon size={14} color="#C0B8A8"/></div>}
                          </div>
                          <span style={{ fontWeight:800, maxWidth:150, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.title}</span>
                        </div></td>
                        <td style={{ color:"#9B8F7A" }}>{a.artist_name}</td>
                        <td style={{ color:"#9B8F7A" }}>{a.medium||"—"}</td>
                        <td style={{ fontFamily:"monospace", fontWeight:800 }}>{a.price ? `$${Number(a.price).toLocaleString()}` : "—"}</td>
                        <td>
                          <select value={a.status} onChange={e => setArtworkStatus(a.id, e.target.value)} style={{ padding:"3px 8px", border:"1.5px solid #E8E0D0", borderRadius:7, fontSize:11, fontWeight:800, fontFamily:"inherit", background:"#fff", cursor:"pointer" }}>
                            {["available","reserved","sold","not_for_sale"].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ color:"#9B8F7A" }}>{fmtDate(a.created_at)}</td>
                        <td><button className="act-btn" onClick={() => deleteArtwork(a.id)} style={{ borderColor:"#FFE4E6" }}><Trash2 size={12} color="#EF4444"/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── EVENTS ─── */}
        {tab === "events" && (
          <div className="fu">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px" }}>Events <span style={{ fontSize:15, color:"#9B8F7A", fontWeight:700 }}>({fEvents.length})</span></h2>
              <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:"2px solid #E8E0D0", borderRadius:10, padding:"0 12px", height:38, minWidth:240 }}>
                <Search size={13} color="#9B8F7A"/>
                <input style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", fontWeight:600, background:"transparent", color:"#111110" }} value={evSearch} onChange={e => setEvSearch(e.target.value)} placeholder="Search events…"/>
              </div>
            </div>
            <div style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:16, overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table>
                  <thead><tr><th>Title</th><th>Organizer</th><th>Type</th><th>Date</th><th>Venue</th><th>Visibility</th><th>Actions</th></tr></thead>
                  <tbody>
                    {fEvents.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight:800 }}>{e.title}</td>
                        <td style={{ color:"#9B8F7A" }}>{e.artist_name}</td>
                        <td>{e.event_type && <span className="badge" style={{ background:"#F5F0E8", color:"#5C5346" }}>{e.is_online ? "🌐 " : ""}{e.event_type.replace("_"," ")}</span>}</td>
                        <td style={{ color:"#9B8F7A" }}>{fmtDate(e.start_date)}</td>
                        <td style={{ color:"#9B8F7A", maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.venue||"—"}</td>
                        <td>
                          <button onClick={() => toggleEventPublic(e.id, !!e.is_public)} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", border:"1.5px solid #E8E0D0", borderRadius:8, background:e.is_public?"#DCFCE7":"#F5F0E8", fontSize:11, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:e.is_public?"#16A34A":"#9B8F7A" }}>
                            {e.is_public ? <Eye size={11}/> : <EyeOff size={11}/>} {e.is_public ? "Public" : "Private"}
                          </button>
                        </td>
                        <td><button className="act-btn" onClick={() => deleteEvent(e.id)} style={{ borderColor:"#FFE4E6" }}><Trash2 size={12} color="#EF4444"/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── HERO BANNER ─── */}
        {tab === "hero" && (
          <div className="fu" style={{ maxWidth:680 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px" }}>Hero Banner</h2>
              <SaveBtn onClick={saveHero}/>
            </div>
            {/* Preview */}
            <div style={{ position:"relative", width:"100%", aspectRatio:"16/7", borderRadius:16, overflow:"hidden", border:"2.5px solid #111110", marginBottom:24, boxShadow:"4px 4px 0 #111110" }}>
              <div style={{ position:"absolute", inset:0, background:"#FFD400", width:"45%" }}/>
              <div style={{ position:"absolute", inset:0, left:"45%", overflow:"hidden" }}>
                {hero.image_url && <img src={hero.image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>}
                <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,#FFD400 0%,rgba(255,212,0,0.6) 20%,transparent 50%)" }}/>
              </div>
              <div style={{ position:"absolute", left:"5%", top:"50%", transform:"translateY(-50%)", maxWidth:"42%" }}>
                <div style={{ fontSize:"clamp(16px,2.2vw,28px)", fontWeight:900, color:"#111110", letterSpacing:"-1px", lineHeight:0.93, marginBottom:8 }}>
                  {hero.headline_line1||"Your art."}<br/>{hero.headline_line2||"Your practice."}<br/>{hero.headline_line3||"Your scene."}
                </div>
                <div style={{ fontSize:"clamp(9px,1vw,12px)", color:"rgba(17,17,16,0.6)", fontWeight:600, marginBottom:10, lineHeight:1.4, maxWidth:180 }}>{hero.subtext||"The platform for artists and venues."}</div>
                <div style={{ display:"inline-block", padding:"5px 12px", background:"#111110", color:"#FFD400", borderRadius:8, fontSize:"clamp(9px,1vw,11px)", fontWeight:800 }}>{hero.cta_label||"Join free →"}</div>
              </div>
              <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.5)", color:"#FFD400", fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:9999, textTransform:"uppercase" as const }}>Preview</div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              {/* ── Image upload ── */}
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Hero image</label>
                {/* Drop zone / current image */}
                <div
                  onClick={() => heroFileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = "#FFD400"; }}
                  onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"; }}
                  onDrop={e => {
                    e.preventDefault();
                    (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0";
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) uploadHeroImage(file);
                  }}
                  style={{ position:"relative", width:"100%", aspectRatio:"16/7", border:"2.5px dashed #E8E0D0", borderRadius:14, overflow:"hidden", cursor:"pointer", background:"#FAF7F3", transition:"border-color .15s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {hero.image_url
                    ? <img src={hero.image_url} alt="" style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }}/>
                    : null
                  }
                  {/* Overlay */}
                  <div style={{ position:"relative", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:16, background:hero.image_url?"rgba(0,0,0,0.45)":"transparent", borderRadius:10, backdropFilter:hero.image_url?"blur(2px)":"none" }}>
                    {heroUploading
                      ? <>
                          <div style={{ width:32, height:32, border:"3px solid #FFD400", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite" }}/>
                          <span style={{ fontSize:12, fontWeight:700, color:hero.image_url?"#fff":"#9B8F7A" }}>Uploading…</span>
                        </>
                      : <>
                          <div style={{ width:44, height:44, borderRadius:12, background:hero.image_url?"rgba(255,212,0,0.9)":"#FFD400", border:"2px solid #111110", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"2px 2px 0 #111110" }}>
                            <ImageIcon size={20} color="#111110"/>
                          </div>
                          <span style={{ fontSize:13, fontWeight:800, color:hero.image_url?"#fff":"#111110" }}>
                            {hero.image_url ? "Click or drag to replace" : "Click or drag to upload"}
                          </span>
                          <span style={{ fontSize:11, fontWeight:600, color:hero.image_url?"rgba(255,255,255,0.6)":"#9B8F7A" }}>JPG, PNG, WEBP — any size</span>
                        </>
                    }
                  </div>
                </div>
                {/* Hidden file input */}
                <input
                  ref={heroFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display:"none" }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadHeroImage(f); e.target.value = ""; }}
                />
                {/* Error message */}
                {heroUploadErr && (
                  <div style={{ marginTop:8, padding:"8px 12px", background:"#FEF2F2", border:"1.5px solid #FCA5A5", borderRadius:8, fontSize:12, fontWeight:700, color:"#EF4444" }}>
                    {heroUploadErr}
                  </div>
                )}
                {/* OR paste URL manually */}
                <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ flex:1, height:1, background:"#E8E0D0" }}/>
                  <span style={{ fontSize:10, fontWeight:800, color:"#C0B8A8", textTransform:"uppercase" as const, letterSpacing:"0.1em" }}>or paste URL</span>
                  <div style={{ flex:1, height:1, background:"#E8E0D0" }}/>
                </div>
                <input style={{ ...inp, marginTop:8 }} value={hero.image_url||""} onChange={e => setHero(p => ({ ...p, image_url: e.target.value }))} placeholder="https://images.unsplash.com/…"/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
              <div><label style={lbl}>Headline — line 1</label><input style={inp} value={hero.headline_line1||""} onChange={e => setHero(p => ({ ...p, headline_line1: e.target.value }))} placeholder="Your art."/></div>
              <div><label style={lbl}>Headline — line 2</label><input style={inp} value={hero.headline_line2||""} onChange={e => setHero(p => ({ ...p, headline_line2: e.target.value }))} placeholder="Your practice."/></div>
              <div><label style={lbl}>Headline — line 3</label><input style={inp} value={hero.headline_line3||""} onChange={e => setHero(p => ({ ...p, headline_line3: e.target.value }))} placeholder="Your scene."/></div>
              <div><label style={lbl}>CTA button label</label><input style={inp} value={hero.cta_label||""} onChange={e => setHero(p => ({ ...p, cta_label: e.target.value }))} placeholder="Join free →"/></div>
              <div style={{ gridColumn:"1/-1" }}><label style={lbl}>Subtext</label><textarea style={{ ...inp, resize:"vertical" }} rows={2} value={hero.subtext||""} onChange={e => setHero(p => ({ ...p, subtext: e.target.value }))} placeholder="The platform for artists and venues…"/></div>
              <div><label style={lbl}>CTA href</label><input style={inp} value={hero.cta_href||""} onChange={e => setHero(p => ({ ...p, cta_href: e.target.value }))} placeholder="/register"/></div>
              <div><label style={lbl}>Credit — artwork title</label><input style={inp} value={hero.image_credit_artwork||""} onChange={e => setHero(p => ({ ...p, image_credit_artwork: e.target.value }))} placeholder="Artwork title"/></div>
              <div><label style={lbl}>Credit — artist name</label><input style={inp} value={hero.image_credit_name||""} onChange={e => setHero(p => ({ ...p, image_credit_name: e.target.value }))} placeholder="Artist name"/></div>
            </div>
            <div style={{ marginTop:20, background:"#111110", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#FFD400", textTransform:"uppercase" as const, letterSpacing:"0.12em", marginBottom:8 }}>Run once in Supabase SQL editor</div>
              <pre style={{ fontSize:11, color:"#aaa", lineHeight:1.8, overflow:"auto" }}>{`create table if not exists hero_config (
  id uuid default gen_random_uuid() primary key,
  headline_line1 text, headline_line2 text, headline_line3 text,
  subtext text, cta_label text, cta_href text,
  image_url text, image_credit_name text, image_credit_artwork text,
  updated_at timestamptz default now()
);`}</pre>
            </div>
          </div>
        )}

        {/* ─── CAMPAIGNS ─── */}
        {tab === "campaigns" && (
          <div className="fu">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
              <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px" }}>Campaign Carousel <span style={{ fontSize:15, color:"#9B8F7A", fontWeight:700 }}>({slides.length} slides)</span></h2>
              <a href="/" target="_blank" style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 16px", border:"2px solid #E8E0D0", borderRadius:10, background:"#fff", fontSize:12, fontWeight:700, textDecoration:"none", color:"#111110" }}>
                <Eye size={13}/> Preview on site
              </a>
            </div>
            <div style={{ background:"#fff", border:"2px solid #E8E0D0", borderRadius:14, padding:"16px 18px", marginBottom:20 }}>
              <label style={{ ...lbl, marginBottom:10 }}>Add new slide — paste an image URL</label>
              <div style={{ display:"flex", gap:10 }}>
                <input style={{ ...inp, flex:1 }} value={newSlideUrl} onChange={e => setNewSlideUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && addSlide()} placeholder="https://images.unsplash.com/photo-…"/>
                <button onClick={addSlide} disabled={addingSlide || !newSlideUrl.trim()} style={{ padding:"9px 18px", border:"2.5px solid #111110", borderRadius:10, background:"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", boxShadow:"2px 2px 0 #111110" }}>
                  <Plus size={14} style={{ display:"inline", marginRight:4, verticalAlign:"middle" }}/> Add
                </button>
              </div>
            </div>
            {slides.length === 0
              ? <div style={{ padding:"48px 24px", textAlign:"center", background:"#fff", border:"2px dashed #E0D8CA", borderRadius:16, color:"#9B8F7A" }}><Megaphone size={32} color="#C0B8A8" style={{ marginBottom:12 }}/><div style={{ fontSize:14, fontWeight:700 }}>No slides yet. Add one above.</div></div>
              : slides.map(s => <SlideEditor key={s.id} slide={s} onSave={u => setSlides(p => p.map(x => x.id === u.id ? u : x))} onDelete={() => deleteSlide(s.id)}/>)
            }
          </div>
        )}

        {/* ─── SETTINGS ─── */}
        {tab === "settings" && (
          <div className="fu" style={{ maxWidth:600 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h2 style={{ fontSize:22, fontWeight:900, letterSpacing:"-0.6px" }}>Site Settings</h2>
              <SaveBtn onClick={saveSettings}/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={card}>
                <div style={{ fontSize:12, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase" as const, letterSpacing:"0.14em", marginBottom:14 }}>General</div>
                {[{label:"Site name",key:"site_name",ph:"Artomango"},{label:"Tagline",key:"site_tagline",ph:"Manage, Exhibit, Collab."},{label:"Footer text",key:"footer_text",ph:"© 2026 Artomango"}].map(f => (
                  <div key={f.key} style={{ marginBottom:12 }}>
                    <label style={lbl}>{f.label}</label>
                    <input style={inp} value={(settings as any)[f.key]||""} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph}/>
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontSize:12, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase" as const, letterSpacing:"0.14em", marginBottom:14 }}>SEO / Open Graph</div>
                {[{label:"OG title",key:"og_title",ph:"Artomango — Art Platform",area:false},{label:"OG description",key:"og_description",ph:"The platform for artists and venues.",area:true}].map(f => (
                  <div key={f.key} style={{ marginBottom:12 }}>
                    <label style={lbl}>{f.label}</label>
                    {f.area
                      ? <textarea style={{ ...inp, resize:"vertical" }} rows={2} value={(settings as any)[f.key]||""} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph}/>
                      : <input style={inp} value={(settings as any)[f.key]||""} onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.ph}/>
                    }
                  </div>
                ))}
              </div>
              <div style={card}>
                <div style={{ fontSize:12, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase" as const, letterSpacing:"0.14em", marginBottom:14 }}>Platform flags</div>
                {[{label:"New registrations open",key:"join_enabled",desc:"Allow new users to sign up"},{label:"Maintenance mode",key:"maintenance_mode",desc:"Show a maintenance message to visitors"}].map(f => (
                  <div key={f.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:"1px solid #F5F0E8", cursor:"pointer" }} onClick={() => setSettings(p => ({ ...p, [f.key]: !(p as any)[f.key] }))}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700 }}>{f.label}</div>
                      <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:600 }}>{f.desc}</div>
                    </div>
                    <div style={{ width:44, height:24, borderRadius:12, background:(settings as any)[f.key]?"#16A34A":"#E8E0D0", border:"2px solid #111110", position:"relative", flexShrink:0, transition:"background .2s" }}>
                      <div style={{ width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:(settings as any)[f.key]?22:2, transition:"left .2s" }}/>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ background:"#111110", borderRadius:12, padding:"14px 16px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#FFD400", textTransform:"uppercase" as const, letterSpacing:"0.12em", marginBottom:8 }}>Run once in Supabase SQL editor</div>
                <pre style={{ fontSize:11, color:"#aaa", lineHeight:1.8, overflow:"auto" }}>{`create table if not exists site_settings (
  id uuid default gen_random_uuid() primary key,
  site_name text, site_tagline text, footer_text text,
  join_enabled boolean default true,
  maintenance_mode boolean default false,
  og_title text, og_description text,
  updated_at timestamptz default now()
);`}</pre>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

import React from "react";
