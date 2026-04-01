"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import {
  MapPin, X, ExternalLink, CalendarRange, Handshake,
  ImageIcon, Globe, AlertTriangle,
} from "lucide-react";

// ── Prague centre ────────────────────────────────────────────────
const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };

// Real-coordinate Prague art venues
const STATIC_VENUES: MapVenue[] = [
  { id: "sv1", name: "DOX Centre for Contemporary Art",      city: "Prague", address: "Poupětova 1, Holešovice",            type: "gallery", lat: 50.1053, lng: 14.4496 },
  { id: "sv2", name: "Galerie Rudolfinum",                   city: "Prague", address: "Alšovo nábřeží, Josefov",            type: "gallery", lat: 50.0908, lng: 14.4144 },
  { id: "sv3", name: "National Gallery – Veletržní Palác",  city: "Prague", address: "Dukelských hrdinů 47, Holešovice",   type: "museum",  lat: 50.1063, lng: 14.4441 },
  { id: "sv4", name: "Meet Factory",                         city: "Prague", address: "Ke Sklárně 15, Smíchov",             type: "studio",  lat: 50.0573, lng: 14.4016 },
  { id: "sv5", name: "Futura Gallery",                       city: "Prague", address: "Holečkova 49, Smíchov",              type: "gallery", lat: 50.0625, lng: 14.3985 },
  { id: "sv6", name: "Fotograf Gallery",                     city: "Prague", address: "náměstí Míru 12, Vinohrady",         type: "gallery", lat: 50.0767, lng: 14.4352 },
  { id: "sv7", name: "Prague City Gallery",                  city: "Prague", address: "Staroměstské nám., Old Town",        type: "gallery", lat: 50.0870, lng: 14.4213 },
  { id: "sv8", name: "Manifest Gallery",                     city: "Prague", address: "Mánesova 79, Vinohrady",             type: "gallery", lat: 50.0798, lng: 14.4435 },
];

// Scatter coords for DB items without real lat/lng
const SCATTER: [number, number][] = [
  [50.082, 14.445], [50.068, 14.432], [50.079, 14.455],
  [50.071, 14.420], [50.085, 14.410], [50.091, 14.462],
  [50.063, 14.442], [50.074, 14.426], [50.088, 14.398],
  [50.077, 14.470], [50.066, 14.456], [50.094, 14.418],
  [50.083, 14.434], [50.070, 14.449], [50.059, 14.428],
];
let scatterIdx = 0;
function nextLatLng(): { lat: number; lng: number } {
  const [lat, lng] = SCATTER[scatterIdx % SCATTER.length];
  scatterIdx++;
  return { lat, lng };
}

// ── Types ────────────────────────────────────────────────────────
type MapVenue  = { id: string; name: string; city: string; address?: string; type?: string; lat: number; lng: number };
type MapEvent  = { id: string; title: string; venue?: string; date?: string; lat: number; lng: number };
type MapCollab = { id: string; title: string; type: string; lat: number; lng: number };
type MapArtwork = { id: string; title: string; venue_location?: string; images?: string[]; lat: number; lng: number };

type ActivePin =
  | { kind: "venue";   data: MapVenue   }
  | { kind: "event";   data: MapEvent   }
  | { kind: "collab";  data: MapCollab  }
  | { kind: "artwork"; data: MapArtwork }
  | null;

const LAYER_COLORS = {
  venue:   { pin: "#FF6B6B", glyph: "#fff", bg: "#FFE4E6", border: "#FF6B6B", label: "Venues" },
  event:   { pin: "#4ECDC4", glyph: "#fff", bg: "#F0FDF4", border: "#4ECDC4", label: "Events" },
  collab:  { pin: "#FFD400", glyph: "#111", bg: "#FEF9C3", border: "#CA8A04", label: "Collabs" },
  artwork: { pin: "#8B5CF6", glyph: "#fff", bg: "#EDE9FE", border: "#8B5CF6", label: "Artworks" },
};

const LAYER_ICONS: Record<string, any> = {
  venue: Globe, event: CalendarRange, collab: Handshake, artwork: ImageIcon,
};

