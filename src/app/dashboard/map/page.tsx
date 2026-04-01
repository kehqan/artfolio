"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  MapPin, X, ExternalLink, CalendarRange, Handshake,
  ImageIcon, Globe, Filter, ZoomIn, ZoomOut, Locate,
} from "lucide-react";

// ── Prague districts / landmark coordinates ──────────────────────
// These are normalised 0–1000 × 0–700 canvas coords mapped to Prague's geography
// Centre is roughly Wenceslas Square / Old Town Square

const PRAGUE_LANDMARKS = [
  { id: "old_town", label: "Old Town Sq", x: 498, y: 310 },
  { id: "wenceslas", label: "Wenceslas Sq", x: 515, y: 360 },
  { id: "mala_strana", label: "Malá Strana", x: 390, y: 290 },
  { id: "vinohrady", label: "Vinohrady", x: 590, y: 380 },
  { id: "zizkov", label: "Žižkov", x: 640, y: 330 },
  { id: "holesovice", label: "Holešovice", x: 520, y: 200 },
  { id: "smichov", label: "Smíchov", x: 390, y: 400 },
  { id: "dejvice", label: "Dejvice", x: 380, y: 190 },
  { id: "josefov", label: "Josefov", x: 475, y: 295 },
  { id: "nove_mesto", label: "Nové Město", x: 510, y: 400 },
];

// Known Prague art venues with real coordinates
const STATIC_VENUES: MapVenue[] = [
  { id: "sv1", name: "DOX Centre for Contemporary Art", city: "Prague", address: "Poupětova 1, Holešovice", type: "gallery", x: 508, y: 195, color: "#FF6B6B" },
  { id: "sv2", name: "Galerie Rudolfinum", city: "Prague", address: "Alšovo nábřeží, Josefov", type: "gallery", x: 460, y: 288 , color: "#FF6B6B" },
  { id: "sv3", name: "National Gallery – Veletržní Palác", city: "Prague", address: "Dukelských hrdinů 47, Holešovice", type: "museum", x: 488, y: 185, color: "#8B5CF6" },
  { id: "sv4", name: "Meet Factory", city: "Prague", address: "Ke Sklárně 15, Smíchov", type: "studio", x: 368, y: 432, color: "#FFD400" },
  { id: "sv5", name: "Futura Gallery", city: "Prague", address: "Holečkova 49, Smíchov", type: "gallery", x: 382, y: 408, color: "#FF6B6B" },
  { id: "sv6", name: "Fotograf Gallery", city: "Prague", address: "náměstí Míru 12, Vinohrady", type: "gallery", x: 598, y: 385, color: "#FF6B6B" },
  { id: "sv7", name: "Prague City Gallery", city: "Prague", address: "Staroměstské nám., Old Town", type: "gallery", x: 495, y: 308, color: "#FF6B6B" },
  { id: "sv8", name: "Manifest Gallery", city: "Prague", address: "Mánesova 79, Vinohrady", type: "gallery", x: 612, y: 370, color: "#FF6B6B" },
];

type MapVenue = { id: string; name: string; city: string; address?: string; type?: string; x: number; y: number; color: string };
type MapEvent = { id: string; title: string; venue?: string; date?: string; x: number; y: number };
type MapCollab = { id: string; title: string; type: string; x: number; y: number };
type ActivePin = { kind: "venue" | "event" | "collab" | "artwork"; data: any; x: number; y: number } | null;

const LAYER_COLORS = {
  venue:   { dot: "#FF6B6B", bg: "#FFE4E6", border: "#FF6B6B", label: "Venues" },
  event:   { dot: "#4ECDC4", bg: "#F0FDF4", border: "#4ECDC4", label: "Events" },
  collab:  { dot: "#FFD400", bg: "#FEF9C3", border: "#CA8A04", label: "Collabs" },
  artwork: { dot: "#8B5CF6", bg: "#EDE9FE", border: "#8B5CF6", label: "Artworks" },
};

