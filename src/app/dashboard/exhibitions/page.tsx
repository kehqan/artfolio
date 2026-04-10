"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Plus, X, Save, MapPin, Calendar, ChevronLeft, ChevronRight,
  ExternalLink, Trash2, Edit2, Globe, Youtube, FileText,
  MessageSquare, Link as LinkIcon, Play, BookOpen,
  Laptop, Users, Palette, GlassWater, Mic, Home,
  ShoppingBag, Sparkles, Clock, ArrowRight,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type EventType =
  | "exhibition" | "workshop" | "online_workshop" | "drink_draw"
  | "artist_talk" | "open_studio" | "gathering" | "popup" | "other";

type Event = {
  id: string; title: string; venue?: string; description?: string;
  start_date?: string; end_date?: string; status: string;
  is_public: boolean; cover_image?: string;
  event_type?: EventType; is_online?: boolean; online_url?: string;
  location_name?: string; lat?: number; lng?: number;
};

type ResourceType = "video" | "article" | "post";
type Resource = {
  id: string; type: ResourceType; title: string; url?: string;
  description?: string; thumbnail_url?: string; created_at: string;
};

type MainTab    = "events" | "education";
type EventsView = "cards" | "map" | "calendar";

// ── Event type config ──────────────────────────────────────────────
const EVENT_TYPES: { key: EventType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { key: "exhibition",     label: "Exhibition",      icon: <Palette size={18} />,   color: "#8B5CF6", bg: "#EDE9FE" },
  { key: "workshop",       label: "Workshop",        icon: <BookOpen size={18} />,  color: "#16A34A", bg: "#DCFCE7" },
  { key: "online_workshop",label: "Online Workshop", icon: <Laptop size={18} />,    color: "#0EA5E9", bg: "#E0F2FE" },
  { key: "drink_draw",     label: "Drink & Draw",    icon: <GlassWater size={18} />,color: "#FF6B6B", bg: "#FFE4E6" },
  { key: "artist_talk",    label: "Artist Talk",     icon: <Mic size={18} />,       color: "#CA8A04", bg: "#FEF9C3" },
  { key: "open_studio",    label: "Open Studio",     icon: <Home size={18} />,      color: "#D97706", bg: "#FEF3C7" },
  { key: "gathering",      label: "Gathering",       icon: <Users size={18} />,     color: "#4ECDC4", bg: "#F0FDF4" },
  { key: "popup",          label: "Pop-up",          icon: <ShoppingBag size={18} />,color: "#EC4899", bg: "#FCE7F3" },
  { key: "other",          label: "Other",           icon: <Sparkles size={18} />,  color: "#9B8F7A", bg: "#F5F0E8" },
];

const ET = Object.fromEntries(EVENT_TYPES.map(e => [e.key, e]));

function getETC(type?: string) {
  return ET[type as EventType] || ET["other"];
}

// ── Calendar helpers ───────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y: number, m: number)    { let d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

