"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, X, Loader2, Map, Check } from "lucide-react";

export type PlaceResult = {
  name: string;
  lat: number;
  lng: number;
  placeId: string;
};

interface Props {
  value: string;
  onChange: (result: PlaceResult | null, rawText: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  biasLat?: number;
  biasLng?: number;
}

declare global {
  interface Window {
    google: any;
    __amLoaded: boolean;
    __amQueue: Array<() => void>;
    __amInit: () => void;
  }
}

const PRAGUE = { lat: 50.0755, lng: 14.4378 };

const MAP_STYLE = [
  { elementType: "geometry",         stylers: [{ color: "#F5F0E8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5C5346" }] },
  { featureType: "water",     elementType: "geometry", stylers: [{ color: "#A8C8E0" }] },
  { featureType: "road",      elementType: "geometry", stylers: [{ color: "#E0D8CA" }] },
  { featureType: "poi.park",  elementType: "geometry", stylers: [{ color: "#D4E8C8" }] },
];

function getApiKey(): string {
  const env = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (env && env.length > 10 && env !== "undefined") return env;
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="gmaps-key"]') as HTMLMetaElement | null;
    if (meta?.content && meta.content.length > 10) return meta.content;
    const script = document.getElementById("am-gmaps") as HTMLScriptElement | null;
    if (script?.src) {
      const m = script.src.match(/[?&]key=([^&]+)/);
      if (m?.[1]) return m[1];
    }
  }
  return "";
}

