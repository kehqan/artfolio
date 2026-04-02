"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { MapPin, X, ExternalLink, CalendarRange, Handshake, ImageIcon, Globe, Users } from "lucide-react";

const PRAGUE_CENTER = { lat: 50.0755, lng: 14.4378 };

// Known Prague art venues (shown even if DB is empty)
const STATIC_VENUES = [
  { id:"sv1",  name:"DOX Centre for Contemporary Art",     lat:50.1031, lng:14.4492, address:"Poupětova 1, Holešovice",         type:"gallery" },
  { id:"sv2",  name:"Galerie Rudolfinum",                  lat:50.0904, lng:14.4152, address:"Alšovo nábřeží 12, Josefov",       type:"gallery" },
  { id:"sv3",  name:"National Gallery – Veletržní Palác",  lat:50.1010, lng:14.4360, address:"Dukelských hrdinů 47, Holešovice", type:"museum"  },
  { id:"sv4",  name:"Meet Factory",                        lat:50.0698, lng:14.3966, address:"Ke Sklárně 15, Smíchov",           type:"studio"  },
  { id:"sv5",  name:"Futura Gallery",                      lat:50.0719, lng:14.4022, address:"Holečkova 49, Smíchov",            type:"gallery" },
  { id:"sv6",  name:"Fotograf Gallery",                    lat:50.0759, lng:14.4408, address:"náměstí Míru 12, Vinohrady",       type:"gallery" },
  { id:"sv7",  name:"Prague City Gallery",                 lat:50.0879, lng:14.4208, address:"Staroměstské nám. 1, Old Town",    type:"gallery" },
  { id:"sv8",  name:"Kampá Museum",                        lat:50.0861, lng:14.4075, address:"U Sovových mlýnů 2, Malá Strana",  type:"museum"  },
  { id:"sv9",  name:"Kunsthalle Praha",                    lat:50.0906, lng:14.4105, address:"náměstí Jana Palacha, Josefov",    type:"gallery" },
  { id:"sv10", name:"Manifest Gallery",                    lat:50.0762, lng:14.4464, address:"Mánesova 79, Vinohrady",           type:"gallery" },
];

// Fallback scatter (for items with no coords yet)
const SCATTER: [number,number][] = [
  [50.0878,14.4208],[50.0831,14.4421],[50.0769,14.4369],[50.0921,14.4332],
  [50.0694,14.3987],[50.1008,14.4501],[50.0755,14.4500],[50.0845,14.4115],
  [50.0735,14.4275],[50.0950,14.4210],[50.0799,14.4560],[50.0863,14.4055],
  [50.0715,14.4425],[50.0882,14.4290],[50.1025,14.4380],
];
let si = 0;
const nextPos = () => { const p = SCATTER[si++ % SCATTER.length]; return { lat: p[0], lng: p[1] }; };

type Kind = "venue"|"event"|"collab"|"artwork"|"pool";
type MapItem = { id:string; lat:number; lng:number; title:string; kind:Kind; data:any };
type ActivePin = { kind:Kind; data:any } | null;

const CFG: Record<Kind,{ color:string; bg:string; border:string; label:string; icon:any }> = {
  venue:   { color:"#FF6B6B", bg:"#FFE4E6", border:"#FF6B6B", label:"Venues",   icon:Globe        },
  event:   { color:"#4ECDC4", bg:"#F0FDF4", border:"#4ECDC4", label:"Events",   icon:CalendarRange },
  collab:  { color:"#CA8A04", bg:"#FEF9C3", border:"#CA8A04", label:"Collabs",  icon:Handshake    },
  artwork: { color:"#8B5CF6", bg:"#EDE9FE", border:"#8B5CF6", label:"Artworks", icon:ImageIcon    },
  pool:    { color:"#FFD400", bg:"#FEF9C3", border:"#CA8A04", label:"Pool",     icon:Users        },
};

