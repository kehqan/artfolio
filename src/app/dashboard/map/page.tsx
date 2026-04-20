"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MapPin, X, ImageIcon, Users, Handshake, CalendarDays, ExternalLink } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type Kind = "venue" | "event" | "collab" | "artwork" | "pool";
type MapItem = { id: string; lat: number; lng: number; title: string; kind: Kind; data: any };
type ActivePin = { kind: Kind; data: any } | null;

// ── Config ────────────────────────────────────────────────────────
const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };

const CFG: Record<Kind, { color: string; bg: string; border: string; label: string; icon: any }> = {
  venue:   { color:"#FF6B6B", bg:"#FFF0F0", border:"#FF6B6B", label:"Venues",  icon:MapPin       },
  event:   { color:"#4ECDC4", bg:"#F0FFFE", border:"#4ECDC4", label:"Events",  icon:CalendarDays },
  collab:  { color:"#CA8A04", bg:"#FEF9C3", border:"#CA8A04", label:"Collabs", icon:Handshake    },
  artwork: { color:"#8B5CF6", bg:"#EDE9FE", border:"#8B5CF6", label:"Artworks", icon:ImageIcon   },
  pool:    { color:"#FFD400", bg:"#FEF9C3", border:"#CA8A04", label:"Pool",     icon:Users        },
};

const MAP_STYLE = [
  { elementType:"geometry",          stylers:[{color:"#F5F0E8"}] },
  { elementType:"labels.text.fill",  stylers:[{color:"#5C5346"}] },
  { elementType:"labels.text.stroke",stylers:[{color:"#FFFBEA"}] },
  { featureType:"water",     elementType:"geometry", stylers:[{color:"#A8C8E0"}] },
  { featureType:"road",      elementType:"geometry", stylers:[{color:"#E0D8CA"}] },
  { featureType:"road.arterial", elementType:"geometry", stylers:[{color:"#D4C9A8"}] },
  { featureType:"road.highway",  elementType:"geometry", stylers:[{color:"#C8B89A"}] },
  { featureType:"poi",       elementType:"geometry", stylers:[{color:"#E8E0CC"}] },
  { featureType:"poi.park",  elementType:"geometry", stylers:[{color:"#D4E8C8"}] },
  { featureType:"landscape", elementType:"geometry", stylers:[{color:"#EAE4D0"}] },
  { featureType:"transit",   elementType:"geometry", stylers:[{color:"#E0D8CA"}] },
];

declare global { interface Window { google: any; initArtfolioMap: () => void; } }