function isUpcoming(ev: Event) {
  const ref = ev.end_date || ev.start_date;
  if (!ref) return true;
  return new Date(ref) >= new Date(new Date().setHours(0,0,0,0));
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

declare global { interface Window { google: any; initEventsMap: () => void; __evMapLoaded: boolean; } }
const PRAGUE = { lat: 50.0755, lng: 14.4378 };

// ══════════════════════════════════════════════════════════════════
export default function EventsEducationPage() {
  const sb = createClient();

  // ── State ────────────────────────────────────────────────────────
  const [mainTab,    setMainTab]    = useState<MainTab>("events");
  const [eventsView, setEventsView] = useState<EventsView>("cards");
  const [events,     setEvents]     = useState<Event[]>([]);
  const [resources,  setResources]  = useState<Resource[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editId,     setEditId]     = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [showResForm,setShowResForm]= useState(false);
  const [savingRes,  setSavingRes]  = useState(false);
  const [calDate,    setCalDate]    = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [mapReady,   setMapReady]   = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapObjRef = useRef<any>(null);

  const [form, setForm] = useState({
    title: "", venue: "", description: "", start_date: "", end_date: "",
    event_type: "exhibition" as EventType, is_online: false, online_url: "",
    is_public: true, location_name: "",
  });

  const [resForm, setResForm] = useState({
    type: "video" as ResourceType, title: "", url: "", description: "",
  });

  // ── Load ─────────────────────────────────────────────────────────
  useEffect(() => { load(); }, []);

  async function load() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const [{ data: ev }, { data: res }] = await Promise.all([
      sb.from("exhibitions").select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
      sb.from("education_resources").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    setEvents(ev || []);
    setResources(res || []);
    setLoading(false);
  }

  // ── Map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (eventsView !== "map" || mainTab !== "events") return;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    if (window.__evMapLoaded && window.google?.maps) { initMap(); return; }
    if (document.getElementById("ev-gmaps")) return;
    window.initEventsMap = () => { window.__evMapLoaded = true; initMap(); };
    const s = document.createElement("script");
    s.id = "ev-gmaps";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initEventsMap&loading=async`;
    s.async = true; document.head.appendChild(s);
  }, [eventsView, mainTab, events]);

  function initMap() {
    if (!mapDivRef.current || mapObjRef.current) return;
    const map = new window.google.maps.Map(mapDivRef.current, {
      center: PRAGUE, zoom: 12,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#F5F0E8" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#5C5346" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#A8C8E0" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#E0D8CA" }] },
      ],
      disableDefaultUI: true, zoomControl: false,
    });
    mapObjRef.current = map;
    // Add zoom controls
    const zoomDiv = document.createElement("div");
    zoomDiv.style.cssText = "position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:4px;z-index:10";
    ["+", "−", "⌖"].forEach((l, i) => {
      const btn = document.createElement("button");
      btn.textContent = l;
      btn.style.cssText = "width:32px;height:32px;background:#fff;border:2px solid #111110;font-size:14px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 #111110;font-family:inherit";
      btn.onclick = () => {
        if (i === 0) map.setZoom((map.getZoom() || 12) + 1);
        else if (i === 1) map.setZoom((map.getZoom() || 12) - 1);
        else { map.setCenter(PRAGUE); map.setZoom(12); }
      };
      zoomDiv.appendChild(btn);
    });
    mapDivRef.current.appendChild(zoomDiv);
    setMapReady(true);

    // Add event markers
    const pinSvg = (color: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 2C7.9 2 3 6.9 3 13c0 8.3 11 23 11 23S25 21.3 25 13C25 6.9 20.1 2 14 2z" fill="${color}" stroke="#111" stroke-width="1.5"/>
      <circle cx="14" cy="13" r="4.5" fill="white"/>
    </svg>`;

    events.filter(e => e.lat && e.lng).forEach(ev => {
      const etc = getETC(ev.event_type);
      const marker = new window.google.maps.Marker({
        position: { lat: ev.lat!, lng: ev.lng! }, map,
        title: ev.title,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg(etc.color)),
          scaledSize: new window.google.maps.Size(28, 38),
          anchor: new window.google.maps.Point(14, 38),
        },
      });
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-family:'Darker Grotesque',sans-serif;padding:4px 2px;min-width:140px">
          <div style="font-size:11px;font-weight:800;color:${etc.color};text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px">${etc.label}</div>
          <div style="font-size:14px;font-weight:800;color:#111">${ev.title}</div>
          ${ev.venue ? `<div style="font-size:11px;color:#9B8F7A;margin-top:2px">${ev.venue}</div>` : ""}
          ${ev.start_date ? `<div style="font-size:11px;color:#9B8F7A;margin-top:2px">${fmtDate(ev.start_date)}</div>` : ""}
        </div>`,
      });
      marker.addListener("click", () => { info.open(map, marker); });
    });
  }

  // ── CRUD ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm({ title:"", venue:"", description:"", start_date:"", end_date:"", event_type:"exhibition", is_online:false, online_url:"", is_public:true, location_name:"" });
    setLocationCoords(null);
    setShowForm(true);
  }

  function openEdit(ev: Event) {
    setEditId(ev.id);
    setForm({
      title:       ev.title || "",
      venue:       ev.venue || "",
      description: ev.description || "",
      start_date:  ev.start_date || "",
      end_date:    ev.end_date || "",
      event_type:  (ev.event_type as EventType) || "exhibition",
      is_online:   ev.is_online || false,
      online_url:  ev.online_url || "",
      is_public:   ev.is_public,
      location_name: ev.location_name || ev.venue || "",
    });
    setLocationCoords(ev.lat && ev.lng ? { lat: ev.lat, lng: ev.lng } : null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    // Determine status from dates
    const now = new Date();
    const start = form.start_date ? new Date(form.start_date) : null;
    const end   = form.end_date   ? new Date(form.end_date)   : null;
    let status = "upcoming";
    if (end && end < now) status = "past";
    else if (start && start <= now && (!end || end >= now)) status = "current";

    const payload = {
      title:         form.title,
      venue:         form.location_name || form.venue || null,
      description:   form.description || null,
      start_date:    form.start_date || null,
      end_date:      form.end_date || null,
      event_type:    form.event_type,
      is_online:     form.is_online,
      online_url:    form.online_url || null,
      is_public:     form.is_public,
      location_name: form.location_name || form.venue || null,
      lat:           locationCoords?.lat || null,
      lng:           locationCoords?.lng || null,
      status,
      updated_at:    new Date().toISOString(),
    };

    if (editId) {
      await sb.from("exhibitions").update(payload).eq("id", editId);
    } else {
      await sb.from("exhibitions").insert({ ...payload, user_id: user.id });
    }

    mapObjRef.current = null; // reset map on data change
    setShowForm(false); setSaving(false); load();
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await sb.from("exhibitions").delete().eq("id", id);
    setEvents(p => p.filter(e => e.id !== id));
  }

  async function handleSaveResource(e: React.FormEvent) {
    e.preventDefault(); setSavingRes(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSavingRes(false); return; }
    await sb.from("education_resources").insert({ ...resForm, user_id: user.id });
    setResForm({ type: "video", title: "", url: "", description: "" });
    setShowResForm(false); setSavingRes(false); load();
  }

  async function deleteResource(id: string) {
    await sb.from("education_resources").delete().eq("id", id);
    setResources(p => p.filter(r => r.id !== id));
  }

  const sf = (k: string) => (e: React.ChangeEvent<any>) =>
    setForm(p => ({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const rSf = (k: string) => (e: React.ChangeEvent<any>) =>
    setResForm(p => ({ ...p, [k]: e.target.value }));

  // ── Derived ──────────────────────────────────────────────────────
  const upcoming = events.filter(isUpcoming).sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
  const past     = events.filter(e => !isUpcoming(e)).sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
  const workshops = events.filter(e => e.event_type === "workshop" || e.event_type === "online_workshop");

  // ── Calendar events map ───────────────────────────────────────────
  const calEvents: Record<string, Event[]> = {};
  events.forEach(ev => {
    if (ev.start_date) {
      const k = ev.start_date.split("T")[0];
      if (!calEvents[k]) calEvents[k] = [];
      calEvents[k].push(ev);
    }
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        body{font-family:'Darker Grotesque',system-ui,sans-serif}

        .ev-input{width:100%;padding:11px 14px;border:2px solid #E8E0D0;border-radius:12px;font-size:14px;font-family:inherit;font-weight:600;color:#111110;background:#fff;outline:none;transition:border-color .15s,box-shadow .15s}
        .ev-input:focus{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.2)}
        .ev-label{display:block;font-size:10px;font-weight:800;color:#9B8F7A;text-transform:uppercase;letter-spacing:.14em;margin-bottom:6px}

        .ev-card{background:#fff;border:2.5px solid #E8E0D0;border-radius:18px;overflow:hidden;transition:all .25s cubic-bezier(.16,1,.3,1)}
        .ev-card:hover{border-color:#111110;box-shadow:4px 5px 0 #111110;transform:translate(-1px,-2px)}

        .ev-tab{display:flex;align-items:center;gap:7px;padding:10px 20px;border:none;background:transparent;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;color:#9B8F7A;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .15s;white-space:nowrap}
        .ev-tab:hover{color:#111110}
        .ev-tab.active{color:#111110;border-bottom-color:#FFD400}

        .view-btn{display:flex;align-items:center;gap:5px;padding:8px 14px;border:none;border-right:1px solid #E8E0D0;background:#fff;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;color:#9B8F7A;transition:all .15s;white-space:nowrap}
        .view-btn:last-child{border-right:none}
        .view-btn.active{background:#111110;color:#FFD400}
        .view-btn:not(.active):hover{background:#FAF7F3;color:#111110}

        .type-chip{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:14px 10px;border:2.5px solid #E8E0D0;border-radius:14px;cursor:pointer;transition:all .15s cubic-bezier(.16,1,.3,1);background:#fff;text-align:center;min-width:80px;flex:1}
        .type-chip:hover{border-color:#111110;transform:translateY(-2px)}
        .type-chip.active{border-color:#111110;box-shadow:3px 3px 0 #111110}

        .res-card{background:#fff;border:2.5px solid #E8E0D0;border-radius:16px;overflow:hidden;transition:all .2s cubic-bezier(.16,1,.3,1)}
        .res-card:hover{border-color:#111110;box-shadow:3px 4px 0 #111110;transform:translate(-1px,-1px)}

        .section-label{font-size:10px;font-weight:800;color:#9B8F7A;text-transform:uppercase;letter-spacing:.16em;display:flex;align-items:center;gap:8px;margin-bottom:14px}
        .section-label::after{content:'';flex:1;height:1.5px;background:#E8E0D0}

        .toggle-wrap{display:flex;align-items:center;gap:10px;padding:11px 14px;background:#F5F0E8;border-radius:12px;cursor:pointer;transition:background .15s}
        .toggle-wrap:hover{background:#F0EBE0}

        .cal-day{min-height:80px;padding:8px 8px 4px;border-bottom:1px solid #E8E0D0;border-right:1px solid #E8E0D0;cursor:pointer;transition:background .1s}
        .cal-day:hover{background:#FFFBEA}

        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .slide-up{animation:slideUp .35s cubic-bezier(.16,1,.3,1) both}
        .stagger-1{animation-delay:.04s}
        .stagger-2{animation-delay:.08s}
        .stagger-3{animation-delay:.12s}
      `}</style>

      <div>
        {/* ── HEADER ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:900, color:"#111110", letterSpacing:"-0.7px", margin:0 }}>Events & Education</h1>
            <p style={{ fontSize:13, color:"#9B8F7A", margin:"4px 0 0", fontWeight:600 }}>
              {upcoming.length} upcoming · {past.length} past · {workshops.length} workshops
            </p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {mainTab === "education" && (
              <button onClick={() => setShowResForm(true)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                <BookOpen size={14} /> Add Resource
              </button>
            )}
            <button onClick={openCreate}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110" }}>
              <Plus size={14} strokeWidth={3}/> New Event
            </button>
          </div>
        </div>

        {/* ── MAIN TABS ── */}
        <div style={{ display:"flex", borderBottom:"2px solid #E8E0D0", marginBottom:24, gap:0 }}>
          <button className={`ev-tab${mainTab==="events"?" active":""}`} onClick={() => setMainTab("events")}>
            <Calendar size={14} /> Events
          </button>
          <button className={`ev-tab${mainTab==="education"?" active":""}`} onClick={() => setMainTab("education")}>
            <BookOpen size={14} /> Education Hub
          </button>
        </div>

        {/* ════════════════════════════
            EVENTS TAB
        ════════════════════════════ */}
        {mainTab === "events" && (
          <div>
            {/* View switcher */}
            <div style={{ display:"flex", border:"2.5px solid #111110", borderRadius:14, overflow:"hidden", width:"fit-content", marginBottom:24 }}>
              <button className={`view-btn${eventsView==="cards"?" active":""}`} onClick={() => setEventsView("cards")}>
                <Calendar size={13} /> Cards
              </button>
              <button className={`view-btn${eventsView==="map"?" active":""}`} onClick={() => { setEventsView("map"); mapObjRef.current = null; }}>
                <MapPin size={13} /> Map
              </button>
              <button className={`view-btn${eventsView==="calendar"?" active":""}`} onClick={() => setEventsView("calendar")}>
                <Calendar size={13} /> Calendar
              </button>
            </div>

            {/* ── CARDS VIEW ── */}
            {eventsView === "cards" && (
              <div>
                {loading ? (
                  <div style={{ padding:60, textAlign:"center", color:"#9B8F7A" }}>Loading…</div>
                ) : events.length === 0 ? (
                  <div style={{ padding:"60px 24px", textAlign:"center", border:"2.5px dashed #E0D8CA", borderRadius:20, background:"#fff" }}>
                    <div style={{ fontSize:44, marginBottom:12 }}>🗓️</div>
                    <div style={{ fontSize:16, fontWeight:800, color:"#111110", marginBottom:6 }}>No events yet</div>
                    <div style={{ fontSize:13, color:"#9B8F7A", marginBottom:20 }}>Create your first exhibition, workshop or gathering</div>
                    <button onClick={openCreate} style={{ padding:"10px 20px", border:"2.5px solid #111110", background:"#FFD400", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110" }}>
                      + New Event
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Upcoming */}
                    {upcoming.length > 0 && (
                      <div style={{ marginBottom:36 }}>
                        <div className="section-label">📅 Upcoming ({upcoming.length})</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14 }}>
                          {upcoming.map((ev, i) => <EventCard key={ev.id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)} delay={i * 0.04} />)}
                        </div>
                      </div>
                    )}

                    {/* Past */}
                    {past.length > 0 && (
                      <div>
                        <div className="section-label">🗂️ Past ({past.length})</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))", gap:14, opacity:0.75 }}>
                          {past.map((ev, i) => <EventCard key={ev.id} ev={ev} onEdit={() => openEdit(ev)} onDelete={() => deleteEvent(ev.id)} delay={i * 0.03} past />)}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── MAP VIEW ── */}
            {eventsView === "map" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16, height:520 }}>
                <div style={{ position:"relative", border:"2.5px solid #111110", borderRadius:18, overflow:"hidden", boxShadow:"4px 4px 0 #D4C9A8" }}>
                  <div ref={mapDivRef} style={{ width:"100%", height:"100%", background:"#F5F0E8" }} />
                  {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                    <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#F5F0E8", flexDirection:"column", gap:10 }}>
                      <MapPin size={32} color="#C0B8A8" />
                      <div style={{ fontSize:13, fontWeight:700, color:"#9B8F7A" }}>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to see the map</div>
                    </div>
                  )}
                </div>
                {/* Sidebar list */}
                <div style={{ background:"#fff", border:"2.5px solid #111110", borderRadius:18, overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"4px 4px 0 #D4C9A8" }}>
                  <div style={{ padding:"12px 16px", borderBottom:"2px solid #111110", background:"#FAF7F3", fontSize:12, fontWeight:800, color:"#111110" }}>
                    {events.filter(e => e.lat && e.lng).length} events on map
                  </div>
                  <div style={{ overflowY:"auto", flex:1 }}>
                    {events.filter(e => e.lat && e.lng).map(ev => {
                      const etc = getETC(ev.event_type);
                      return (
                        <div key={ev.id} style={{ padding:"10px 14px", borderBottom:"1px solid #F5F0E8", cursor:"pointer" }}
                          onMouseEnter={e => (e.currentTarget.style.background="#FFFBEA")}
                          onMouseLeave={e => (e.currentTarget.style.background="transparent")}>
                          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                            <div style={{ width:8, height:8, borderRadius:"50%", background:etc.color, flexShrink:0 }}/>
                            <span style={{ fontSize:9, fontWeight:800, color:etc.color, textTransform:"uppercase" }}>{etc.label}</span>
                          </div>
                          <div style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{ev.title}</div>
                          {ev.start_date && <div style={{ fontSize:10, color:"#9B8F7A", fontWeight:600, marginTop:2 }}>{fmtDate(ev.start_date)}</div>}
                        </div>
                      );
                    })}
                    {events.filter(e => e.lat && e.lng).length === 0 && (
                      <div style={{ padding:24, textAlign:"center", color:"#9B8F7A", fontSize:12, fontWeight:600 }}>
                        No events with location yet.<br/>Add a venue when creating an event.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── CALENDAR VIEW ── */}
            {eventsView === "calendar" && (
              <div style={{ background:"#fff", border:"2.5px solid #111110", borderRadius:18, overflow:"hidden", boxShadow:"4px 4px 0 #D4C9A8" }}>
                {/* Nav */}
                <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 20px", borderBottom:"2px solid #111110", background:"#FAF7F3" }}>
                  <button onClick={() => setCalDate(p => { let m=p.month-1,y=p.year; if(m<0){m=11;y--;} return {year:y,month:m}; })}
                    style={{ width:32, height:32, border:"2px solid #111110", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:8, boxShadow:"2px 2px 0 #111110" }}>
                    <ChevronLeft size={14}/>
                  </button>
                  <span style={{ fontSize:18, fontWeight:900, color:"#111110", flex:1 }}>{MONTHS[calDate.month]} {calDate.year}</span>
                  <button onClick={() => setCalDate(p => { let m=p.month+1,y=p.year; if(m>11){m=0;y++;} return {year:y,month:m}; })}
                    style={{ width:32, height:32, border:"2px solid #111110", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:8, boxShadow:"2px 2px 0 #111110" }}>
                    <ChevronRight size={14}/>
                  </button>
                </div>
                {/* Day headers */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #E8E0D0" }}>
                  {DAYS_SHORT.map(d => (
                    <div key={d} style={{ padding:"8px 0", textAlign:"center", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.08em", borderRight:"1px solid #E8E0D0" }}>{d}</div>
                  ))}
                </div>
                {/* Grid */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
                  {Array.from({length:getFirstDow(calDate.year, calDate.month)}).map((_,i) => (
                    <div key={`p${i}`} className="cal-day" style={{ background:"#FAFAF8", borderRight:undefined }}/>
                  ))}
                  {Array.from({length:getDaysInMonth(calDate.year, calDate.month)}).map((_,i) => {
                    const day = i+1;
                    const dateStr = `${calDate.year}-${String(calDate.month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const dayEvs = calEvents[dateStr] || [];
                    const isToday = dateStr === new Date().toISOString().split("T")[0];
                    const colIdx = (getFirstDow(calDate.year, calDate.month)+i)%7;
                    return (
                      <div key={day} className="cal-day" style={{ borderRight:colIdx===6?"none":undefined }}>
                        <div style={{ marginBottom:4 }}>
                          {isToday
                            ? <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:22, height:22, background:"#111110", color:"#FFD400", fontSize:11, fontWeight:900, borderRadius:"50%" }}>{day}</span>
                            : <span style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>{day}</span>}
                        </div>
                        {dayEvs.slice(0,2).map(ev => {
                          const etc = getETC(ev.event_type);
                          return (
                            <div key={ev.id} style={{ display:"flex", alignItems:"center", gap:3, padding:"2px 5px", marginBottom:2, background:etc.bg, border:`1px solid ${etc.color}40`, borderRadius:5, fontSize:9, fontWeight:700, color:etc.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", cursor:"pointer" }}
                              onClick={() => openEdit(ev)}>
                              <div style={{ width:4, height:4, borderRadius:"50%", background:etc.color, flexShrink:0 }}/>
                              {ev.title}
                            </div>
                          );
                        })}
                        {dayEvs.length > 2 && <div style={{ fontSize:8, color:"#9B8F7A", fontWeight:700 }}>+{dayEvs.length-2} more</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════
            EDUCATION HUB TAB
        ════════════════════════════ */}
        {mainTab === "education" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start" }}>

            {/* LEFT: Workshops */}
            <div>
              <div className="section-label">🎓 Workshops ({workshops.length})</div>
              {workshops.length === 0 ? (
                <div style={{ padding:"36px 20px", textAlign:"center", border:"2.5px dashed #E0D8CA", borderRadius:16, background:"#fff", color:"#9B8F7A" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>🎓</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>No workshops yet</div>
                  <div style={{ fontSize:12, marginTop:4, fontWeight:500 }}>Create an event with type "Workshop" or "Online Workshop"</div>
                  <button onClick={openCreate} style={{ marginTop:14, padding:"8px 16px", border:"2px solid #111110", background:"#FFD400", borderRadius:10, fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"2px 2px 0 #111110" }}>
                    + Add Workshop
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {workshops.map((ev, i) => {
                    const isPast = !isUpcoming(ev);
                    const etc = getETC(ev.event_type);
                    return (
                      <div key={ev.id} className="ev-card slide-up" style={{ animationDelay:`${i*0.05}s`, opacity:isPast?0.7:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderBottom:"1px solid #F5F0E8" }}>
                          <div style={{ width:36, height:36, borderRadius:10, background:etc.bg, border:`1.5px solid ${etc.color}40`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                            {React.cloneElement(etc.icon as React.ReactElement, { size:16, color:etc.color })}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:800, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ev.title}</div>
                            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:2 }}>
                              <span style={{ fontSize:9, fontWeight:800, color:etc.color, textTransform:"uppercase", letterSpacing:"0.1em" }}>{etc.label}</span>
                              {ev.is_online && <span style={{ fontSize:9, fontWeight:700, color:"#0EA5E9", background:"#E0F2FE", padding:"1px 6px", borderRadius:4 }}>Online</span>}
                              {isPast && <span style={{ fontSize:9, fontWeight:700, color:"#9B8F7A", background:"#F5F0E8", padding:"1px 6px", borderRadius:4 }}>Past</span>}
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:5 }}>
                            <button onClick={() => openEdit(ev)} style={{ width:28, height:28, border:"1.5px solid #E8E0D0", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:8 }}><Edit2 size={11}/></button>
                            <button onClick={() => deleteEvent(ev.id)} style={{ width:28, height:28, border:"1.5px solid #FFE4E6", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:8 }}><Trash2 size={11} color="#FF6B6B"/></button>
                          </div>
                        </div>
                        {(ev.start_date || ev.venue || ev.online_url) && (
                          <div style={{ padding:"8px 16px", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                            {ev.start_date && <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#9B8F7A", fontWeight:600 }}><Clock size={11}/>{fmtDate(ev.start_date)}</span>}
                            {(ev.venue || ev.location_name) && !ev.is_online && <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#9B8F7A", fontWeight:600 }}><MapPin size={11}/>{ev.venue||ev.location_name}</span>}
                            {ev.is_online && ev.online_url && (
                              <a href={ev.online_url} target="_blank" rel="noopener noreferrer" style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#0EA5E9", fontWeight:700, textDecoration:"none" }}>
                                <Globe size={11}/> Join online
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT: Resources */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                <div className="section-label" style={{ marginBottom:0, flex:1 }}>📚 Resources ({resources.length})</div>
                <button onClick={() => setShowResForm(true)}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", border:"2px solid #E8E0D0", borderRadius:10, background:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0, marginLeft:10 }}>
                  <Plus size={12} /> Add
                </button>
              </div>

              {resources.length === 0 ? (
                <div style={{ padding:"36px 20px", textAlign:"center", border:"2.5px dashed #E0D8CA", borderRadius:16, background:"#fff", color:"#9B8F7A" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📚</div>
                  <div style={{ fontSize:13, fontWeight:700 }}>No resources yet</div>
                  <div style={{ fontSize:12, marginTop:4, fontWeight:500 }}>Add YouTube videos, articles or community posts</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {resources.map((res, i) => <ResourceCard key={res.id} res={res} onDelete={() => deleteResource(res.id)} delay={i * 0.04} />)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            NEW EVENT FORM MODAL
        ═══════════════════════════════════════ */}
        {showForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowForm(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:22, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto" }}>

              {/* Modal header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"2px solid #111110", background:"#FFD400", borderRadius:"20px 20px 0 0" }}>
                <h2 style={{ fontSize:18, fontWeight:900, color:"#111110", margin:0 }}>{editId ? "Edit Event" : "New Event"}</h2>
                <button onClick={() => setShowForm(false)} style={{ background:"none", border:"none", cursor:"pointer" }}><X size={20}/></button>
              </div>

              <form onSubmit={handleSave} style={{ padding:"24px" }}>

                {/* ── Event type selector ── */}
                <div style={{ marginBottom:22 }}>
                  <label className="ev-label">What kind of event? *</label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {EVENT_TYPES.map(et => (
                      <div key={et.key}
                        className={`type-chip${form.event_type===et.key?" active":""}`}
                        style={{ borderColor:form.event_type===et.key?et.color:"#E8E0D0", background:form.event_type===et.key?et.bg:"#fff", boxShadow:form.event_type===et.key?`3px 3px 0 ${et.color}`:"none" }}
                        onClick={() => setForm(p => ({ ...p, event_type: et.key }))}>
                        <div style={{ color:form.event_type===et.key?et.color:"#9B8F7A" }}>{React.cloneElement(et.icon as React.ReactElement, { size:20 })}</div>
                        <span style={{ fontSize:11, fontWeight:800, color:form.event_type===et.key?et.color:"#9B8F7A" }}>{et.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div style={{ marginBottom:16 }}>
                  <label className="ev-label">Title *</label>
                  <input required className="ev-input" value={form.title} onChange={sf("title")} placeholder="Event name" />
                </div>

                {/* Online toggle */}
                <div className="toggle-wrap" style={{ marginBottom:16 }} onClick={() => setForm(p => ({ ...p, is_online: !p.is_online }))}>
                  <div style={{ width:42, height:24, borderRadius:12, background:form.is_online?"#0EA5E9":"#E8E0D0", border:"2px solid #111110", position:"relative", flexShrink:0, transition:"background .2s" }}>
                    <div style={{ width:16, height:16, borderRadius:"50%", background:form.is_online?"#fff":"#9B8F7A", position:"absolute", top:2, left:form.is_online?22:2, transition:"left .2s" }}/>
                  </div>
                  <Laptop size={15} color={form.is_online?"#0EA5E9":"#9B8F7A"} />
                  <span style={{ fontSize:13, fontWeight:700, color:form.is_online?"#0EA5E9":"#111110" }}>
                    {form.is_online ? "Online event" : "In-person event"}
                  </span>
                </div>

                {/* Location OR online URL */}
                {form.is_online ? (
                  <div style={{ marginBottom:16 }}>
                    <label className="ev-label">Online link (Zoom, Meet, etc.)</label>
                    <input className="ev-input" type="url" value={form.online_url} onChange={sf("online_url")} placeholder="https://zoom.us/j/…" />
                  </div>
                ) : (
                  <div style={{ marginBottom:16 }}>
                    <label className="ev-label">Venue / Location</label>
                    <PlacesAutocomplete
                      value={form.location_name || form.venue}
                      placeholder="Search gallery, café, studio…"
                      onChange={(result, raw) => {
                        setForm(p => ({ ...p, location_name: raw, venue: raw }));
                        if (result) setLocationCoords({ lat: result.lat, lng: result.lng });
                        else setLocationCoords(null);
                      }}
                    />
                    {locationCoords && <div style={{ fontSize:10, color:"#4ECDC4", fontWeight:700, marginTop:4, display:"flex", alignItems:"center", gap:4 }}><MapPin size={10}/>Location saved — will appear on map</div>}
                  </div>
                )}

                {/* Dates */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
                  <div>
                    <label className="ev-label">Start date</label>
                    <input className="ev-input" type="date" value={form.start_date} onChange={sf("start_date")} />
                  </div>
                  <div>
                    <label className="ev-label">End date</label>
                    <input className="ev-input" type="date" value={form.end_date} onChange={sf("end_date")} />
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom:16 }}>
                  <label className="ev-label">Description</label>
                  <textarea className="ev-input" rows={3} value={form.description} onChange={sf("description")} placeholder="What's this event about?" style={{ resize:"vertical" }} />
                </div>

                {/* Public toggle */}
                <div className="toggle-wrap" style={{ marginBottom:22 }} onClick={() => setForm(p => ({ ...p, is_public: !p.is_public }))}>
                  <div style={{ width:42, height:24, borderRadius:12, background:form.is_public?"#16A34A":"#E8E0D0", border:"2px solid #111110", position:"relative", flexShrink:0, transition:"background .2s" }}>
                    <div style={{ width:16, height:16, borderRadius:"50%", background:form.is_public?"#fff":"#9B8F7A", position:"absolute", top:2, left:form.is_public?22:2, transition:"left .2s" }}/>
                  </div>
                  <Globe size={15} color={form.is_public?"#16A34A":"#9B8F7A"} />
                  <span style={{ fontSize:13, fontWeight:700, color:"#111110" }}>
                    {form.is_public ? "Public — visible on your profile" : "Private — only you can see this"}
                  </span>
                </div>

                {/* Submit */}
                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ flex:1, padding:12, border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ flex:1, padding:12, border:"2.5px solid #111110", borderRadius:12, background:"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                    <Save size={14}/>{saving ? "Saving…" : editId ? "Update Event" : "Create Event"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════
            ADD RESOURCE MODAL
        ═══════════════════════════════════════ */}
        {showResForm && (
          <div style={{ position:"fixed", inset:0, zIndex:50, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
            onClick={() => setShowResForm(false)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:22, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:480 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:"2px solid #111110", background:"#111110", borderRadius:"20px 20px 0 0" }}>
                <h2 style={{ fontSize:18, fontWeight:900, color:"#FFD400", margin:0 }}>Add Educational Resource</h2>
                <button onClick={() => setShowResForm(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#FFD400" }}><X size={20}/></button>
              </div>
              <form onSubmit={handleSaveResource} style={{ padding:"24px" }}>

                {/* Type */}
                <div style={{ marginBottom:18 }}>
                  <label className="ev-label">Resource type</label>
                  <div style={{ display:"flex", gap:8 }}>
                    {([
                      { key:"video",   label:"Video",   icon:<Youtube size={16}/>,     color:"#FF0000" },
                      { key:"article", label:"Article", icon:<FileText size={16}/>,    color:"#0EA5E9" },
                      { key:"post",    label:"Post",    icon:<MessageSquare size={16}/>,color:"#8B5CF6" },
                    ] as const).map(rt => (
                      <div key={rt.key}
                        style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px 0", border:`2.5px solid ${resForm.type===rt.key?"#111110":"#E8E0D0"}`, borderRadius:12, cursor:"pointer", background:resForm.type===rt.key?"#F5F0E8":"#fff", fontSize:13, fontWeight:800, color:resForm.type===rt.key?"#111110":"#9B8F7A", transition:"all .15s", boxShadow:resForm.type===rt.key?"2px 2px 0 #111110":"none" }}
                        onClick={() => setResForm(p => ({ ...p, type: rt.key }))}>
                        <span style={{ color:rt.color }}>{rt.icon}</span>{rt.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label className="ev-label">Title *</label>
                  <input required className="ev-input" value={resForm.title} onChange={rSf("title")} placeholder="e.g. Introduction to oil painting techniques" />
                </div>
                <div style={{ marginBottom:14 }}>
                  <label className="ev-label">{resForm.type==="video"?"YouTube URL":resForm.type==="article"?"Article URL":"Link (optional)"}</label>
                  <input className="ev-input" type="url" value={resForm.url} onChange={rSf("url")} placeholder="https://…" />
                </div>
                <div style={{ marginBottom:22 }}>
                  <label className="ev-label">Notes / Description</label>
                  <textarea className="ev-input" rows={2} value={resForm.description} onChange={rSf("description")} placeholder="What's this about?" style={{ resize:"vertical" }}/>
                </div>

                <div style={{ display:"flex", gap:10 }}>
                  <button type="button" onClick={() => setShowResForm(false)}
                    style={{ flex:1, padding:12, border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={savingRes}
                    style={{ flex:1, padding:12, border:"2.5px solid #111110", borderRadius:12, background:"#FFD400", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"3px 3px 0 #111110" }}>
                    {savingRes ? "Saving…" : "Add Resource"}
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

// ── Event Card subcomponent ────────────────────────────────────────
function EventCard({ ev, onEdit, onDelete, delay = 0, past = false }: {
  ev: Event; onEdit: () => void; onDelete: () => void; delay?: number; past?: boolean;
}) {
  const etc = getETC(ev.event_type);
  return (
    <div className="ev-card slide-up" style={{ animationDelay:`${delay}s` }}>
      {/* Type bar */}
      <div style={{ padding:"8px 14px", borderBottom:"1px solid #F5F0E8", background:etc.bg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ color:etc.color }}>{React.cloneElement(etc.icon as React.ReactElement, { size:14 })}</div>
          <span style={{ fontSize:9, fontWeight:900, color:etc.color, textTransform:"uppercase", letterSpacing:"0.12em" }}>{etc.label}</span>
          {ev.is_online && <span style={{ fontSize:9, fontWeight:700, color:"#0EA5E9", background:"#E0F2FE", padding:"1px 6px", borderRadius:4 }}>Online</span>}
          {past && <span style={{ fontSize:9, fontWeight:700, color:"#9B8F7A", background:"rgba(0,0,0,0.06)", padding:"1px 6px", borderRadius:4 }}>Past</span>}
        </div>
        <div style={{ display:"flex", gap:5 }}>
          <button onClick={onEdit} style={{ width:26, height:26, border:"1.5px solid rgba(0,0,0,.12)", background:"rgba(255,255,255,.7)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:7 }}><Edit2 size={11}/></button>
          <button onClick={onDelete} style={{ width:26, height:26, border:"1.5px solid #FFE4E6", background:"rgba(255,255,255,.7)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", borderRadius:7 }}><Trash2 size={11} color="#FF6B6B"/></button>
        </div>
      </div>

      <div style={{ padding:"14px 16px" }}>
        <div style={{ fontSize:15, fontWeight:800, color:"#111110", marginBottom:8, letterSpacing:"-0.2px" }}>{ev.title}</div>
        {ev.description && (
          <div style={{ fontSize:12, color:"#9B8F7A", fontWeight:500, lineHeight:1.5, marginBottom:10, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" as any }}>
            {ev.description}
          </div>
        )}
        <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
          {(ev.start_date || ev.end_date) && (
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#5C5346", fontWeight:600 }}>
              <Clock size={11} color="#9B8F7A" />
              {fmtDate(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` — ${fmtDate(ev.end_date)}` : ""}
            </div>
          )}
          {(ev.venue || ev.location_name) && !ev.is_online && (
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#5C5346", fontWeight:600 }}>
              <MapPin size={11} color="#FF6B6B" />{ev.venue || ev.location_name}
              {ev.lat && <span style={{ fontSize:9, color:"#4ECDC4", fontWeight:700 }}>· on map</span>}
            </div>
          )}
          {ev.is_online && ev.online_url && (
            <a href={ev.online_url} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"#0EA5E9", fontWeight:700, textDecoration:"none" }}>
              <Globe size={11} /> Join online <ArrowRight size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Resource Card subcomponent ─────────────────────────────────────
function ResourceCard({ res, onDelete, delay = 0 }: { res: Resource; onDelete: () => void; delay?: number }) {
  const CFG = {
    video:   { icon: <Youtube size={16} />,      color: "#FF0000", bg: "#FFF0F0", label: "Video" },
    article: { icon: <FileText size={16} />,     color: "#0EA5E9", bg: "#E0F2FE", label: "Article" },
    post:    { icon: <MessageSquare size={16} />, color: "#8B5CF6", bg: "#EDE9FE", label: "Post" },
  };
  const cfg = CFG[res.type] || CFG.article;

  // Extract YouTube video ID if video
  const ytId = res.type === "video" && res.url
    ? res.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/)?.[1]
    : null;

  return (
    <div className="res-card slide-up" style={{ animationDelay:`${delay}s` }}>
      {/* YouTube thumbnail */}
      {ytId && (
        <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ display:"block", position:"relative" }}>
          <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width:"100%", aspectRatio:"16/9", objectFit:"cover", display:"block" }} />
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:44, height:44, borderRadius:"50%", background:"rgba(255,0,0,.9)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Play size={18} color="#fff" fill="#fff" />
            </div>
          </div>
        </a>
      )}

      <div style={{ padding:"12px 14px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:8, background:cfg.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, color:cfg.color }}>
            {cfg.icon}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:6 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#111110", lineHeight:1.3 }}>{res.title}</div>
              <button onClick={onDelete} style={{ background:"none", border:"none", cursor:"pointer", color:"#C0B8A8", flexShrink:0, padding:0 }}
                onMouseEnter={e => (e.currentTarget.style.color="#FF6B6B")}
                onMouseLeave={e => (e.currentTarget.style.color="#C0B8A8")}>
                <X size={13}/>
              </button>
            </div>
            {res.description && <div style={{ fontSize:11, color:"#9B8F7A", fontWeight:500, marginTop:3, lineHeight:1.5 }}>{res.description}</div>}
            {res.url && !ytId && (
              <a href={res.url} target="_blank" rel="noopener noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:6, fontSize:11, fontWeight:700, color:cfg.color, textDecoration:"none" }}>
                <LinkIcon size={10}/> Open resource
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// make React accessible in scope for cloneElement
import React from "react";