const MAP_STYLE = [
  { elementType:"geometry",         stylers:[{color:"#F5F0E8"}] },
  { elementType:"labels.text.fill", stylers:[{color:"#5C5346"}] },
  { elementType:"labels.text.stroke",stylers:[{color:"#FFFBEA"}] },
  { featureType:"water", elementType:"geometry", stylers:[{color:"#A8C8E0"}] },
  { featureType:"road",  elementType:"geometry", stylers:[{color:"#E0D8CA"}] },
  { featureType:"road.arterial", elementType:"geometry", stylers:[{color:"#D4C9A8"}] },
  { featureType:"road.highway",  elementType:"geometry", stylers:[{color:"#C8B89A"}] },
  { featureType:"poi",           elementType:"geometry", stylers:[{color:"#E8E0CC"}] },
  { featureType:"poi.park",      elementType:"geometry", stylers:[{color:"#D4E8C8"}] },
  { featureType:"landscape",     elementType:"geometry", stylers:[{color:"#EAE4D0"}] },
  { featureType:"transit",       elementType:"geometry", stylers:[{color:"#E0D8CA"}] },
];

declare global { interface Window { google:any; initArtfolioMap:()=>void; } }

function markerSvg(kind: Kind): string {
  const c = CFG[kind].color;
  const body: Record<Kind,string> = {
    venue:   `<path d="M0,-18 C-10,-18 -10,-3 0,5 C10,-3 10,-18 0,-18Z" fill="${c}" stroke="#111" stroke-width="2"/><circle cx="0" cy="-12" r="4.5" fill="white"/>`,
    event:   `<path d="M0,-17 L11,-5 L7,8 L-7,8 L-11,-5Z" fill="${c}" stroke="#111" stroke-width="2"/><circle cx="0" cy="-3" r="3.5" fill="white"/>`,
    collab:  `<path d="M0,-16 L13,-7 L13,7 L0,16 L-13,7 L-13,-7Z" fill="${c}" stroke="#111" stroke-width="2"/><text x="0" y="5" text-anchor="middle" font-size="10" font-weight="900" fill="#111" font-family="sans-serif">C</text>`,
    artwork: `<rect x="-11" y="-17" width="22" height="22" rx="2" fill="${c}" stroke="#111" stroke-width="2"/><rect x="-7" y="-13" width="14" height="14" rx="1" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.5"/>`,
    pool:    `<path d="M0,-16 L13,-7 L13,7 L0,16 L-13,7 L-13,-7Z" fill="${c}" stroke="#111" stroke-width="2"/><text x="0" y="5" text-anchor="middle" font-size="10" font-weight="900" fill="#111" font-family="sans-serif">P</text>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="-18 -22 36 38"><filter id="s"><feDropShadow dx="1" dy="2" stdDeviation="1.5" flood-color="rgba(0,0,0,0.25)"/></filter><g filter="url(#s)">${body[kind]}</g></svg>`;
}

export default function PragueMapPage() {
  const mapRef    = useRef<HTMLDivElement>(null);
  const mapObj    = useRef<any>(null);
  const markers   = useRef<any[]>([]);

  const [ready, setReady]         = useState(false);
  const [items, setItems]         = useState<MapItem[]>([]);
  const [active, setActive]       = useState<ActivePin>(null);
  const [layers, setLayers]       = useState<Record<Kind,boolean>>({ venue:true, event:true, collab:true, artwork:true, pool:true });
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [hasKey, setHasKey]       = useState(true);

  // ── Load data ──────────────────────────────────────────────────
  useEffect(() => {
    si = 0;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }

      const [{ data:ex }, { data:co }, { data:aw }, { data:vn }, { data:pr }] = await Promise.all([
        supabase.from("exhibitions").select("id,title,venue,start_date,status,location_name,lat,lng").eq("user_id", user.id),
        supabase.from("collaborations").select("id,title,type,status,location_name,lat,lng").eq("user_id", user.id),
        supabase.from("artworks").select("id,title,status,venue_location,location_name,location_lat,location_lng,images").eq("user_id", user.id),
        supabase.from("venues").select("id,name,city,address,type,lat,lng"),
        supabase.from("pool_requests").select("id,title,poster_type,venue_city,location_name,lat,lng,status").eq("user_id", user.id),
      ]);

      const all: MapItem[] = [
        // Static venues
        ...STATIC_VENUES.map(v => ({ id:v.id, lat:v.lat, lng:v.lng, title:v.name, kind:"venue" as Kind, data:v })),
        // DB venues (with real coords)
        ...(vn||[]).filter((v:any)=>v.lat&&v.lng).map((v:any)=>({ id:`dbv_${v.id}`, lat:v.lat, lng:v.lng, title:v.name, kind:"venue" as Kind, data:v })),
        // Exhibitions → events
        ...(ex||[]).map((e:any) => {
          const pos = (e.lat&&e.lng) ? {lat:e.lat,lng:e.lng} : nextPos();
          return { id:e.id, ...pos, title:e.title, kind:"event" as Kind, data:e };
        }),
        // Collabs
        ...(co||[]).map((c:any) => {
          const pos = (c.lat&&c.lng) ? {lat:c.lat,lng:c.lng} : nextPos();
          return { id:c.id, ...pos, title:c.title, kind:"collab" as Kind, data:c };
        }),
        // Artworks on display
        ...(aw||[]).filter((a:any)=>a.venue_location||a.location_name).map((a:any) => {
          const pos = (a.location_lat&&a.location_lng) ? {lat:a.location_lat,lng:a.location_lng} : nextPos();
          return { id:a.id, ...pos, title:a.title, kind:"artwork" as Kind, data:a };
        }),
        // Pool requests
        ...(pr||[]).map((p:any) => {
          const pos = (p.lat&&p.lng) ? {lat:p.lat,lng:p.lng} : nextPos();
          return { id:p.id, ...pos, title:p.title, kind:"pool" as Kind, data:p };
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
      disableDefaultUI:true, zoomControl:false, mapTypeControl:false, streetViewControl:false, fullscreenControl:false,
    });
    buildMarkers();
  }, [ready, items]);

  // ── Re-draw on filter/search change ──────────────────────────
  useEffect(() => { if (mapObj.current) buildMarkers(); }, [layers, search, items]);

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
        position: { lat:item.lat, lng:item.lng },
        map: mapObj.current,
        title: item.title,
        icon:  { url, scaledSize:new window.google.maps.Size(36,36), anchor:new window.google.maps.Point(18,36) },
        animation: window.google.maps.Animation.DROP,
      });
      marker.addListener("click", () => {
        setActive({ kind:item.kind, data:item.data });
        mapObj.current.panTo({ lat:item.lat, lng:item.lng });
      });
      markers.current.push(marker);
    });
  }

  const visible = items.filter(i => {
    const q = search.toLowerCase();
    return layers[i.kind] && (!q || i.title.toLowerCase().includes(q));
  }).length;

  const toggleLayer = (k: Kind) => setLayers(p => ({ ...p, [k]: !p[k] }));

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 116px)", gap:0 }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, flexWrap:"wrap", gap:12, flexShrink:0 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:900, color:"#111110", letterSpacing:"-0.5px", margin:0, display:"flex", alignItems:"center", gap:10 }}>
              <MapPin size={22} color="#FF6B6B" strokeWidth={2.5}/> Prague Art Map
            </h1>
            <p style={{ fontSize:13, color:"#9B8F7A", margin:"4px 0 0", fontWeight:600 }}>
              {loading ? "Loading…" : `${visible} locations · venues, events, collabs & artworks`}
            </p>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, border:"2px solid #111110", padding:"0 12px", background:"#fff", height:38, minWidth:240, boxShadow:"2px 2px 0 #111110" }}>
            <MapPin size={13} color="#9B8F7A"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search map…"
              style={{ border:"none", outline:"none", fontSize:13, fontFamily:"inherit", background:"transparent", flex:1, color:"#111110" }}/>
            {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A", padding:0 }}><X size={12}/></button>}
          </div>
        </div>

        {/* Layer filters */}
        <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", flexShrink:0 }}>
          {(Object.entries(CFG) as [Kind,any][]).map(([k, cfg]) => {
            const count = items.filter(i=>i.kind===k).length;
            const Icon  = cfg.icon;
            const on    = layers[k];
            return (
              <button key={k} onClick={()=>toggleLayer(k)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 12px", border:`2px solid ${on?cfg.border:"#E0D8CA"}`, background:on?cfg.bg:"#fff", fontSize:11, fontWeight:700, cursor:"pointer", color:"#111110", transition:"all 0.1s" }}>
                <div style={{ width:8, height:8, borderRadius:k==="artwork"?2:"50%", background:on?cfg.color:"#d4cfc4", border:"1.5px solid rgba(0,0,0,0.1)" }}/>
                <Icon size={11} color={on?cfg.color:"#d4cfc4"}/>
                {cfg.label} <span style={{ color:on?cfg.color:"#d4cfc4", fontWeight:900 }}>({count})</span>
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
                { lbl:"+",   fn:()=>mapObj.current?.setZoom((mapObj.current.getZoom()||13)+1) },
                { lbl:"−",   fn:()=>mapObj.current?.setZoom((mapObj.current.getZoom()||13)-1) },
                { lbl:"⌖",  fn:()=>{ mapObj.current?.setCenter(PRAGUE_CENTER); mapObj.current?.setZoom(13); } },
              ].map(b=>(
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
          <div style={{ width:active?300:0, flexShrink:0, borderLeft:active?"2px solid #111110":"none", background:"#fff", overflow:"hidden", transition:"width 0.2s ease" }}>
            {active && (
              <div style={{ width:300, height:"100%", overflowY:"auto" }}>
                {/* Header */}
                <div style={{ padding:"14px 16px", borderBottom:"2px solid #111110", background:CFG[active.kind].bg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:CFG[active.kind].color, border:"1.5px solid #111110" }}/>
                    <span style={{ fontSize:9, fontWeight:900, color:"#111110", textTransform:"uppercase", letterSpacing:"0.12em" }}>
                      {CFG[active.kind].label.replace(/s$/,"")}
                    </span>
                  </div>
                  <button onClick={()=>setActive(null)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A" }}>
                    <X size={14}/>
                  </button>
                </div>

                <div style={{ padding:"18px 16px", display:"flex", flexDirection:"column", gap:12 }}>

                  {/* VENUE */}
                  {active.kind==="venue" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.name}</h2>
                    {active.data.address && <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}><MapPin size={12} style={{flexShrink:0,marginTop:1}}/>{active.data.address}</div>}
                    {active.data.type && <div style={{ display:"inline-block", padding:"3px 10px", background:"#FFE4E6", border:"1.5px solid #FF6B6B", fontSize:9, fontWeight:900, color:"#FF6B6B", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.type}</div>}
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(active.data.address||active.data.name)}`} target="_blank" rel="noopener noreferrer" style={{textDecoration:"none"}}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#fff", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> Open in Google Maps
                      </div>
                    </a>
                  </>}

                  {/* EVENT */}
                  {active.kind==="event" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {(active.data.venue||active.data.location_name) && <div style={{ fontSize:12, color:"#9B8F7A", fontWeight:600 }}>@ {active.data.venue||active.data.location_name}</div>}
                    {active.data.start_date && <div style={{ padding:"6px 10px", background:"#F0FDF4", border:"1.5px solid #4ECDC4", fontSize:11, fontWeight:700, color:"#0F6E56" }}>Opens {new Date(active.data.start_date).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>}
                    {active.data.status && <div style={{ display:"inline-block", padding:"3px 10px", background:"#F0FDF4", border:"1.5px solid #4ECDC4", fontSize:9, fontWeight:900, color:"#16A34A", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.status}</div>}
                    <Link href={`/dashboard/exhibitions`} style={{textDecoration:"none"}}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#F0FDF4", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> View event
                      </div>
                    </Link>
                  </>}

                  {/* COLLAB */}
                  {active.kind==="collab" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {active.data.type && <div style={{ display:"inline-block", padding:"3px 10px", background:"#FEF9C3", border:"1.5px solid #CA8A04", fontSize:9, fontWeight:900, color:"#854D0E", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.type}</div>}
                    {active.data.location_name && <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}><MapPin size={12} style={{flexShrink:0,marginTop:1}}/>{active.data.location_name}</div>}
                    {active.data.status && <div style={{ fontSize:12, color:"#9B8F7A", fontWeight:600 }}>Status: {active.data.status}</div>}
                    <Link href="/dashboard/pool" style={{textDecoration:"none"}}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#FEF9C3", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> View in Collabs
                      </div>
                    </Link>
                  </>}

                  {/* ARTWORK */}
                  {active.kind==="artwork" && <>
                    {Array.isArray(active.data.images)&&active.data.images[0] && (
                      <div style={{ border:"2px solid #111110", overflow:"hidden", aspectRatio:"4/3" }}>
                        <img src={active.data.images[0]} alt={active.data.title} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                      </div>
                    )}
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {(active.data.venue_location||active.data.location_name) && (
                      <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}>
                        <MapPin size={12} style={{flexShrink:0,marginTop:1}}/>{active.data.venue_location||active.data.location_name}
                      </div>
                    )}
                    {active.data.status && <div style={{ display:"inline-block", padding:"3px 10px", background:"#EDE9FE", border:"1.5px solid #8B5CF6", fontSize:9, fontWeight:900, color:"#6D28D9", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.status}</div>}
                    <Link href={`/dashboard/artworks/${active.data.id}`} style={{textDecoration:"none"}}>
                      <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 12px", border:"2px solid #111110", background:"#EDE9FE", fontSize:11, fontWeight:700, color:"#111110", cursor:"pointer" }}>
                        <ExternalLink size={11}/> View artwork
                      </div>
                    </Link>
                  </>}

                  {/* POOL */}
                  {active.kind==="pool" && <>
                    <h2 style={{ fontSize:16, fontWeight:900, color:"#111110", letterSpacing:"-0.3px", margin:0 }}>{active.data.title}</h2>
                    {active.data.poster_type && <div style={{ display:"inline-block", padding:"3px 10px", background:"#FEF9C3", border:"1.5px solid #111110", fontSize:9, fontWeight:900, color:"#111110", textTransform:"uppercase", letterSpacing:"0.12em", width:"fit-content" }}>{active.data.poster_type} seeking</div>}
                    {(active.data.venue_city||active.data.location_name) && <div style={{ display:"flex", gap:6, fontSize:12, color:"#9B8F7A", fontWeight:600, alignItems:"flex-start" }}><MapPin size={12} style={{flexShrink:0,marginTop:1}}/>{active.data.location_name||active.data.venue_city}</div>}
                    <Link href="/dashboard/pool" style={{textDecoration:"none"}}>
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
            { shape:"circle",  color:"#FF6B6B", label:"Venue / Gallery"   },
            { shape:"diamond", color:"#4ECDC4", label:"Event / Show"      },
            { shape:"hex",     color:"#CA8A04", label:"Collaboration"     },
            { shape:"square",  color:"#8B5CF6", label:"Artwork on display" },
            { shape:"hex",     color:"#FFD400", label:"Pool request"      },
          ].map(item=>(
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#5C5346" }}>
              <div style={{ width:10, height:10, background:item.color, border:"1.5px solid #111110", borderRadius:item.shape==="circle"?"50%":item.shape==="square"?2:0, transform:item.shape==="diamond"?"rotate(45deg)":"none", flexShrink:0 }}/>
              {item.label}
            </div>
          ))}
          <span style={{ marginLeft:"auto", fontSize:10, color:"#9B8F7A", fontWeight:600 }}>Click markers for details · Pins with real addresses are precise</span>
        </div>
      </div>
    </>
  );
}