// Scatter positions for DB items with no lat/lng — spread across Prague
const SCATTER: [number, number][] = [
  [520, 250],[460, 340],[555, 310],[430, 360],[490, 420],
  [570, 270],[610, 340],[440, 290],[530, 380],[475, 230],
  [595, 420],[415, 315],[545, 360],[480, 265],[625, 295],
];
let scatterIdx = 0;
function nextPos(): [number, number] {
  const p = SCATTER[scatterIdx % SCATTER.length];
  scatterIdx++;
  return p;
}

export default function PragueMapPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [venues,   setVenues]   = useState<MapVenue[]>(STATIC_VENUES);
  const [events,   setEvents]   = useState<MapEvent[]>([]);
  const [collabs,  setCollabs]  = useState<MapCollab[]>([]);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [activePin, setActivePin] = useState<ActivePin>(null);
  const [layers, setLayers] = useState({ venue: true, event: true, collab: true, artwork: true });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    scatterIdx = 0;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const [{ data: ex }, { data: co }, { data: aw }, { data: vn }] = await Promise.all([
        supabase.from("exhibitions").select("id,title,venue,start_date,status").eq("user_id", user.id),
        supabase.from("collaborations").select("id,title,type,status").eq("user_id", user.id),
        supabase.from("artworks").select("id,title,status,venue_location,images").eq("user_id", user.id).not("venue_location", "is", null),
        supabase.from("venues").select("id,name,city,address,type"),
      ]);

      // Map exhibitions to map events
      const exEvents: MapEvent[] = (ex || []).map(e => {
        const [x, y] = nextPos();
        return { id: e.id, title: e.title, venue: e.venue, date: e.start_date, x, y };
      });
      setEvents(exEvents);

      // Map collaborations
      const coItems: MapCollab[] = (co || []).map(c => {
        const [x, y] = nextPos();
        return { id: c.id, title: c.title, type: c.type, x, y };
      });
      setCollabs(coItems);

      // Artworks with venue location
      const awItems = (aw || []).map(a => {
        const [x, y] = nextPos();
        return { ...a, x, y };
      });
      setArtworks(awItems);

      // Merge DB venues with static ones (avoid duplicates by name)
      if (vn && vn.length > 0) {
        const dbVenues: MapVenue[] = vn
          .filter((v: any) => v.city?.toLowerCase().includes("prague") || !v.city)
          .map((v: any) => {
            // Try to match a known static venue by name similarity
            const known = STATIC_VENUES.find(s => s.name.toLowerCase().includes(v.name?.toLowerCase()?.slice(0,8)));
            const [x, y] = known ? [known.x + 15, known.y + 10] : nextPos();
            return { id: `db_${v.id}`, name: v.name, city: v.city || "Prague", address: v.address, type: v.type, x, y, color: "#FF6B6B" };
          });
        setVenues(prev => {
          const merged = [...prev];
          dbVenues.forEach(dv => {
            if (!merged.find(m => m.name.toLowerCase() === dv.name.toLowerCase())) merged.push(dv);
          });
          return merged;
        });
      }

      setLoading(false);
    });
  }, []);

  // ── Zoom & Pan ──────────────────────────────────────────────────
  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.5, z - e.deltaY * 0.001)));
  }
  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as SVGElement).closest(".pin")) return;
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPan({ x: dragStart.px + (e.clientX - dragStart.x), y: dragStart.py + (e.clientY - dragStart.y) });
  }
  function onMouseUp() { setDragging(false); }
  function resetView() { setZoom(1); setPan({ x: 0, y: 0 }); }

  const toggleLayer = (k: keyof typeof layers) => setLayers(p => ({ ...p, [k]: !p[k] }));

  // Filter by search
  const q = search.toLowerCase();
  const filteredVenues  = venues.filter(v => !q || v.name.toLowerCase().includes(q) || (v.address||"").toLowerCase().includes(q));
  const filteredEvents  = events.filter(e => !q || e.title.toLowerCase().includes(q));
  const filteredCollabs = collabs.filter(c => !q || c.title.toLowerCase().includes(q));
  const filteredArtworks = artworks.filter(a => !q || a.title.toLowerCase().includes(q) || (a.venue_location||"").toLowerCase().includes(q));

  const totalPins = filteredVenues.length + filteredEvents.length + filteredCollabs.length + filteredArtworks.length;

  return (
    <>
      <style>{`
        .pin { cursor: pointer; transition: transform 0.15s; transform-origin: center bottom; }
        .pin:hover { transform: scale(1.25) translateY(-3px); }
        .pin:hover .pin-ring { opacity: 1; }
        .pin-ring { opacity: 0; transition: opacity 0.15s; }
        .layer-btn:hover { opacity: 0.8; }
        .ctrl-btn:hover { background: #FFFBEA !important; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 116px)", gap: 0 }}>

        {/* ── Page header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={22} color="#FF6B6B" /> Prague Art Map
            </h1>
            <p style={{ fontSize: 13, color: "#9B8F7A", margin: "4px 0 0", fontWeight: 600 }}>
              {loading ? "Loading…" : `${totalPins} locations · venues, events, collabs & artworks`}
            </p>
          </div>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "2px solid #111110", padding: "0 12px", background: "#fff", height: 36, minWidth: 220, boxShadow: "2px 2px 0 #111110" }}>
            <MapPin size={13} color="#9B8F7A" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search map…"
              style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", flex: 1, color: "#111110" }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A" }}><X size={12} /></button>}
          </div>
        </div>

        {/* ── Layer filters ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", flexShrink: 0 }}>
          {(Object.entries(LAYER_COLORS) as [keyof typeof LAYER_COLORS, any][]).map(([key, cfg]) => {
            const counts: Record<string, number> = {
              venue:   filteredVenues.length,
              event:   filteredEvents.length,
              collab:  filteredCollabs.length,
              artwork: filteredArtworks.length,
            };
            const icons: Record<string, any> = { venue: Globe, event: CalendarRange, collab: Handshake, artwork: ImageIcon };
            const Icon = icons[key];
            const active = layers[key];
            return (
              <button key={key} className="layer-btn" onClick={() => toggleLayer(key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `2px solid ${active ? cfg.border : "#E0D8CA"}`, background: active ? cfg.bg : "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#111110", transition: "all 0.1s" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? cfg.dot : "#d4cfc4", border: "1.5px solid rgba(0,0,0,0.15)" }} />
                <Icon size={11} color={active ? cfg.dot : "#d4cfc4"} />
                {cfg.label} <span style={{ color: active ? cfg.dot : "#d4cfc4", fontWeight: 900 }}>({counts[key]})</span>
              </button>
            );
          })}
        </div>

        {/* ── Map container ── */}
        <div style={{ flex: 1, position: "relative", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", overflow: "hidden", background: "#F5F0E8", minHeight: 0 }}>

          {/* Map controls */}
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { icon: ZoomIn,  action: () => setZoom(z => Math.min(3, z + 0.3)),   title: "Zoom in"  },
              { icon: ZoomOut, action: () => setZoom(z => Math.max(0.5, z - 0.3)), title: "Zoom out" },
              { icon: Locate,  action: resetView,                                   title: "Reset view" },
            ].map(({ icon: Icon, action, title }) => (
              <button key={title} className="ctrl-btn" onClick={action} title={title}
                style={{ width: 34, height: 34, background: "#fff", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                <Icon size={15} />
              </button>
            ))}
          </div>

          {/* Compass rose */}
          <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 10, background: "#fff", border: "2px solid #111110", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
            <svg width="28" height="28" viewBox="0 0 28 28">
              <polygon points="14,2 17,14 14,12 11,14" fill="#111110"/>
              <polygon points="14,26 17,14 14,16 11,14" fill="#d4cfc4"/>
              <polygon points="2,14 14,11 12,14 14,17" fill="#d4cfc4"/>
              <polygon points="26,14 14,11 16,14 14,17" fill="#d4cfc4"/>
              <text x="14" y="8" textAnchor="middle" fontSize="4" fontWeight="900" fill="#FFD400">N</text>
            </svg>
          </div>

          {/* Scale bar */}
          <div style={{ position: "absolute", bottom: 16, right: 60, zIndex: 10, background: "#fff", border: "2px solid #111110", padding: "4px 10px", fontSize: 9, fontWeight: 800, color: "#111110", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Prague · Art Scene
          </div>

          {/* SVG Map */}
          <svg
            ref={svgRef}
            width="100%" height="100%"
            viewBox="0 0 1000 700"
            style={{ cursor: dragging ? "grabbing" : "grab", userSelect: "none", display: "block" }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} style={{ transformOrigin: "500px 350px" }}>

              {/* ── PRAGUE BASEMAP ── */}
              {/* Outer city boundary */}
              <ellipse cx="500" cy="350" rx="420" ry="300" fill="#EAE4D0" stroke="#D4C9B0" strokeWidth="2"/>

              {/* Vltava river — flowing S-curve through Prague */}
              <path d="M 380 50 C 390 120, 370 160, 385 200 C 398 240, 360 270, 370 310 C 378 345, 400 370, 395 420 C 390 460, 370 500, 375 560"
                fill="none" stroke="#A8C8E0" strokeWidth="22" strokeLinecap="round"/>
              <path d="M 380 50 C 390 120, 370 160, 385 200 C 398 240, 360 270, 370 310 C 378 345, 400 370, 395 420 C 390 460, 370 500, 375 560"
                fill="none" stroke="#B8D4EC" strokeWidth="16" strokeLinecap="round"/>
              {/* River label */}
              <text x="342" y="330" fontSize="9" fontWeight="700" fill="#7AA8C4" transform="rotate(-80, 342, 330)" letterSpacing="2">VLTAVA</text>

              {/* Main bridges */}
              {[
                [365, 290, 415, 290], // Charles Bridge area
                [365, 330, 415, 330],
                [365, 380, 415, 380],
                [365, 430, 415, 430],
              ].map(([x1, y1, x2, y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#C8B89A" strokeWidth="4" strokeLinecap="round"/>
              ))}
              {/* Charles Bridge label */}
              <text x="390" y="285" fontSize="7" fontWeight="800" fill="#8B7355" textAnchor="middle">Charles Bridge</text>

              {/* District fills */}
              {/* Hradčany / Castle Hill */}
              <ellipse cx="340" cy="265" rx="65" ry="50" fill="#E0D8C8" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>
              {/* Old Town */}
              <ellipse cx="490" cy="315" rx="60" ry="45" fill="#E8E0CC" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>
              {/* New Town */}
              <ellipse cx="515" cy="390" rx="65" ry="50" fill="#E4DCc8" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>
              {/* Vinohrady */}
              <ellipse cx="590" cy="385" rx="55" ry="42" fill="#E8E0CC" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>
              {/* Žižkov */}
              <ellipse cx="635" cy="335" rx="55" ry="40" fill="#E4DCC8" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>
              {/* Holešovice */}
              <ellipse cx="520" cy="205" rx="70" ry="48" fill="#E8E0CC" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>
              {/* Smíchov */}
              <ellipse cx="385" cy="415" rx="55" ry="45" fill="#E4DCC8" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>
              {/* Dejvice */}
              <ellipse cx="385" cy="195" rx="60" ry="44" fill="#E8E0CC" stroke="#C8C0B0" strokeWidth="1" opacity="0.7"/>

              {/* Prague Castle */}
              <rect x="300" y="245" width="55" height="30" rx="2" fill="#D4C9A8" stroke="#B0A888" strokeWidth="1.5"/>
              <rect x="308" y="240" width="8" height="8" fill="#C8BE9C" stroke="#B0A888" strokeWidth="1"/>
              <rect x="322" y="238" width="10" height="12" fill="#C8BE9C" stroke="#B0A888" strokeWidth="1"/>
              <rect x="338" y="240" width="8" height="8" fill="#C8BE9C" stroke="#B0A888" strokeWidth="1"/>
              <text x="328" y="285" fontSize="7.5" fontWeight="900" fill="#6B5E3E" textAnchor="middle" letterSpacing="0.5">PRAGUE CASTLE</text>

              {/* Major roads */}
              {[
                "M 200 350 L 800 350", // East-West
                "M 500 80  L 500 620", // North-South  
                "M 280 200 L 700 480", // Diagonal NW-SE
                "M 300 480 L 680 200", // Diagonal SW-NE
                "M 200 280 L 700 280", // Northern road
                "M 200 430 L 720 430", // Southern road
              ].map((d, i) => (
                <path key={i} d={d} stroke="#D4C4A8" strokeWidth={i < 2 ? 6 : 3} fill="none" opacity="0.5"/>
              ))}

              {/* Metro lines */}
              <path d="M 250 350 L 780 350" stroke="#16A34A" strokeWidth="4" fill="none" opacity="0.5" strokeDasharray="12,4"/>
              <path d="M 500 120 L 500 580" stroke="#E11D48" strokeWidth="4" fill="none" opacity="0.5" strokeDasharray="12,4"/>
              <path d="M 270 460 L 700 230" stroke="#CA8A04" strokeWidth="4" fill="none" opacity="0.5" strokeDasharray="12,4"/>
              {/* Metro labels */}
              <text x="255" y="344" fontSize="7" fontWeight="800" fill="#16A34A" opacity="0.8">A</text>
              <text x="492" y="115" fontSize="7" fontWeight="800" fill="#E11D48" opacity="0.8">C</text>
              <text x="262" y="457" fontSize="7" fontWeight="800" fill="#CA8A04" opacity="0.8">B</text>

              {/* District labels */}
              {PRAGUE_LANDMARKS.map(lm => (
                <text key={lm.id} x={lm.x} y={lm.y} fontSize="8.5" fontWeight="700" fill="#9B8F7A" textAnchor="middle" opacity="0.8" letterSpacing="0.5">
                  {lm.label.toUpperCase()}
                </text>
              ))}

              {/* ── VENUE PINS ── */}
              {layers.venue && filteredVenues.map(v => (
                <g key={v.id} className="pin" onClick={() => setActivePin(ap => ap?.data.id === v.id ? null : { kind: "venue", data: v, x: v.x, y: v.y })}>
                  {/* Pulse ring */}
                  <circle className="pin-ring" cx={v.x} cy={v.y} r="16" fill="none" stroke="#FF6B6B" strokeWidth="2" opacity="0.4"/>
                  {/* Shadow */}
                  <ellipse cx={v.x + 1} cy={v.y + 14} rx="6" ry="3" fill="rgba(0,0,0,0.15)"/>
                  {/* Pin body */}
                  <path d={`M${v.x},${v.y - 18} C${v.x - 10},${v.y - 18} ${v.x - 10},${v.y - 4} ${v.x},${v.y + 4} C${v.x + 10},${v.y - 4} ${v.x + 10},${v.y - 18} ${v.x},${v.y - 18}Z`}
                    fill="#FF6B6B" stroke="#111110" strokeWidth="1.5"/>
                  <circle cx={v.x} cy={v.y - 13} r="4" fill="#fff"/>
                  {/* Active indicator */}
                  {activePin?.data.id === v.id && <circle cx={v.x} cy={v.y - 13} r="6" fill="none" stroke="#FFD400" strokeWidth="2"/>}
                </g>
              ))}

              {/* ── EVENT PINS ── */}
              {layers.event && filteredEvents.map(ev => (
                <g key={ev.id} className="pin" onClick={() => setActivePin(ap => ap?.data.id === ev.id ? null : { kind: "event", data: ev, x: ev.x, y: ev.y })}>
                  <circle className="pin-ring" cx={ev.x} cy={ev.y} r="16" fill="none" stroke="#4ECDC4" strokeWidth="2" opacity="0.4"/>
                  <ellipse cx={ev.x + 1} cy={ev.y + 14} rx="6" ry="3" fill="rgba(0,0,0,0.15)"/>
                  {/* Star-shaped event marker */}
                  <path d={`M${ev.x},${ev.y - 20} L${ev.x + 5},${ev.y - 9} L${ev.x + 18},${ev.y - 9} L${ev.x + 8},${ev.y - 1} L${ev.x + 12},${ev.y + 10} L${ev.x},${ev.y + 4} L${ev.x - 12},${ev.y + 10} L${ev.x - 8},${ev.y - 1} L${ev.x - 18},${ev.y - 9} L${ev.x - 5},${ev.y - 9}Z`}
                    fill="#4ECDC4" stroke="#111110" strokeWidth="1.5" transform={`scale(0.65) translate(${ev.x * 0.54}, ${ev.y * 0.54})`}/>
                  {/* Simpler: just diamond */}
                  <path d={`M${ev.x},${ev.y - 16} L${ev.x + 10},${ev.y - 6} L${ev.x},${ev.y + 4} L${ev.x - 10},${ev.y - 6}Z`}
                    fill="#4ECDC4" stroke="#111110" strokeWidth="1.5"/>
                  <circle cx={ev.x} cy={ev.y - 6} r="3" fill="#fff"/>
                  {activePin?.data.id === ev.id && <circle cx={ev.x} cy={ev.y - 6} r="5" fill="none" stroke="#FFD400" strokeWidth="2"/>}
                </g>
              ))}

              {/* ── COLLAB PINS ── */}
              {layers.collab && filteredCollabs.map(co => (
                <g key={co.id} className="pin" onClick={() => setActivePin(ap => ap?.data.id === co.id ? null : { kind: "collab", data: co, x: co.x, y: co.y })}>
                  <circle className="pin-ring" cx={co.x} cy={co.y} r="16" fill="none" stroke="#FFD400" strokeWidth="2" opacity="0.4"/>
                  <ellipse cx={co.x + 1} cy={co.y + 12} rx="6" ry="3" fill="rgba(0,0,0,0.15)"/>
                  {/* Hexagon for collab */}
                  <path d={`M${co.x},${co.y - 14} L${co.x + 12},${co.y - 7} L${co.x + 12},${co.y + 7} L${co.x},${co.y + 14} L${co.x - 12},${co.y + 7} L${co.x - 12},${co.y - 7}Z`}
                    fill="#FFD400" stroke="#111110" strokeWidth="1.5"/>
                  <text x={co.x} y={co.y + 4} fontSize="8" fontWeight="900" fill="#111110" textAnchor="middle">C</text>
                  {activePin?.data.id === co.id && <path d={`M${co.x},${co.y - 18} L${co.x + 16},${co.y - 9} L${co.x + 16},${co.y + 9} L${co.x},${co.y + 18} L${co.x - 16},${co.y - 9} L${co.x - 16},${co.y + 9}Z`} fill="none" stroke="#FFD400" strokeWidth="2" opacity="0.6"/>}
                </g>
              ))}

              {/* ── ARTWORK PINS ── */}
              {layers.artwork && filteredArtworks.map(aw => (
                <g key={aw.id} className="pin" onClick={() => setActivePin(ap => ap?.data.id === aw.id ? null : { kind: "artwork", data: aw, x: aw.x, y: aw.y })}>
                  <circle className="pin-ring" cx={aw.x} cy={aw.y} r="16" fill="none" stroke="#8B5CF6" strokeWidth="2" opacity="0.4"/>
                  <ellipse cx={aw.x + 1} cy={aw.y + 12} rx="6" ry="3" fill="rgba(0,0,0,0.15)"/>
                  {/* Square frame for artwork */}
                  <rect x={aw.x - 10} y={aw.y - 16} width="20" height="20" rx="2" fill="#8B5CF6" stroke="#111110" strokeWidth="1.5"/>
                  <rect x={aw.x - 7} y={aw.y - 13} width="14" height="14" rx="1" fill="rgba(255,255,255,0.3)" stroke="#fff" strokeWidth="0.5"/>
                  {activePin?.data.id === aw.id && <rect x={aw.x - 13} y={aw.y - 19} width="26" height="26" rx="3" fill="none" stroke="#FFD400" strokeWidth="2"/>}
                </g>
              ))}

            </g>
          </svg>

          {/* ── Active pin popup ── */}
          {activePin && (
            <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20, background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", padding: "14px 18px", minWidth: 280, maxWidth: 380 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: activePin.kind === "collab" ? 0 : "50%", background: LAYER_COLORS[activePin.kind].dot, border: "1.5px solid #111110" }} />
                  <span style={{ fontSize: 9, fontWeight: 900, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.12em" }}>{LAYER_COLORS[activePin.kind].label.slice(0,-1)}</span>
                </div>
                <button onClick={() => setActivePin(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A" }}><X size={14}/></button>
              </div>

              {activePin.kind === "venue" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{activePin.data.name}</div>
                  {activePin.data.address && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 4 }}><MapPin size={11} style={{ display: "inline" }} /> {activePin.data.address}</div>}
                  {activePin.data.type && <div style={{ display: "inline-block", padding: "2px 8px", background: "#FFE4E6", border: "1.5px solid #FF6B6B", fontSize: 9, fontWeight: 800, color: "#FF6B6B", textTransform: "uppercase", letterSpacing: "0.1em" }}>{activePin.data.type}</div>}
                </div>
              )}

              {activePin.kind === "event" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{activePin.data.title}</div>
                  {activePin.data.venue && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>@ {activePin.data.venue}</div>}
                  {activePin.data.date && <div style={{ fontSize: 11, color: "#4ECDC4", fontWeight: 700, marginTop: 4 }}>Opens {new Date(activePin.data.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
                  <Link href={`/dashboard/exhibitions/${activePin.data.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 10px", border: "1.5px solid #111110", background: "#F0FDF4", fontSize: 10, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                      <ExternalLink size={10} /> View event
                    </div>
                  </Link>
                </div>
              )}

              {activePin.kind === "collab" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{activePin.data.title}</div>
                  {activePin.data.type && <div style={{ display: "inline-block", padding: "2px 8px", background: "#FEF9C3", border: "1.5px solid #CA8A04", fontSize: 9, fontWeight: 800, color: "#854D0E", textTransform: "uppercase", letterSpacing: "0.1em" }}>{activePin.data.type}</div>}
                  <Link href="/dashboard/pool" style={{ textDecoration: "none" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 10px", border: "1.5px solid #111110", background: "#FEF9C3", fontSize: 10, fontWeight: 700, color: "#111110", cursor: "pointer", marginLeft: 8 }}>
                      <ExternalLink size={10} /> View collab
                    </div>
                  </Link>
                </div>
              )}

              {activePin.kind === "artwork" && (
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {Array.isArray(activePin.data.images) && activePin.data.images[0] && (
                    <div style={{ width: 60, height: 60, border: "2px solid #111110", overflow: "hidden", flexShrink: 0 }}>
                      <img src={activePin.data.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 2 }}>{activePin.data.title}</div>
                    {activePin.data.venue_location && <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}><MapPin size={10} style={{ display: "inline" }} /> {activePin.data.venue_location}</div>}
                    <Link href={`/dashboard/artworks/${activePin.data.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 10px", border: "1.5px solid #111110", background: "#EDE9FE", fontSize: 10, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                        <ExternalLink size={10} /> View artwork
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", gap: 16, paddingTop: 12, flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "center" }}>Legend:</div>
          {[
            { shape: "circle",  color: "#FF6B6B", label: "Venue / Gallery" },
            { shape: "diamond", color: "#4ECDC4", label: "Event / Show" },
            { shape: "hex",     color: "#FFD400", label: "Collaboration" },
            { shape: "square",  color: "#8B5CF6", label: "Artwork on display" },
            { shape: "line",    color: "#16A34A", label: "Metro line A" },
            { shape: "line",    color: "#E11D48", label: "Metro line C" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#5C5346" }}>
              {item.shape === "circle"  && <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, border: "1.5px solid #111110", flexShrink: 0 }} />}
              {item.shape === "diamond" && <div style={{ width: 10, height: 10, background: item.color, border: "1.5px solid #111110", transform: "rotate(45deg)", flexShrink: 0 }} />}
              {item.shape === "hex"     && <div style={{ width: 10, height: 10, background: item.color, border: "1.5px solid #111110", flexShrink: 0 }} />}
              {item.shape === "square"  && <div style={{ width: 10, height: 10, background: item.color, border: "1.5px solid #111110", borderRadius: 2, flexShrink: 0 }} />}
              {item.shape === "line"    && <div style={{ width: 16, height: 3, background: item.color, flexShrink: 0, opacity: 0.8 }} />}
              {item.label}
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>Scroll to zoom · drag to pan · click pins for detail</div>
        </div>
      </div>
    </>
  );
}
