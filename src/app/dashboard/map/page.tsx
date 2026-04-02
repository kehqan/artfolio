"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  MapPin, X, ExternalLink, CalendarRange, Handshake,
  ImageIcon, Globe, Layers, ZoomIn, ZoomOut,
} from "lucide-react";

// ── Real Prague coordinates (lat/lng) ────────────────────────────
const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };

// Known Prague art venues with real GPS coordinates
const STATIC_VENUES = [
  { id: "sv1", name: "DOX Centre for Contemporary Art",       lat: 50.1031, lng: 14.4492, address: "Poupětova 1, Holešovice",         type: "gallery" },
  { id: "sv2", name: "Galerie Rudolfinum",                    lat: 50.0904, lng: 14.4152, address: "Alšovo nábřeží 12, Josefov",       type: "gallery" },
  { id: "sv3", name: "National Gallery – Veletržní Palác",   lat: 50.1010, lng: 14.4360, address: "Dukelských hrdinů 47, Holešovice", type: "museum"  },
  { id: "sv4", name: "Meet Factory",                          lat: 50.0698, lng: 14.3966, address: "Ke Sklárně 15, Smíchov",           type: "studio"  },
  { id: "sv5", name: "Futura Gallery",                        lat: 50.0719, lng: 14.4022, address: "Holečkova 49, Smíchov",            type: "gallery" },
  { id: "sv6", name: "Fotograf Gallery",                      lat: 50.0759, lng: 14.4408, address: "náměstí Míru 12, Vinohrady",       type: "gallery" },
  { id: "sv7", name: "Prague City Gallery – Old Town Hall",   lat: 50.0879, lng: 14.4208, address: "Staroměstské nám. 1, Old Town",    type: "gallery" },
  { id: "sv8", name: "Manifest Gallery",                      lat: 50.0762, lng: 14.4464, address: "Mánesova 79, Vinohrady",           type: "gallery" },
  { id: "sv9", name: "Kampá Museum",                          lat: 50.0861, lng: 14.4075, address: "U Sovových mlýnů 2, Malá Strana",  type: "museum"  },
  { id: "sv10", name: "Kunsthalle Praha",                     lat: 50.0906, lng: 14.4105, address: "Náměstí Jana Palacha, Josefov",    type: "gallery" },
];

// Scatter positions for DB items — spread around real Prague locations
const SCATTER_POSITIONS: [number, number][] = [
  [50.0878, 14.4208],[50.0831, 14.4421],[50.0769, 14.4369],[50.0921, 14.4332],
  [50.0694, 14.3987],[50.1008, 14.4501],[50.0755, 14.4500],[50.0845, 14.4115],
  [50.0735, 14.4275],[50.0950, 14.4210],[50.0799, 14.4560],[50.0863, 14.4055],
  [50.0715, 14.4425],[50.0882, 14.4290],[50.1025, 14.4380],
];

let scatterIdx = 0;
function nextLatLng(): { lat: number; lng: number } {
  const [lat, lng] = SCATTER_POSITIONS[scatterIdx % SCATTER_POSITIONS.length];
  scatterIdx++;
  return { lat, lng };
}

// ── Marker SVG icons (inline, no external dependency) ──────────
const PIN_ICONS = {
  venue:   { path: "M 0,-18 C -10,-18 -10,-4 0,4 C 10,-4 10,-18 0,-18 Z", color: "#FF6B6B", scale: 1   },
  event:   { path: "M 0,-18 L 11,-6 L 7,8 L -7,8 L -11,-6 Z",              color: "#4ECDC4", scale: 1   },
  collab:  { path: "M 0,-18 L 14,-7 L 14,7 L 0,18 L -14,7 L -14,-7 Z",    color: "#FFD400", scale: 0.9 },
  artwork: { path: "M -10,-14 L 10,-14 L 10,6 L -10,6 Z",                  color: "#8B5CF6", scale: 1   },
};

type Kind = "venue" | "event" | "collab" | "artwork";
type ActivePin = { kind: Kind; data: any } | null;
type MapItem = { id: string; lat: number; lng: number; name?: string; title?: string; kind: Kind; data: any };