// ── Map style — warm parchment tone to match Artfolio brand ──────
const MAP_STYLE = [
  { featureType: "all",        elementType: "geometry.fill",   stylers: [{ color: "#f5f0e8" }] },
  { featureType: "water",      elementType: "geometry",        stylers: [{ color: "#b8d4ec" }] },
  { featureType: "road",       elementType: "geometry",        stylers: [{ color: "#e8e0cc" }] },
  { featureType: "road.arterial", elementType: "geometry",     stylers: [{ color: "#d8ceb8" }] },
  { featureType: "road.highway",  elementType: "geometry",     stylers: [{ color: "#ccc0a0" }] },
  { featureType: "poi.park",   elementType: "geometry",        stylers: [{ color: "#dde8cc" }] },
  { featureType: "poi",        elementType: "labels.icon",     stylers: [{ visibility: "off" }] },
  { featureType: "transit",    elementType: "geometry",        stylers: [{ color: "#e0d8c4" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c8b89a" }] },
  { featureType: "landscape",  elementType: "geometry",        stylers: [{ color: "#ede8dc" }] },
  { featureType: "all",        elementType: "labels.text.fill", stylers: [{ color: "#6b5e3e" }] },
  { featureType: "all",        elementType: "labels.text.stroke", stylers: [{ color: "#f5f0e8" }, { weight: 2 }] },
];

// ── Main Component ───────────────────────────────────────────────
export default function PragueMapPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const [venues,   setVenues]   = useState<MapVenue[]>(STATIC_VENUES);
  const [events,   setEvents]   = useState<MapEvent[]>([]);
  const [collabs,  setCollabs]  = useState<MapCollab[]>([]);
  const [artworks, setArtworks] = useState<MapArtwork[]>([]);
  const [activePin, setActivePin] = useState<ActivePin>(null);
  const [layers, setLayers] = useState({ venue: true, event: true, collab: true, artwork: true });
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState("");

  // Fetch DB data
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

      const exEvents: MapEvent[] = (ex || []).map(e => {
        const pos = nextLatLng();
        return { id: e.id, title: e.title, venue: e.venue, date: e.start_date, ...pos };
      });
      setEvents(exEvents);

      const coItems: MapCollab[] = (co || []).map(c => {
        const pos = nextLatLng();
        return { id: c.id, title: c.title, type: c.type, ...pos };
      });
      setCollabs(coItems);

      const awItems: MapArtwork[] = (aw || []).map(a => {
        const pos = nextLatLng();
        return { id: a.id, title: a.title, venue_location: a.venue_location, images: a.images, ...pos };
      });
      setArtworks(awItems);

      // Merge DB venues with statics
      if (vn && vn.length > 0) {
        const dbVenues: MapVenue[] = vn
          .filter((v: any) => v.city?.toLowerCase().includes("prague") || !v.city)
          .map((v: any) => {
            const known = STATIC_VENUES.find(s =>
              s.name.toLowerCase().includes((v.name || "").toLowerCase().slice(0, 8))
            );
            const pos = known
              ? { lat: known.lat + 0.0003, lng: known.lng + 0.0003 }
              : nextLatLng();
            return { id: `db_${v.id}`, name: v.name, city: v.city || "Prague", address: v.address, type: v.type, ...pos };
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

  const toggleLayer = (k: keyof typeof layers) => setLayers(p => ({ ...p, [k]: !p[k] }));

  // Filter by search
  const q = search.toLowerCase();
  const filteredVenues   = venues.filter(v  => !q || v.name.toLowerCase().includes(q)  || (v.address || "").toLowerCase().includes(q));
  const filteredEvents   = events.filter(e  => !q || e.title.toLowerCase().includes(q));
  const filteredCollabs  = collabs.filter(c  => !q || c.title.toLowerCase().includes(q));
  const filteredArtworks = artworks.filter(a => !q || a.title.toLowerCase().includes(q) || (a.venue_location || "").toLowerCase().includes(q));

  const totalPins = filteredVenues.length + filteredEvents.length + filteredCollabs.length + filteredArtworks.length;

  // Active marker position for InfoWindow anchor
  function getActivePos(): { lat: number; lng: number } | null {
    if (!activePin) return null;
    return { lat: activePin.data.lat, lng: activePin.data.lng };
  }

  // ── No API Key banner ────────────────────────────────────────
  if (!apiKey) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 116px)", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexShrink: 0 }}>
          <MapPin size={22} color="#FF6B6B" />
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: 0 }}>Prague Art Map</h1>
        </div>
        <div style={{ flex: 1, border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F0E8", gap: 16 }}>
          <AlertTriangle size={40} color="#FFD400" strokeWidth={2.5} />
          <div style={{ fontSize: 18, fontWeight: 900, color: "#111110" }}>Google Maps API key not configured</div>
          <div style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600, textAlign: "center", maxWidth: 420 }}>
            Add <code style={{ background: "#fff", border: "1.5px solid #E0D8CA", padding: "1px 6px", fontFamily: "monospace", fontSize: 12 }}>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables and redeploy.
          </div>
        </div>
      </div>
    );
  }

  // ── Full Map UI ──────────────────────────────────────────────
  return (
    <APIProvider apiKey={apiKey}>
      <style>{`
        .layer-btn:hover { opacity: 0.85; }
        .gm-style-iw, .gm-style-iw-c { display: none !important; }
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
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search map…"
              style={{ border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", flex: 1, color: "#111110" }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A" }}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* ── Layer filters ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", flexShrink: 0 }}>
          {(Object.entries(LAYER_COLORS) as [keyof typeof LAYER_COLORS, any][]).map(([key, cfg]) => {
            const counts: Record<string, number> = {
              venue: filteredVenues.length, event: filteredEvents.length,
              collab: filteredCollabs.length, artwork: filteredArtworks.length,
            };
            const Icon = LAYER_ICONS[key];
            const active = layers[key];
            return (
              <button key={key} className="layer-btn" onClick={() => toggleLayer(key)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: `2px solid ${active ? cfg.border : "#E0D8CA"}`, background: active ? cfg.bg : "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#111110", transition: "all 0.1s" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: active ? cfg.pin : "#d4cfc4", border: "1.5px solid rgba(0,0,0,0.15)" }} />
                <Icon size={11} color={active ? cfg.pin : "#d4cfc4"} />
                {cfg.label} <span style={{ color: active ? cfg.pin : "#d4cfc4", fontWeight: 900 }}>({counts[key]})</span>
              </button>
            );
          })}
        </div>

        {/* ── Map container ── */}
        <div style={{ flex: 1, position: "relative", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", overflow: "hidden", minHeight: 0 }}>
          <Map
            defaultCenter={PRAGUE_CENTER}
            defaultZoom={13}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            zoomControl={true}
            styles={MAP_STYLE}
            style={{ width: "100%", height: "100%" }}
            onClick={() => setActivePin(null)}
          >

            {/* ── Venue markers ── */}
            {layers.venue && filteredVenues.map(v => (
              <AdvancedMarker
                key={v.id}
                position={{ lat: v.lat, lng: v.lng }}
                title={v.name}
                onClick={() => setActivePin(ap => ap?.data.id === v.id ? null : { kind: "venue", data: v })}
              >
                <Pin
                  background={LAYER_COLORS.venue.pin}
                  borderColor="#111110"
                  glyphColor={LAYER_COLORS.venue.glyph}
                  scale={activePin?.data.id === v.id ? 1.4 : 1.0}
                />
              </AdvancedMarker>
            ))}

            {/* ── Event markers ── */}
            {layers.event && filteredEvents.map(ev => (
              <AdvancedMarker
                key={ev.id}
                position={{ lat: ev.lat, lng: ev.lng }}
                title={ev.title}
                onClick={() => setActivePin(ap => ap?.data.id === ev.id ? null : { kind: "event", data: ev })}
              >
                <Pin
                  background={LAYER_COLORS.event.pin}
                  borderColor="#111110"
                  glyphColor={LAYER_COLORS.event.glyph}
                  scale={activePin?.data.id === ev.id ? 1.4 : 1.0}
                />
              </AdvancedMarker>
            ))}

            {/* ── Collab markers ── */}
            {layers.collab && filteredCollabs.map(co => (
              <AdvancedMarker
                key={co.id}
                position={{ lat: co.lat, lng: co.lng }}
                title={co.title}
                onClick={() => setActivePin(ap => ap?.data.id === co.id ? null : { kind: "collab", data: co })}
              >
                <Pin
                  background={LAYER_COLORS.collab.pin}
                  borderColor="#111110"
                  glyphColor={LAYER_COLORS.collab.glyph}
                  scale={activePin?.data.id === co.id ? 1.4 : 1.0}
                />
              </AdvancedMarker>
            ))}

            {/* ── Artwork markers ── */}
            {layers.artwork && filteredArtworks.map(aw => (
              <AdvancedMarker
                key={aw.id}
                position={{ lat: aw.lat, lng: aw.lng }}
                title={aw.title}
                onClick={() => setActivePin(ap => ap?.data.id === aw.id ? null : { kind: "artwork", data: aw })}
              >
                <Pin
                  background={LAYER_COLORS.artwork.pin}
                  borderColor="#111110"
                  glyphColor={LAYER_COLORS.artwork.glyph}
                  scale={activePin?.data.id === aw.id ? 1.4 : 1.0}
                />
              </AdvancedMarker>
            ))}

            {/* ── InfoWindow popup ── */}
            {activePin && getActivePos() && (
              <InfoWindow
                position={getActivePos()!}
                pixelOffset={[0, -44]}
                onCloseClick={() => setActivePin(null)}
                headerDisabled
              >
                <div style={{ padding: "14px 16px", minWidth: 260, maxWidth: 340, fontFamily: "inherit" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: LAYER_COLORS[activePin.kind].pin, border: "1.5px solid #111110" }} />
                      <span style={{ fontSize: 9, fontWeight: 900, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                        {LAYER_COLORS[activePin.kind].label.slice(0, -1)}
                      </span>
                    </div>
                    <button onClick={() => setActivePin(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", padding: 0 }}>
                      <X size={14} />
                    </button>
                  </div>

                  {/* Venue */}
                  {activePin.kind === "venue" && (
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{activePin.data.name}</div>
                      {activePin.data.address && (
                        <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                          <MapPin size={11} /> {activePin.data.address}
                        </div>
                      )}
                      {activePin.data.type && (
                        <div style={{ display: "inline-block", padding: "2px 8px", background: "#FFE4E6", border: "1.5px solid #FF6B6B", fontSize: 9, fontWeight: 800, color: "#FF6B6B", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          {activePin.data.type}
                        </div>
                      )}
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent((activePin.data.address || activePin.data.name) + ", Prague")}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, marginLeft: 6, padding: "4px 10px", border: "1.5px solid #111110", background: "#fff", fontSize: 10, fontWeight: 700, color: "#111110", textDecoration: "none" }}>
                        <ExternalLink size={10} /> Open in Maps
                      </a>
                    </div>
                  )}

                  {/* Event */}
                  {activePin.kind === "event" && (
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{activePin.data.title}</div>
                      {activePin.data.venue && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>@ {activePin.data.venue}</div>}
                      {activePin.data.date && (
                        <div style={{ fontSize: 11, color: "#4ECDC4", fontWeight: 700, marginTop: 4 }}>
                          Opens {new Date(activePin.data.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                      <Link href={`/dashboard/exhibitions/${activePin.data.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 10px", border: "1.5px solid #111110", background: "#F0FDF4", fontSize: 10, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                          <ExternalLink size={10} /> View event
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* Collab */}
                  {activePin.kind === "collab" && (
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{activePin.data.title}</div>
                      {activePin.data.type && (
                        <div style={{ display: "inline-block", padding: "2px 8px", background: "#FEF9C3", border: "1.5px solid #CA8A04", fontSize: 9, fontWeight: 800, color: "#854D0E", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                          {activePin.data.type}
                        </div>
                      )}
                      <Link href="/dashboard/pool" style={{ textDecoration: "none" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 10px", border: "1.5px solid #111110", background: "#FEF9C3", fontSize: 10, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                          <ExternalLink size={10} /> View collab
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* Artwork */}
                  {activePin.kind === "artwork" && (
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      {Array.isArray(activePin.data.images) && activePin.data.images[0] && (
                        <div style={{ width: 60, height: 60, border: "2px solid #111110", overflow: "hidden", flexShrink: 0 }}>
                          <img src={activePin.data.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 2 }}>{activePin.data.title}</div>
                        {activePin.data.venue_location && (
                          <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <MapPin size={10} /> {activePin.data.venue_location}
                          </div>
                        )}
                        <Link href={`/dashboard/artworks/${activePin.data.id}`} style={{ textDecoration: "none" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, padding: "4px 10px", border: "1.5px solid #111110", background: "#EDE9FE", fontSize: 10, fontWeight: 700, color: "#111110", cursor: "pointer" }}>
                            <ExternalLink size={10} /> View artwork
                          </div>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>

        {/* ── Legend ── */}
        <div style={{ display: "flex", gap: 16, paddingTop: 12, flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", alignSelf: "center" }}>Legend:</div>
          {(Object.entries(LAYER_COLORS) as [keyof typeof LAYER_COLORS, any][]).map(([key, cfg]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#5C5346" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.pin, border: "1.5px solid #111110", flexShrink: 0 }} />
              {cfg.label}
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>
            Scroll to zoom · drag to pan · click pins for details
          </div>
        </div>

      </div>
    </APIProvider>
  );
}