function loadScript(cb: () => void) {
  if (typeof window === "undefined") return;
  if (window.__amLoaded && window.google?.maps?.places) { cb(); return; }
  if (!window.__amQueue) window.__amQueue = [];
  window.__amQueue.push(cb);
  if (document.getElementById("am-gmaps")) return;

  const key = getApiKey();
  if (!key) {
    console.error("[Maps] No NEXT_PUBLIC_GOOGLE_MAPS_API_KEY set in Vercel env vars");
    return;
  }

  window.__amInit = () => {
    window.__amLoaded = true;
    (window.__amQueue || []).forEach(f => f());
    window.__amQueue = [];
  };

  const s = document.createElement("script");
  s.id    = "am-gmaps";
  s.src   = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__amInit&loading=async`;
  s.async = true;
  s.defer = true;
  s.onerror = () => console.error("[Maps] Failed to load script — check API key and billing");
  document.head.appendChild(s);
}

// ── Inject Google's dropdown styles scoped to #am-pac wrapper ─────
const PAC_STYLE = `
  .am-input-wrap .pac-container {
    border: 2px solid #111110 !important;
    box-shadow: 4px 4px 0 #111110 !important;
    border-radius: 0 !important;
    font-family: 'Darker Grotesque', system-ui, sans-serif !important;
    margin-top: 2px !important;
    z-index: 99999 !important;
  }
  .am-input-wrap .pac-item {
    padding: 9px 14px !important;
    font-size: 13px !important;
    font-family: inherit !important;
    border-top: 1px solid #F5F0E8 !important;
    cursor: pointer !important;
    color: #111110 !important;
  }
  .am-input-wrap .pac-item:first-child { border-top: none !important; }
  .am-input-wrap .pac-item:hover,
  .am-input-wrap .pac-item-selected {
    background: #FFFBEA !important;
  }
  .am-input-wrap .pac-item-query {
    font-size: 13px !important;
    font-weight: 700 !important;
    color: #111110 !important;
    font-family: inherit !important;
  }
  .am-input-wrap .pac-matched { font-weight: 900 !important; }
  .am-input-wrap .pac-icon { display: none !important; }
  .pac-logo::after { display: none !important; }
`;

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Search address…",
  label,
  required,
  biasLat = PRAGUE.lat,
  biasLng = PRAGUE.lng,
}: Props) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const acRef      = useRef<any>(null);   // google.maps.places.Autocomplete instance
  const mapDivRef  = useRef<HTMLDivElement>(null);
  const mapObjRef  = useRef<any>(null);
  const markerRef  = useRef<any>(null);
  const geocRef    = useRef<any>(null);

  const [inputVal,   setInputVal]   = useState(value || "");
  const [ready,      setReady]      = useState(false);
  const [showMap,    setShowMap]    = useState(false);
  const [mapAddr,    setMapAddr]    = useState("");
  const [mapCoords,  setMapCoords]  = useState<{lat:number;lng:number}|null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [noKey,      setNoKey]      = useState(false);

  // Sync external value
  useEffect(() => { setInputVal(value || ""); }, [value]);

  // ── Load Maps + init Autocomplete widget on the input ─────────────
  useEffect(() => {
    if (!inputRef.current) return;

    if (!getApiKey()) { setNoKey(true); return; }

    loadScript(() => {
      if (!inputRef.current || acRef.current) return;
      if (!window.google?.maps?.places?.Autocomplete) {
        console.error("[Maps] Autocomplete class not available");
        return;
      }

      // Create the Google Autocomplete widget — attaches to the input directly
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        fields: ["formatted_address", "geometry", "place_id", "name"],
        // No `types` restriction — finds everything (streets, cities, venues)
        bounds: new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(biasLat - 1.5, biasLng - 1.5),
          new window.google.maps.LatLng(biasLat + 1.5, biasLng + 1.5)
        ),
        strictBounds: false,
      });

      acRef.current  = ac;
      geocRef.current = new window.google.maps.Geocoder();
      setReady(true);

      // When user picks a suggestion
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place?.geometry) {
          // User typed something but didn't pick — keep raw text
          const raw = inputRef.current?.value || "";
          setInputVal(raw);
          onChange(null, raw);
          return;
        }
        const result: PlaceResult = {
          name:    place.formatted_address || place.name || inputRef.current?.value || "",
          lat:     place.geometry.location.lat(),
          lng:     place.geometry.location.lng(),
          placeId: place.place_id || "",
        };
        setInputVal(result.name);
        onChange(result, result.name);
      });
    });

    return () => {
      // Cleanup: remove listener if component unmounts
      if (acRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(acRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Map picker init ───────────────────────────────────────────────
  useEffect(() => {
    if (!showMap || !ready || !mapDivRef.current || mapObjRef.current) return;

    const center = mapCoords || { lat: biasLat, lng: biasLng };
    const map = new window.google.maps.Map(mapDivRef.current, {
      center, zoom: mapCoords ? 16 : 13,
      styles: MAP_STYLE, disableDefaultUI: true, clickableIcons: false,
    });
    mapObjRef.current = map;

    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <path d="M16 2C9.4 2 4 7.4 4 14c0 9.5 12 28 12 28S28 23.5 28 14C28 7.4 22.6 2 16 2z"
        fill="#FF6B6B" stroke="#111110" stroke-width="2"/>
      <circle cx="16" cy="14" r="5" fill="white"/>
    </svg>`;

    const marker = new window.google.maps.Marker({
      position: center, map, draggable: true,
      animation: window.google.maps.Animation.DROP,
      icon: {
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg),
        scaledSize: new window.google.maps.Size(32, 44),
        anchor: new window.google.maps.Point(16, 44),
      },
    });
    markerRef.current = marker;
    if (mapCoords) setMapAddr(inputVal);

    function reverseGeocode(lat: number, lng: number) {
      setMapCoords({ lat, lng });
      if (!geocRef.current) return;
      setMapLoading(true);
      geocRef.current.geocode({ location: { lat, lng } }, (res: any[], status: string) => {
        setMapLoading(false);
        if (status === "OK" && res[0]) setMapAddr(res[0].formatted_address);
      });
    }

    marker.addListener("dragend", () => {
      const p = marker.getPosition();
      if (p) reverseGeocode(p.lat(), p.lng());
    });
    map.addListener("click", (e: any) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      reverseGeocode(e.latLng.lat(), e.latLng.lng());
    });
  }, [showMap, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showMap) { mapObjRef.current = null; markerRef.current = null; }
  }, [showMap]);

  function confirmMap() {
    if (!mapCoords) return;
    const result: PlaceResult = {
      name:    mapAddr || `${mapCoords.lat.toFixed(5)}, ${mapCoords.lng.toFixed(5)}`,
      lat:     mapCoords.lat, lng: mapCoords.lng, placeId: "",
    };
    setInputVal(result.name);
    onChange(result, result.name);
    setShowMap(false);
  }

  function clear() {
    setInputVal("");
    onChange(null, "");
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }

  const hasVal = inputVal.trim().length > 0;

  return (
    <>
      <style>{PAC_STYLE}{`@keyframes am-spin{to{transform:rotate(360deg)}}`}</style>

      <div className="am-input-wrap" style={{ position: "relative" }}>
        {label && (
          <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            {label}{required && <span style={{ color: "#FF6B6B" }}> *</span>}
          </div>
        )}

        {/* Input row */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 10px",
            border: "2px solid #E0D8CA",
            background: "#fff",
            height: 44,
            transition: "border-color 0.15s",
          }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "#FFD400")}
          onBlurCapture={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              e.currentTarget.style.borderColor = "#E0D8CA";
          }}
        >
          <MapPin size={15} color={hasVal ? "#FF6B6B" : "#C0B8A8"} style={{ flexShrink: 0 }} />

          <input
            ref={inputRef}
            type="text"
            defaultValue={inputVal}
            onChange={e => {
              setInputVal(e.target.value);
              if (!e.target.value.trim()) onChange(null, "");
            }}
            placeholder={noKey ? "Maps API key not set" : placeholder}
            required={required}
            disabled={noKey}
            autoComplete="off"
            style={{
              flex: 1, border: "none", outline: "none",
              fontSize: 14, fontFamily: "inherit", fontWeight: 500,
              background: "transparent", color: "#111110", minWidth: 0,
            }}
          />

          {hasVal && (
            <button type="button" onClick={clear}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#C0B8A8", padding: 0, display: "flex", alignItems: "center" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#9B8F7A")}
              onMouseLeave={e => (e.currentTarget.style.color = "#C0B8A8")}>
              <X size={13} />
            </button>
          )}

          {ready && (
            <>
              <div style={{ width: 1, height: 22, background: "#E0D8CA", flexShrink: 0, margin: "0 4px" }} />
              <button type="button" onClick={() => { setMapAddr(inputVal); setShowMap(true); }}
                title="Pick on map"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", padding: "2px 0", display: "flex", alignItems: "center" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#111110")}
                onMouseLeave={e => (e.currentTarget.style.color = "#9B8F7A")}>
                <Map size={14} />
              </button>
            </>
          )}
        </div>

        {noKey && (
          <div style={{ fontSize: 11, color: "#FF6B6B", fontWeight: 700, marginTop: 4 }}>
            ⚠ Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel → Settings → Environment Variables
          </div>
        )}
      </div>

      {/* ── Map Picker Modal ── */}
      {showMap && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999999, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowMap(false); }}>
          <div style={{ background: "#fff", border: "2.5px solid #111110", boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 680, display: "flex", flexDirection: "column", maxHeight: "90vh" }}>

            <div style={{ padding: "12px 18px", borderBottom: "2px solid #111110", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Map size={16} />
                <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Pick location on map</span>
              </div>
              <button type="button" onClick={() => setShowMap(false)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, fontWeight: 900, color: "#111110", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A", padding: "8px 18px", borderBottom: "1px solid #E0D8CA", background: "#FAFAF8", flexShrink: 0 }}>
              Click on the map to place a pin, or drag the pin to adjust
            </div>

            <div style={{ position: "relative", flex: 1, minHeight: 380 }}>
              <div ref={mapDivRef} style={{ width: "100%", height: "100%", minHeight: 380 }} />
              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { l: "+", f: () => mapObjRef.current?.setZoom((mapObjRef.current.getZoom() || 13) + 1) },
                  { l: "−", f: () => mapObjRef.current?.setZoom((mapObjRef.current.getZoom() || 13) - 1) },
                  { l: "⌖", f: () => { mapObjRef.current?.setCenter({ lat: biasLat, lng: biasLng }); mapObjRef.current?.setZoom(13); } },
                ].map(b => (
                  <button key={b.l} type="button" onClick={b.f}
                    style={{ width: 32, height: 32, background: "#fff", border: "2px solid #111110", fontSize: 15, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
                    {b.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "12px 18px", borderTop: "2px solid #111110", background: "#FAFAF8", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Selected location</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mapLoading ? "Getting address…" : mapAddr || "Click the map to select a location"}
                </div>
                {mapCoords && (
                  <div style={{ fontSize: 10, color: "#9B8F7A", fontFamily: "monospace", marginTop: 2 }}>
                    {mapCoords.lat.toFixed(6)}, {mapCoords.lng.toFixed(6)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => setShowMap(false)}
                  style={{ padding: "9px 16px", border: "2px solid #111110", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button type="button" onClick={confirmMap} disabled={!mapCoords}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "2px solid #111110", background: mapCoords ? "#FFD400" : "#F5F0E8", fontSize: 12, fontWeight: 800, cursor: mapCoords ? "pointer" : "not-allowed", boxShadow: mapCoords ? "3px 3px 0 #111110" : "none", color: "#111110", fontFamily: "inherit" }}>
                  <Check size={13} /> Confirm location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