const LAYER_CFG: Record<Kind, { color: string; bg: string; border: string; label: string; icon: any }> = {
  venue:   { color: "#FF6B6B", bg: "#FFE4E6", border: "#FF6B6B", label: "Venues",   icon: Globe        },
  event:   { color: "#4ECDC4", bg: "#F0FDF4", border: "#4ECDC4", label: "Events",   icon: CalendarRange },
  collab:  { color: "#CA8A04", bg: "#FEF9C3", border: "#CA8A04", label: "Collabs",  icon: Handshake    },
  artwork: { color: "#8B5CF6", bg: "#EDE9FE", border: "#8B5CF6", label: "Artworks", icon: ImageIcon    },
};

// ── Google Maps custom map style — neo-brutalist muted tones ─────
const MAP_STYLE = [
  { elementType: "geometry",        stylers: [{ color: "#F5F0E8" }] },
  { elementType: "labels.text.fill",stylers: [{ color: "#5C5346" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFBEA" }] },
  { featureType: "water",           elementType: "geometry", stylers: [{ color: "#A8C8E0" }] },
  { featureType: "water",           elementType: "labels.text.fill", stylers: [{ color: "#7AA8C4" }] },
  { featureType: "road",            elementType: "geometry", stylers: [{ color: "#E0D8CA" }] },
  { featureType: "road.arterial",   elementType: "geometry", stylers: [{ color: "#D4C9A8" }] },
  { featureType: "road.highway",    elementType: "geometry", stylers: [{ color: "#C8B89A" }] },
  { featureType: "road.highway",    elementType: "geometry.stroke", stylers: [{ color: "#B0A07A" }] },
  { featureType: "road",            elementType: "labels.text.fill", stylers: [{ color: "#9B8F7A" }] },
  { featureType: "poi",             elementType: "geometry", stylers: [{ color: "#E8E0CC" }] },
  { featureType: "poi.park",        elementType: "geometry", stylers: [{ color: "#D4E8C8" }] },
  { featureType: "poi",             elementType: "labels.text.fill", stylers: [{ color: "#9B8F7A" }] },
  { featureType: "transit",         elementType: "geometry", stylers: [{ color: "#E0D8CA" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#9B8F7A" }] },
  { featureType: "administrative",  elementType: "geometry.stroke", stylers: [{ color: "#C8B89A" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#9B8F7A" }] },
  { featureType: "landscape",       elementType: "geometry", stylers: [{ color: "#EAE4D0" }] },
];

declare global {
  interface Window {
    google: any;
    initArtfolioMap: () => void;
  }
}

export default function PragueMapPage() {
  const mapRef     = useRef<HTMLDivElement>(null);
  const mapObjRef  = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoRef    = useRef<any>(null);

  const [mapReady, setMapReady]     = useState(false);
  const [activePin, setActivePin]   = useState<ActivePin>(null);
  const [layers, setLayers]         = useState<Record<Kind, boolean>>({ venue: true, event: true, collab: true, artwork: true });
  const [search, setSearch]         = useState("");
  const [items, setItems]           = useState<MapItem[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── Load data from Supabase ──────────────────────────────────
  useEffect(() => {
    scatterIdx = 0;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const [{ data: ex }, { data: co }, { data: aw }] = await Promise.all([
        supabase.from("exhibitions").select("id,title,venue,start_date,status").eq("user_id", user.id),
        supabase.from("collaborations").select("id,title,type,status").eq("user_id", user.id),
        supabase.from("artworks").select("id,title,status,venue_location,images").eq("user_id", user.id).not("venue_location", "is", null),
      ]);

      const allItems: MapItem[] = [
        // Static Prague venues
        ...STATIC_VENUES.map(v => ({ id: v.id, lat: v.lat, lng: v.lng, title: v.name, kind: "venue" as Kind, data: v })),
        // DB exhibitions as events
        ...(ex || []).map(e => { const pos = nextLatLng(); return { id: e.id, ...pos, title: e.title, kind: "event" as Kind, data: e }; }),
        // Collaborations
        ...(co || []).map(c => { const pos = nextLatLng(); return { id: c.id, ...pos, title: c.title, kind: "collab" as Kind, data: c }; }),
        // Artworks on display
        ...(aw || []).map(a => { const pos = nextLatLng(); return { id: a.id, ...pos, title: a.title, kind: "artwork" as Kind, data: a }; }),
      ];

      setItems(allItems);
      setLoading(false);
    });
  }, []);

  // ── Load Google Maps script ───────────────────────────────────
  useEffect(() => {
    if (window.google?.maps) { setMapReady(true); return; }

    window.initArtfolioMap = () => setMapReady(true);

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set");
      return;
    }

    const existing = document.getElementById("gmaps-script");
    if (existing) return;

    const script = document.createElement("script");
    script.id  = "gmaps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initArtfolioMap&loading=async`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => { delete (window as any).initArtfolioMap; };
  }, []);

  // ── Init map once both script + data are ready ────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapObjRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center:           PRAGUE_CENTER,
      zoom:             13,
      styles:           MAP_STYLE,
      disableDefaultUI: true,
      zoomControl:      false,
      mapTypeControl:   false,
      streetViewControl:false,
      fullscreenControl:false,
    });
    mapObjRef.current = map;

    // Custom info window
    infoRef.current = new window.google.maps.InfoWindow({ content: "" });

    placeMarkers(map, items, layers, search);
  }, [mapReady, items]);

  // ── Re-draw markers when layers/search change ─────────────────
  useEffect(() => {
    if (!mapObjRef.current) return;
    placeMarkers(mapObjRef.current, items, layers, search);
  }, [layers, search, items]);

  function placeMarkers(map: any, allItems: MapItem[], activeLayers: Record<Kind, boolean>, q: string) {
    // Clear existing markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const query = q.toLowerCase();

    allItems.forEach(item => {
      if (!activeLayers[item.kind]) return;
      if (query && !item.title?.toLowerCase().includes(query)) return;

      const cfg = LAYER_CFG[item.kind];

      // Build SVG marker
      const svgSize   = 36;
      const svgMarker = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="-18 -22 36 36">
          <filter id="shadow">
            <feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.3)"/>
          </filter>
          ${item.kind === "venue"   ? `<path d="M0,-18 C-10,-18 -10,-4 0,4 C10,-4 10,-18 0,-18Z" fill="${cfg.color}" stroke="#111110" stroke-width="2" filter="url(#shadow)"/><circle cx="0" cy="-13" r="4" fill="white"/>` : ""}
          ${item.kind === "event"   ? `<path d="M0,-16 L12,-5 L7,8 L-7,8 L-12,-5Z" fill="${cfg.color}" stroke="#111110" stroke-width="2" filter="url(#shadow)"/><circle cx="0" cy="-3" r="3" fill="white"/>` : ""}
          ${item.kind === "collab"  ? `<path d="M0,-16 L13,-7 L13,7 L0,16 L-13,7 L-13,-7Z" fill="${cfg.color}" stroke="#111110" stroke-width="2" filter="url(#shadow)"/><text x="0" y="4" text-anchor="middle" font-size="9" font-weight="900" fill="#111110">C</text>` : ""}
          ${item.kind === "artwork" ? `<rect x="-11" y="-16" width="22" height="22" rx="2" fill="${cfg.color}" stroke="#111110" stroke-width="2" filter="url(#shadow)"/><rect x="-7" y="-12" width="14" height="14" rx="1" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.5"/>` : ""}
        </svg>`;

      const iconUrl = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svgMarker);

      const marker = new window.google.maps.Marker({
        position: { lat: item.lat, lng: item.lng },
        map,
        title:  item.title || "",
        icon: {
          url:        iconUrl,
          scaledSize: new window.google.maps.Size(svgSize, svgSize),
          anchor:     new window.google.maps.Point(svgSize / 2, svgSize),
        },
        animation: window.google.maps.Animation.DROP,
      });

      marker.addListener("click", () => {
        setActivePin({ kind: item.kind, data: item.data });
        map.panTo({ lat: item.lat, lng: item.lng });
      });

      markersRef.current.push(marker);
    });
  }

  const toggleLayer = (k: Kind) => setLayers(p => ({ ...p, [k]: !p[k] }));

  const visibleCount = items.filter(i => {
    const q = search.toLowerCase();
    return layers[i.kind] && (!q || i.title?.toLowerCase().includes(q));
  }).length;

  return (
    <>
      <style>{`
        .layer-btn { transition: all 0.1s; }
        .layer-btn:hover { opacity: 0.8; }
        .map-ctrl:hover { background: #FFFBEA !important; border-color: #FFD400 !important; }
        #artfolio-map * { box-sizing: border-box; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 116px)", gap: 0 }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 12, flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <MapPin size={22} color="#FF6B6B" strokeWidth={2.5} /> Prague Art Map
            </h1>
            <p style={{ fontSize: 13, color: "#9B8F7A", margin: "4px 0 0", fontWeight: 600 }}>
              {loading ? "Loading…" : `${visibleCount} locations visible · venues, events, collabs & artworks`}
            </p>
          </div>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "2px solid #111110", padding: "0 12px", background: "#fff", height: 38, minWidth: 240, boxShadow: "2px 2px 0 #111110" }}>
            <MapPin size={13} color="#9B8F7A" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search map…"
              style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", flex: 1, color: "#111110" }} />
            {search && <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", padding: 0 }}><X size={12} /></button>}
          </div>
        </div>

        {/* ── Layer filters ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap", flexShrink: 0 }}>
          {(Object.entries(LAYER_CFG) as [Kind, any][]).map(([key, cfg]) => {
            const count = items.filter(i => i.kind === key).length;
            const Icon  = cfg.icon;
            const on    = layers[key];
            return (
              <button key={key} className="layer-btn" onClick={() => toggleLayer(key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `2px solid ${on ? cfg.border : "#E0D8CA"}`, background: on ? cfg.bg : "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#111110" }}>
                <div style={{ width: 8, height: 8, borderRadius: key === "artwork" ? 2 : "50%", background: on ? cfg.color : "#d4cfc4", border: "1.5px solid rgba(0,0,0,0.1)" }} />
                <Icon size={11} color={on ? cfg.color : "#d4cfc4"} />
                {cfg.label} <span style={{ color: on ? cfg.color : "#d4cfc4", fontWeight: 900 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* ── Map + Sidebar ── */}
        <div style={{ flex: 1, display: "flex", gap: 0, minHeight: 0, border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", overflow: "hidden" }}>

          {/* Map area */}
          <div style={{ flex: 1, position: "relative" }}>
            {/* No API key warning */}
            {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F0E8", zIndex: 10, flexDirection: "column", gap: 12 }}>
                <MapPin size={40} color="#FF6B6B" />
                <div style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>Google Maps API key missing</div>
                <div style={{ fontSize: 12, color: "#9B8F7A", textAlign: "center", maxWidth: 300 }}>Add <code style={{ background: "#F5F0E8", padding: "2px 6px", border: "1px solid #E0D8CA" }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your Vercel environment variables</div>
              </div>
            )}

            {/* Google Map div */}
            <div id="artfolio-map" ref={mapRef} style={{ width: "100%", height: "100%" }} />

            {/* Custom zoom controls */}
            <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10, display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { label: "+", action: () => mapObjRef.current?.setZoom((mapObjRef.current.getZoom() || 13) + 1) },
                { label: "−", action: () => mapObjRef.current?.setZoom((mapObjRef.current.getZoom() || 13) - 1) },
                { label: "⌖", action: () => { mapObjRef.current?.setCenter(PRAGUE_CENTER); mapObjRef.current?.setZoom(13); } },
              ].map(btn => (
                <button key={btn.label} className="map-ctrl" onClick={btn.action}
                  style={{ width: 34, height: 34, background: "#fff", border: "2px solid #111110", fontSize: 16, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110", color: "#111110", transition: "all 0.1s" }}>
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Loading overlay */}
            {!mapReady && (
              <div style={{ position: "absolute", inset: 0, background: "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 40, height: 40, border: "3px solid #E0D8CA", borderTop: "3px solid #FFD400", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Loading map…</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar: Active pin detail ── */}
          <div style={{ width: activePin ? 300 : 0, flexShrink: 0, borderLeft: activePin ? "2px solid #111110" : "none", background: "#fff", overflow: "hidden", transition: "width 0.2s ease" }}>
            {activePin && (
              <div style={{ width: 300, height: "100%", overflowY: "auto" }}>
                {/* Header */}
                <div style={{ padding: "14px 16px", borderBottom: "2px solid #111110", background: LAYER_CFG[activePin.kind].bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: LAYER_CFG[activePin.kind].color, border: "1.5px solid #111110" }} />
                    <span style={{ fontSize: 9, fontWeight: 900, color: "#111110", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                      {LAYER_CFG[activePin.kind].label.slice(0, -1)}
                    </span>
                  </div>
                  <button onClick={() => setActivePin(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ padding: "18px 16px" }}>
                  {/* VENUE */}
                  {activePin.kind === "venue" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", letterSpacing: "-0.3px", margin: 0 }}>{activePin.data.name}</h2>
                      {activePin.data.address && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>
                          <MapPin size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                          {activePin.data.address}
                        </div>
                      )}
                      {activePin.data.type && (
                        <div style={{ display: "inline-block", padding: "3px 10px", background: "#FFE4E6", border: "1.5px solid #FF6B6B", fontSize: 9, fontWeight: 900, color: "#FF6B6B", textTransform: "uppercase", letterSpacing: "0.12em", width: "fit-content" }}>
                          {activePin.data.type}
                        </div>
                      )}
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(activePin.data.address || activePin.data.name)}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "2px solid #111110", background: "#fff", fontSize: 11, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                          <ExternalLink size={11} /> Open in Google Maps
                        </div>
                      </a>
                    </div>
                  )}

                  {/* EVENT */}
                  {activePin.kind === "event" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", letterSpacing: "-0.3px", margin: 0 }}>{activePin.data.title}</h2>
                      {activePin.data.venue && (
                        <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>@ {activePin.data.venue}</div>
                      )}
                      {activePin.data.start_date && (
                        <div style={{ padding: "6px 10px", background: "#F0FDF4", border: "1.5px solid #4ECDC4", fontSize: 11, fontWeight: 700, color: "#0F6E56" }}>
                          Opens {new Date(activePin.data.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                      {activePin.data.status && (
                        <div style={{ display: "inline-block", padding: "3px 10px", background: "#F0FDF4", border: "1.5px solid #4ECDC4", fontSize: 9, fontWeight: 900, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.12em", width: "fit-content" }}>
                          {activePin.data.status}
                        </div>
                      )}
                      <Link href={`/dashboard/exhibitions/${activePin.data.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "2px solid #111110", background: "#F0FDF4", fontSize: 11, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                          <ExternalLink size={11} /> View event details
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* COLLAB */}
                  {activePin.kind === "collab" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", letterSpacing: "-0.3px", margin: 0 }}>{activePin.data.title}</h2>
                      {activePin.data.type && (
                        <div style={{ display: "inline-block", padding: "3px 10px", background: "#FEF9C3", border: "1.5px solid #CA8A04", fontSize: 9, fontWeight: 900, color: "#854D0E", textTransform: "uppercase", letterSpacing: "0.12em", width: "fit-content" }}>
                          {activePin.data.type}
                        </div>
                      )}
                      {activePin.data.status && (
                        <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>Status: {activePin.data.status}</div>
                      )}
                      <Link href="/dashboard/pool" style={{ textDecoration: "none" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "2px solid #111110", background: "#FEF9C3", fontSize: 11, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                          <ExternalLink size={11} /> View in Collabs
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* ARTWORK */}
                  {activePin.kind === "artwork" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {Array.isArray(activePin.data.images) && activePin.data.images[0] && (
                        <div style={{ border: "2px solid #111110", overflow: "hidden", aspectRatio: "4/3" }}>
                          <img src={activePin.data.images[0]} alt={activePin.data.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                      )}
                      <h2 style={{ fontSize: 16, fontWeight: 900, color: "#111110", letterSpacing: "-0.3px", margin: 0 }}>{activePin.data.title}</h2>
                      {activePin.data.venue_location && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>
                          <MapPin size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                          {activePin.data.venue_location}
                        </div>
                      )}
                      {activePin.data.status && (
                        <div style={{ display: "inline-block", padding: "3px 10px", background: "#EDE9FE", border: "1.5px solid #8B5CF6", fontSize: 9, fontWeight: 900, color: "#6D28D9", textTransform: "uppercase", letterSpacing: "0.12em", width: "fit-content" }}>
                          {activePin.data.status}
                        </div>
                      )}
                      <Link href={`/dashboard/artworks/${activePin.data.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "2px solid #111110", background: "#EDE9FE", fontSize: 11, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                          <ExternalLink size={11} /> View artwork
                        </div>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", gap: 16, paddingTop: 10, flexWrap: "wrap", flexShrink: 0, alignItems: "center" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em" }}>Legend:</span>
          {[
            { shape: "circle",  color: "#FF6B6B", label: "Venue / Gallery" },
            { shape: "diamond", color: "#4ECDC4", label: "Event / Show"    },
            { shape: "hex",     color: "#FFD400", label: "Collaboration"   },
            { shape: "square",  color: "#8B5CF6", label: "Artwork on display" },
          ].map(item => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#5C5346" }}>
              <div style={{ width: 10, height: 10, background: item.color, border: "1.5px solid #111110", borderRadius: item.shape === "circle" ? "50%" : item.shape === "square" ? 2 : 0, transform: item.shape === "diamond" ? "rotate(45deg)" : "none", flexShrink: 0 }} />
              {item.label}
            </div>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>Click markers for details</span>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