// ── CHANGE 1: Emoji teardrop pin SVGs ─────────────────────────────
function markerSvg(kind: Kind): string {
  const c = CFG[kind].color;
  const emoji: Record<Kind, string> = {
    venue:   "🏛️",
    event:   "🎪",
    collab:  "🤝",
    artwork: "🖼️",
    pool:    "✨",
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
    <defs>
      <filter id="shadow" x="-20%" y="-10%" width="150%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.3)"/>
      </filter>
    </defs>
    <path d="M20 2C11.16 2 4 9.16 4 18c0 12.15 16 32 16 32S36 30.15 36 18C36 9.16 28.84 2 20 2z"
      fill="${c}" stroke="#111110" stroke-width="2" filter="url(#shadow)"/>
    <circle cx="20" cy="18" r="11" fill="white" opacity="0.95"/>
    <text x="20" y="23" text-anchor="middle" font-size="13" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji[kind]}</text>
  </svg>`;
}

// ── Spiral fallback positions ─────────────────────────────────────
function makeNextPos() {
  let i = 0;
  return () => {
    const angle = i * 2.4;
    const r = 0.002 * Math.sqrt(i);
    i++;
    return { lat: PRAGUE_CENTER.lat + r * Math.sin(angle), lng: PRAGUE_CENTER.lng + r * Math.cos(angle) };
  };
}

// ════════════════════════════════════════════════════════════════════
export default function PragueMapPage() {
  const mapRef       = useRef<HTMLDivElement>(null);
  const mapObj       = useRef<any>(null);
  const markers      = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null); // CHANGE 2: shared InfoWindow ref

  const [ready, setReady]     = useState(false);
  const [items, setItems]     = useState<MapItem[]>([]);
  const [active, setActive]   = useState<ActivePin>(null);
  const [layers, setLayers]   = useState<Record<Kind, boolean>>({ venue:true, event:true, collab:true, artwork:true, pool:true });
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [hasKey, setHasKey]   = useState(true);

  const visible = items.filter(i => layers[i.kind] && (!search || i.title.toLowerCase().includes(search.toLowerCase()))).length;

  // ── Load data ─────────────────────────────────────────────────
  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const nextPos = makeNextPos();
      const [
        { data: ve },
        { data: ev },
        { data: co },
        { data: aw },
        { data: pr },
      ] = await Promise.all([
        sb.from("venues").select("*"),
        sb.from("exhibitions").select("*").eq("is_public", true),
        sb.from("pool_requests").select("*").not("lat", "is", null),
        sb.from("artworks").select("*").not("venue_location", "is", null),
        sb.from("pool_requests").select("*").eq("user_id", user.id),
      ]);

      const all: MapItem[] = [
        // Venues
        ...(ve || []).filter((v: any) => v.lat && v.lng).map((v: any) => ({
          id: v.id, lat: v.lat, lng: v.lng, title: v.name, kind: "venue" as Kind, data: v,
        })),
        // Events / exhibitions
        ...(ev || []).map((e: any) => {
          const pos = (e.lat && e.lng) ? { lat: e.lat, lng: e.lng } : nextPos();
          return { id: e.id, ...pos, title: e.title, kind: "event" as Kind, data: e };
        }),
        // Collabs
        ...(co || []).map((c: any) => {
          const pos = (c.lat && c.lng) ? { lat: c.lat, lng: c.lng } : nextPos();
          return { id: c.id, ...pos, title: c.title, kind: "collab" as Kind, data: c };
        }),
        // Artworks on display
        ...(aw || []).filter((a: any) => a.venue_location || a.location_name).map((a: any) => {
          const pos = (a.location_lat && a.location_lng) ? { lat: a.location_lat, lng: a.location_lng } : nextPos();
          return { id: a.id, ...pos, title: a.title, kind: "artwork" as Kind, data: a };
        }),
        // Pool requests
        ...(pr || []).map((p: any) => {
          const pos = (p.lat && p.lng) ? { lat: p.lat, lng: p.lng } : nextPos();
          return { id: p.id, ...pos, title: p.title, kind: "pool" as Kind, data: p };
        }),
      ];

      setItems(all);
      setLoading(false);
    });
  }, []);

  // ── Load Maps script ──────────────────────────────────────────
  useEffect(() => {
    if (window.google?.maps) { setReady(true); return; }
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key) { setHasKey(false); return; }
    window.initArtfolioMap = () => setReady(true);
    if (document.getElementById("gmaps")) return;
    const s = document.createElement("script");
    s.id  = "gmaps";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=initArtfolioMap&loading=async`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
    return () => { delete (window as any).initArtfolioMap; };
  }, []);

  // ── Init map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      center: PRAGUE_CENTER, zoom: 13, styles: MAP_STYLE,
      disableDefaultUI: true, zoomControl: false, mapTypeControl: false,
      streetViewControl: false, fullscreenControl: false,
    });
    // CHANGE 4: close InfoWindow when clicking empty map area
    mapObj.current.addListener("click", () => {
      if (infoWindowRef.current) infoWindowRef.current.close();
      setActive(null);
    });
    buildMarkers();
  }, [ready, items]);

  // ── Re-draw on filter/search change ──────────────────────────
  useEffect(() => { if (mapObj.current) buildMarkers(); }, [layers, search, items]);

  function toggleLayer(k: Kind) {
    setLayers(prev => ({ ...prev, [k]: !prev[k] }));
  }

  function buildMarkers() {
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];
    const q = search.toLowerCase();
    items.forEach(item => {
      if (!layers[item.kind]) return;
      if (q && !item.title.toLowerCase().includes(q)) return;
      const svg = markerSvg(item.kind);
      const url = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
      const marker = new window.google.maps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map: mapObj.current,
        title: item.title,
        // CHANGE 3: updated icon size to match 40×52 teardrop pin
        icon: { url, scaledSize: new window.google.maps.Size(40, 52), anchor: new window.google.maps.Point(20, 52) },
        animation: window.google.maps.Animation.DROP,
      });

      // CHANGE 2: InfoWindow popup on click
      marker.addListener("click", () => {
        setActive({ kind: item.kind, data: item.data });

        const cfg = CFG[item.kind];
        const d   = item.data;
        let body  = "";

        if (item.kind === "venue") {
          body = `
            <div style="font-family:'Darker Grotesque',system-ui,sans-serif;min-width:200px;max-width:260px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:32px;height:32px;border-radius:9px;background:${cfg.bg};border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🏛️</div>
                <div>
                  <div style="font-size:9px;font-weight:800;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em">${d.type || "Venue"}</div>
                  <div style="font-size:14px;font-weight:900;color:#111110;letter-spacing:-.3px;line-height:1.2">${d.name || d.title}</div>
                </div>
              </div>
              ${d.address ? `<div style="font-size:11px;color:#9B8F7A;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:4px">📍 ${d.address}</div>` : ""}
              ${d.city    ? `<div style="font-size:11px;color:#9B8F7A;font-weight:600;margin-bottom:8px">📍 ${d.city}</div>` : ""}
              <a href="https://maps.google.com/?q=${encodeURIComponent((d.address || d.name || ""))}" target="_blank"
                style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;background:#111110;border-radius:8px;font-size:11px;font-weight:700;color:#FFD400;text-decoration:none;margin-top:4px">
                Open in Maps →
              </a>
            </div>`;
        } else if (item.kind === "event") {
          const dateStr = d.start_date ? new Date(d.start_date).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" }) : null;
          body = `
            <div style="font-family:'Darker Grotesque',system-ui,sans-serif;min-width:200px;max-width:260px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:32px;height:32px;border-radius:9px;background:${cfg.bg};border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🎪</div>
                <div>
                  <div style="font-size:9px;font-weight:800;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em">Exhibition / Event</div>
                  <div style="font-size:14px;font-weight:900;color:#111110;letter-spacing:-.3px;line-height:1.2">${d.title}</div>
                </div>
              </div>
              ${d.venue || d.location_name ? `<div style="font-size:11px;color:#9B8F7A;font-weight:600;margin-bottom:6px">🏛️ ${d.venue || d.location_name}</div>` : ""}
              ${dateStr ? `<div style="font-size:11px;font-weight:700;color:#0F6E56;padding:4px 8px;background:#F0FDF4;border-radius:6px;display:inline-block;margin-bottom:8px">📅 ${dateStr}</div>` : ""}
              ${d.status ? `<div style="font-size:9px;font-weight:900;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px">${d.status}</div>` : ""}
              <a href="/dashboard/exhibitions" style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;background:${cfg.bg};border:1.5px solid ${cfg.color};border-radius:8px;font-size:11px;font-weight:700;color:#111110;text-decoration:none">
                View Events →
              </a>
            </div>`;
        } else if (item.kind === "collab") {
          body = `
            <div style="font-family:'Darker Grotesque',system-ui,sans-serif;min-width:200px;max-width:260px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:32px;height:32px;border-radius:9px;background:${cfg.bg};border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🤝</div>
                <div>
                  <div style="font-size:9px;font-weight:800;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em">Collaboration</div>
                  <div style="font-size:14px;font-weight:900;color:#111110;letter-spacing:-.3px;line-height:1.2">${d.title}</div>
                </div>
              </div>
              ${d.type   ? `<div style="font-size:11px;color:#9B8F7A;font-weight:600;margin-bottom:4px">Type: ${d.type}</div>` : ""}
              ${d.status ? `<div style="font-size:9px;font-weight:900;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;background:${cfg.bg};border-radius:6px;display:inline-block;margin-bottom:8px">${d.status}</div>` : ""}
              <a href="/dashboard/pool" style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;background:#111110;border-radius:8px;font-size:11px;font-weight:700;color:#FFD400;text-decoration:none">
                View in Pool →
              </a>
            </div>`;
        } else if (item.kind === "artwork") {
          const img = Array.isArray(d.images) && d.images[0] ? d.images[0] : null;
          body = `
            <div style="font-family:'Darker Grotesque',system-ui,sans-serif;min-width:200px;max-width:260px">
              ${img ? `<div style="width:100%;height:110px;border-radius:10px;overflow:hidden;margin-bottom:10px;border:1.5px solid #E8E0D0"><img src="${img}" style="width:100%;height:100%;object-fit:cover"/></div>` : ""}
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:32px;height:32px;border-radius:9px;background:${cfg.bg};border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🖼️</div>
                <div>
                  <div style="font-size:9px;font-weight:800;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em">Artwork on Display</div>
                  <div style="font-size:14px;font-weight:900;color:#111110;letter-spacing:-.3px;line-height:1.2">${d.title}</div>
                </div>
              </div>
              ${d.venue_location || d.location_name ? `<div style="font-size:11px;color:#9B8F7A;font-weight:600;margin-bottom:8px">📍 ${d.venue_location || d.location_name}</div>` : ""}
              ${d.status ? `<div style="font-size:9px;font-weight:900;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;background:${cfg.bg};border-radius:6px;display:inline-block;margin-bottom:8px">${d.status}</div>` : ""}
              <a href="/dashboard/artworks/${d.id}" style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;background:${cfg.bg};border:1.5px solid ${cfg.color};border-radius:8px;font-size:11px;font-weight:700;color:#111110;text-decoration:none">
                View Artwork →
              </a>
            </div>`;
        } else if (item.kind === "pool") {
          body = `
            <div style="font-family:'Darker Grotesque',system-ui,sans-serif;min-width:200px;max-width:260px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div style="width:32px;height:32px;border-radius:9px;background:${cfg.bg};border:2px solid ${cfg.color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">✨</div>
                <div>
                  <div style="font-size:9px;font-weight:800;color:${cfg.color};text-transform:uppercase;letter-spacing:.1em">${d.poster_type || "Pool"} Request</div>
                  <div style="font-size:14px;font-weight:900;color:#111110;letter-spacing:-.3px;line-height:1.2">${d.title}</div>
                </div>
              </div>
              ${d.location_name || d.venue_city ? `<div style="font-size:11px;color:#9B8F7A;font-weight:600;margin-bottom:8px">📍 ${d.location_name || d.venue_city}</div>` : ""}
              ${d.status ? `<div style="font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;background:${cfg.bg};border-radius:6px;display:inline-block;margin-bottom:8px;color:#111110">${d.status}</div>` : ""}
              <a href="/dashboard/pool" style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;background:#FFD400;border:1.5px solid #111110;border-radius:8px;font-size:11px;font-weight:700;color:#111110;text-decoration:none">
                View in Pool →
              </a>
            </div>`;
        }

        // Close previous InfoWindow, open new one
        if (infoWindowRef.current) infoWindowRef.current.close();
        infoWindowRef.current = new window.google.maps.InfoWindow({
          content: body,
          ariaLabel: item.title,
          pixelOffset: new window.google.maps.Size(0, -46),
        });
        infoWindowRef.current.open({ anchor: marker, map: mapObj.current });
      });

      markers.current.push(marker);
    });
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* CHANGE 5: InfoWindow custom styles */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Google Maps InfoWindow Ripe overrides */
        .gm-style .gm-style-iw-c {
          border-radius: 16px !important;
          border: 2.5px solid #111110 !important;
          box-shadow: 4px 5px 0 #111110 !important;
          padding: 14px 16px !important;
          font-family: 'Darker Grotesque', system-ui, sans-serif !important;
        }
        .gm-style .gm-style-iw-d {
          overflow: hidden !important;
          max-height: none !important;
        }
        .gm-style .gm-style-iw-t::after {
          background: #111110 !important;
          width: 12px !important;
          height: 12px !important;
        }
        .gm-ui-hover-effect {
          top: 4px !important;
          right: 4px !important;
        }
        .gm-ui-hover-effect span {
          background-color: #111110 !important;
        }
      `}</style>

      <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 64px)", padding:"20px 24px", gap:12, fontFamily:"'Darker Grotesque',system-ui,sans-serif", minHeight:0 }}>

        {/* Header row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, flexWrap:"wrap", gap:10 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", margin:0 }}>Prague Art Map</h1>
            <p style={{ fontSize:12, color:"#9B8F7A", fontWeight:600, margin:0 }}>
              {loading ? "Loading…" : `${visible} locations · venues, events, collabs & artworks`}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, border:"2px solid #111110", padding:"0 12px", background:"#fff", height:38, minWidth:240, boxShadow:"2px 2px 0 #111110" }}>
            <MapPin size={13} color="#9B8F7A"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search map…"
              style={{ border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent", flex:1, color:"#111110" }}/>
            {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A", padding:0 }}><X size={12}/></button>}
          </div>
        </div>

        {/* Layer filters */}
        <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", flexShrink:0 }}>
          {(Object.entries(CFG) as [Kind, any][]).map(([k, cfg]) => {
            const count = items.filter(i => i.kind === k).length;
            const Icon  = cfg.icon;
            const on    = layers[k];
            return (
              <button key={k} onClick={() => toggleLayer(k)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", border:`2px solid ${on ? cfg.border : "#E0D8CA"}`, background: on ? cfg.bg : "#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:"#111110", transition:"all 0.1s" }}>
                <div style={{ width:8, height:8, borderRadius: k === "artwork" ? 2 : "50%", background: on ? cfg.color : "#d4cfc4", border:"1.5px solid rgba(0,0,0,0.1)" }}/>
                <Icon size={11} color={on ? cfg.color : "#d4cfc4"}/>
                {cfg.label} <span style={{ color: on ? cfg.color : "#d4cfc4", fontWeight:900 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Map + sidebar */}
        <div style={{ flex:1, display:"flex", gap:0, minHeight:0, border:"2px solid #111110", boxShadow:"4px 4px 0 #111110", overflow:"hidden" }}>

          {/* Map */}
          <div style={{ flex:1, position:"relative" }}>
            {!hasKey && (
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"#F5F0E8", zIndex:10, flexDirection:"column", gap:12, padding:24 }}>
                <MapPin size={40} color="#FF6B6B"/>
                <div style={{ fontSize:15, fontWeight:800, color:"#111110" }}>Google Maps API key missing</div>
                <div style={{ fontSize:12, color:"#9B8F7A", textAlign:"center", maxWidth:320 }}>
                  Add <code style={{ background:"#F0EBE1", padding:"2px 6px", border:"1px solid #E0D8CA", fontSize:11 }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your Vercel environment variables, then redeploy.
                </div>
              </div>
            )}

            <div ref={mapRef} style={{ width:"100%", height:"100%" }}/>

            {/* Zoom controls */}
            <div style={{ position:"absolute", top:12, right:12, zIndex:10, display:"flex", flexDirection:"column", gap:4 }}>
              {[
                { lbl:"+",  fn: () => mapObj.current?.setZoom((mapObj.current.getZoom() || 13) + 1) },
                { lbl:"−",  fn: () => mapObj.current?.setZoom((mapObj.current.getZoom() || 13) - 1) },
                { lbl:"⌖", fn: () => { mapObj.current?.setCenter(PRAGUE_CENTER); mapObj.current?.setZoom(13); } },
              ].map(b => (
                <button key={b.lbl} onClick={b.fn}
                  style={{ width:34, height:34, background:"#fff", border:"2px solid #111110", fontSize:16, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"2px 2px 0 #111110", color:"#111110" }}>
                  {b.lbl}
                </button>
              ))}
            </div>

            {/* Loading overlay */}
            {!ready && hasKey && (
              <div style={{ position:"absolute", inset:0, background:"#F5F0E8", display:"flex", alignItems:"center", justifyContent:"center", zIndex:5, flexDirection:"column", gap:12 }}>
                <div style={{ width:40, height:40, border:"3px solid #E0D8CA", borderTop:"3px solid #FFD400", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
                <div style={{ fontSize:13, fontWeight:700, color:"#9B8F7A" }}>Loading map…</div>
              </div>
            )}
          </div>

          {/* Active pin sidebar */}
          <div style={{ width: active ? 300 : 0, flexShrink:0, borderLeft: active ? "2px solid #111110" : "none", overflow:"hidden", transition:"width 0.2s ease", background:"#FAFAF8" }}>
            {active && (
              <div style={{ width:300, height:"100%", display:"flex", flexDirection:"column", overflowY:"auto" }}>
                {/* Sidebar header */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px", borderBottom:"2px solid #111110", background: CFG[active.kind].bg, flexShrink:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background: CFG[active.kind].color, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {(() => { const Icon = CFG[active.kind].icon; return <Icon size={14} color="#fff"/>; })()}
                    </div>
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color: CFG[active.kind].color, textTransform:"uppercase", letterSpacing:"0.1em" }}>{CFG[active.kind].label}</div>
                    </div>
                  </div>
                  <button onClick={() => { setActive(null); if (infoWindowRef.current) infoWindowRef.current.close(); }}
                    style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A", padding:4, display:"flex" }}>
                    <X size={16}/>
                  </button>
                </div>

                {/* Sidebar body */}
                <div style={{ padding:16, display:"flex", flexDirection:"column", gap:10, flex:1 }}>

                  {/* VENUE */}
                  {active.kind === "venue" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.name || active.data.title}</h2>
                    {active.data.type && <div style={{ display:"inline-block", padding:"3px 10px", background:"#FFF0F0", border:"1.5px solid #FF6B6B", fontSize:9, fontWeight:900, color:"#CC2222", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.type}</div>}
                    {(active.data.address || active.data.city) && (
                      <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}>
                        <MapPin size={12} style={{ flexShrink:0, marginTop:1 }}/>{active.data.address || active.data.city}
                      </div>
                    )}
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(active.data.address || active.data.name)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration:"none" }}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> Open in Google Maps
                      </div>
                    </a>
                  </>}

                  {/* EVENT */}
                  {active.kind === "event" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {(active.data.venue || active.data.location_name) && <div style={{ fontSize:12, color:"#9B8F7A", fontWeight:600 }}>@ {active.data.venue || active.data.location_name}</div>}
                    {active.data.start_date && <div style={{ padding:"6px 10px", background:"#F0FDF4", border:"1.5px solid #4ECDC4", fontSize:11, fontWeight:700, color:"#0F6E56" }}>Opens {new Date(active.data.start_date).toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}</div>}
                    {active.data.status && <div style={{ display:"inline-block", padding:"3px 10px", background:"#F0FDF4", border:"1.5px solid #4ECDC4", fontSize:9, fontWeight:900, color:"#16A34A", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.status}</div>}
                    <Link href="/dashboard/exhibitions" style={{ textDecoration:"none" }}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#F0FDF4", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> View event
                      </div>
                    </Link>
                  </>}

                  {/* COLLAB */}
                  {active.kind === "collab" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {active.data.type && <div style={{ display:"inline-block", padding:"3px 10px", background:"#FEF9C3", border:"1.5px solid #CA8A04", fontSize:9, fontWeight:900, color:"#854D0E", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.type}</div>}
                    {active.data.location_name && <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}><MapPin size={12} style={{ flexShrink:0, marginTop:1 }}/>{active.data.location_name}</div>}
                    {active.data.status && <div style={{ fontSize:12, color:"#9B8F7A", fontWeight:600 }}>Status: {active.data.status}</div>}
                    <Link href="/dashboard/pool" style={{ textDecoration:"none" }}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#FEF9C3", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> View in Collabs
                      </div>
                    </Link>
                  </>}

                  {/* ARTWORK */}
                  {active.kind === "artwork" && <>
                    {Array.isArray(active.data.images) && active.data.images[0] && (
                      <div style={{ border:"2px solid #111110", overflow:"hidden", aspectRatio:"4/3" }}>
                        <img src={active.data.images[0]} alt={active.data.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                      </div>
                    )}
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {(active.data.venue_location || active.data.location_name) && (
                      <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}>
                        <MapPin size={12} style={{ flexShrink:0, marginTop:1 }}/>{active.data.venue_location || active.data.location_name}
                      </div>
                    )}
                    {active.data.status && <div style={{ display:"inline-block", padding:"3px 10px", background:"#EDE9FE", border:"1.5px solid #8B5CF6", fontSize:9, fontWeight:900, color:"#6D28D9", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.status}</div>}
                    <Link href={`/dashboard/artworks/${active.data.id}`} style={{ textDecoration:"none" }}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#EDE9FE", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> View artwork
                      </div>
                    </Link>
                  </>}

                  {/* POOL */}
                  {active.kind === "pool" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {active.data.poster_type && <div style={{ display:"inline-block", padding:"3px 10px", background:"#FEF9C3", border:"1.5px solid #111110", fontSize:9, fontWeight:900, color:"#111110", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.poster_type} seeking</div>}
                    {(active.data.venue_city || active.data.location_name) && <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}><MapPin size={12} style={{ flexShrink:0, marginTop:1 }}/>{active.data.location_name || active.data.venue_city}</div>}
                    <Link href="/dashboard/pool" style={{ textDecoration:"none" }}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#FEF9C3", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> View in Pool
                      </div>
                    </Link>
                  </>}

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display:"flex", gap:16, paddingTop:10, flexWrap:"wrap", flexShrink:0, alignItems:"center" }}>
          <span style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:"0.1em" }}>Legend:</span>
          {[
            { shape:"circle",  color:"#FF6B6B", label:"Venue / Gallery"    },
            { shape:"circle",  color:"#4ECDC4", label:"Event / Show"       },
            { shape:"circle",  color:"#CA8A04", label:"Collaboration"      },
            { shape:"square",  color:"#8B5CF6", label:"Artwork on display" },
            { shape:"circle",  color:"#FFD400", label:"Pool request"       },
          ].map(item => (
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#5C5346" }}>
              <div style={{ width:10, height:10, background:item.color, border:"1.5px solid #111110", borderRadius: item.shape === "square" ? 2 : "50%", flexShrink:0 }}/>
              {item.label}
            </div>
          ))}
          <span style={{ marginLeft:"auto", fontSize:10, color:"#9B8F7A", fontWeight:600 }}>Click markers for details · Pins with real addresses are precise</span>
        </div>
      </div>
    </>
  );
}
