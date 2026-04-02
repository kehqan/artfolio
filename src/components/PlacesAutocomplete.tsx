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
    __artfolioMapsLoaded: boolean;
    __artfolioMapsCallbacks: (() => void)[];
    __artfolioMapsReady: () => void;
  }
}

const PRAGUE = { lat: 50.0755, lng: 14.4378 };

const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#F5F0E8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5C5346" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFBEA" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#A8C8E0" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#E0D8CA" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#D4C9A8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#C8B89A" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#E8E0CC" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#D4E8C8" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#EAE4D0" }] },
];

// ── Read API key from multiple sources ─────────────────────────────
function getApiKey(): string {
  // 1. process.env (works if set before build)
  const envKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (envKey && envKey !== "undefined") return envKey;

  // 2. meta tag injected by layout (most reliable runtime approach)
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="gmaps-key"]') as HTMLMetaElement | null;
    if (meta?.content) return meta.content;
  }

  // 3. Already-loaded script tag src (if map page loaded it first)
  if (typeof document !== "undefined") {
    const existing = document.getElementById("artfolio-gmaps") as HTMLScriptElement | null;
    if (existing?.src) {
      const match = existing.src.match(/[?&]key=([^&]+)/);
      if (match) return match[1];
    }
  }

  return "";
}

// ── Shared singleton script loader ─────────────────────────────────
function loadMapsScript(onReady: () => void) {
  if (typeof window === "undefined") return;

  // Already loaded
  if (window.__artfolioMapsLoaded && window.google?.maps?.places) {
    onReady();
    return;
  }

  // Queue callback
  if (!window.__artfolioMapsCallbacks) window.__artfolioMapsCallbacks = [];
  window.__artfolioMapsCallbacks.push(onReady);

  // Script already injecting — just wait
  if (document.getElementById("artfolio-gmaps")) return;

  const key = getApiKey();
  if (!key) {
    console.error("[PlacesAutocomplete] No Google Maps API key found. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel env vars.");
    return;
  }

  window.__artfolioMapsReady = () => {
    window.__artfolioMapsLoaded = true;
    (window.__artfolioMapsCallbacks || []).forEach(cb => cb());
    window.__artfolioMapsCallbacks = [];
  };

  const script = document.createElement("script");
  script.id    = "artfolio-gmaps";
  script.src   = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__artfolioMapsReady&loading=async`;
  script.async = true;
  script.defer = true;
  script.onerror = () => console.error("[PlacesAutocomplete] Failed to load Google Maps script. Check API key and referrer restrictions.");
  document.head.appendChild(script);
}

export default function PlacesAutocomplete({
  value, onChange,
  placeholder = "Search address…",
  label, required,
  biasLat = PRAGUE.lat,
  biasLng = PRAGUE.lng,
}: Props) {
  const inputRef    = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapObjRef   = useRef<any>(null);
  const markerRef   = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const acSvcRef    = useRef<any>(null);
  const sessionRef  = useRef<any>(null);
  const debounce    = useRef<ReturnType<typeof setTimeout>>();

  const [mapsReady,   setMapsReady]   = useState(false);
  const [inputVal,    setInputVal]    = useState(value || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [pickerAddr,  setPickerAddr]  = useState("");
  const [pickerCoords, setPickerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [keyMissing,  setKeyMissing]  = useState(false);

  // Sync external value
  useEffect(() => { setInputVal(value || ""); }, [value]);

  // Load script on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // If already loaded, just flip state
    if (window.__artfolioMapsLoaded && window.google?.maps?.places) {
      setMapsReady(true);
      return;
    }

    const key = getApiKey();
    if (!key) {
      setKeyMissing(true);
      return;
    }

    loadMapsScript(() => setMapsReady(true));
  }, []);

  // Init Places services
  useEffect(() => {
    if (!mapsReady || !window.google?.maps?.places) return;
    acSvcRef.current   = new window.google.maps.places.AutocompleteService();
    sessionRef.current = new window.google.maps.places.AutocompleteSessionToken();
    geocoderRef.current= new window.google.maps.Geocoder();
  }, [mapsReady]);

  // Init map inside picker modal
  useEffect(() => {
    if (!showPicker || !mapsReady || !mapDivRef.current || mapObjRef.current) return;

    const center = pickerCoords || { lat: biasLat, lng: biasLng };
    const map = new window.google.maps.Map(mapDivRef.current, {
      center, zoom: pickerCoords ? 16 : 14,
      styles: MAP_STYLE,
      disableDefaultUI: true,
      clickableIcons: false,
    });
    mapObjRef.current = map;

    const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
      <path d="M16 2C9.37 2 4 7.37 4 14c0 9.5 12 28 12 28s12-18.5 12-28C28 7.37 22.63 2 16 2z" fill="#FF6B6B" stroke="#111110" stroke-width="2"/>
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

    if (pickerCoords) setPickerAddr(inputVal);

    function updateFromLatLng(lat: number, lng: number) {
      setPickerCoords({ lat, lng });
      revGeocode(lat, lng);
    }

    marker.addListener("dragend", () => {
      const pos = marker.getPosition();
      if (pos) updateFromLatLng(pos.lat(), pos.lng());
    });

    map.addListener("click", (e: any) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      updateFromLatLng(e.latLng.lat(), e.latLng.lng());
    });
  }, [showPicker, mapsReady]);

  // Reset map ref on close
  useEffect(() => {
    if (!showPicker) { mapObjRef.current = null; markerRef.current = null; }
  }, [showPicker]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) &&
          !dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function revGeocode(lat: number, lng: number) {
    if (!geocoderRef.current) return;
    setPickerLoading(true);
    geocoderRef.current.geocode({ location: { lat, lng } }, (res: any[], status: string) => {
      setPickerLoading(false);
      if (status === "OK" && res[0]) setPickerAddr(res[0].formatted_address);
    });
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputVal(v);
    if (!v.trim()) { onChange(null, ""); setSuggestions([]); setOpen(false); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => fetchSuggestions(v), 220);
  }

  function fetchSuggestions(query: string) {
    if (!acSvcRef.current || !mapsReady) return;
    setLoading(true);
    acSvcRef.current.getPlacePredictions(
      {
        input: query,
        sessionToken: sessionRef.current,
        location: new window.google.maps.LatLng(biasLat, biasLng),
        radius: 150000,
        // No type restriction — finds streets, buildings, cities
      },
      (results: any[] | null, status: string) => {
        setLoading(false);
        if (status === "OK" && results?.length) {
          setSuggestions(results);
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      }
    );
  }

  function pickSuggestion(pred: any) {
    setOpen(false);
    setSuggestions([]);
    setLoading(true);
    setInputVal(pred.description);

    const dummy = document.createElement("div");
    new window.google.maps.places.PlacesService(dummy).getDetails(
      { placeId: pred.place_id, fields: ["geometry", "formatted_address"], sessionToken: sessionRef.current },
      (place: any, status: string) => {
        setLoading(false);
        sessionRef.current = new window.google.maps.places.AutocompleteSessionToken();
        if (status === "OK" && place?.geometry) {
          const r: PlaceResult = {
            name: place.formatted_address || pred.description,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            placeId: pred.place_id,
          };
          setInputVal(r.name);
          onChange(r, r.name);
        }
      }
    );
  }

  function confirmPicker() {
    if (!pickerCoords) return;
    const r: PlaceResult = {
      name: pickerAddr || `${pickerCoords.lat.toFixed(5)}, ${pickerCoords.lng.toFixed(5)}`,
      lat: pickerCoords.lat, lng: pickerCoords.lng, placeId: "",
    };
    setInputVal(r.name);
    onChange(r, r.name);
    setShowPicker(false);
  }

  const hasVal = inputVal.trim().length > 0;

  return (
    <>
      <div style={{ position: "relative" }}>
        {label && (
          <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            {label}{required && " *"}
          </div>
        )}

        {/* Input */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 10px", border: "2px solid #E0D8CA", background: "#fff", height: 44, transition: "border-color 0.15s" }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "#FFD400")}
          onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) e.currentTarget.style.borderColor = "#E0D8CA"; }}
        >
          {loading
            ? <Loader2 size={15} color="#9B8F7A" style={{ flexShrink: 0, animation: "spin 0.8s linear infinite" }} />
            : <MapPin size={15} color={hasVal ? "#FF6B6B" : "#9B8F7A"} style={{ flexShrink: 0 }} />
          }
          <input
            ref={inputRef}
            value={inputVal}
            onChange={handleInput}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder={keyMissing ? "Maps API key not configured" : placeholder}
            required={required}
            disabled={keyMissing}
            autoComplete="off"
            style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", background: "transparent", color: "#111110", minWidth: 0 }}
          />
          {hasVal && !keyMissing && (
            <button type="button" onClick={() => { setInputVal(""); onChange(null, ""); setSuggestions([]); setOpen(false); inputRef.current?.focus(); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#d4cfc4", padding: 0, display: "flex", alignItems: "center" }}>
              <X size={12} />
            </button>
          )}
          {mapsReady && !keyMissing && (
            <button type="button" onClick={() => { setPickerAddr(inputVal); setShowPicker(true); }}
              title="Pick on map"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", padding: "2px 3px", display: "flex", alignItems: "center", borderLeft: "1px solid #E0D8CA", marginLeft: 4, paddingLeft: 8 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#111110"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#9B8F7A"}>
              <Map size={14} />
            </button>
          )}
        </div>

        {/* Dropdown suggestions */}
        {open && suggestions.length > 0 && (
          <div ref={dropdownRef} style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", zIndex: 9999, maxHeight: 320, overflowY: "auto" }}>
            {suggestions.map((s, i) => {
              const main = s.structured_formatting?.main_text || s.description.split(",")[0];
              const sub  = s.structured_formatting?.secondary_text || s.description.split(",").slice(1).join(",").trim();
              return (
                <button key={s.place_id} type="button"
                  onMouseDown={e => { e.preventDefault(); pickSuggestion(s); }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "10px 14px", border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid #F5F0E8" : "none", background: "none", cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#FFFBEA")}
                  onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                  <MapPin size={13} color="#FF6B6B" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{main}</div>
                    {sub && <div style={{ fontSize: 11, color: "#9B8F7A", marginTop: 1 }}>{sub}</div>}
                  </div>
                </button>
              );
            })}
            <div style={{ padding: "5px 14px", borderTop: "1px solid #F5F0E8", display: "flex", justifyContent: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 9, color: "#d4cfc4", fontWeight: 600 }}>Powered by</span>
              <span style={{ fontSize: 9, color: "#9B8F7A", fontWeight: 800 }}>Google</span>
            </div>
          </div>
        )}

        {keyMissing && (
          <div style={{ fontSize: 10, color: "#FF6B6B", fontWeight: 700, marginTop: 4 }}>
            ⚠ Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in Vercel → Settings → Environment Variables
          </div>
        )}
      </div>

      {/* Map picker modal */}
      {showPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowPicker(false); }}>
          <div style={{ background: "#fff", border: "2px solid #111110", boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 700, display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "14px 18px", borderBottom: "2px solid #111110", background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Map size={16} />
                <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>Pick location on map</span>
              </div>
              <button type="button" onClick={() => setShowPicker(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, fontWeight: 900, color: "#111110" }}>✕</button>
            </div>

            <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A", padding: "8px 18px", borderBottom: "1px solid #E0D8CA", background: "#FAFAF8", flexShrink: 0 }}>
              Click anywhere on the map to place the pin, or drag the pin to adjust
            </div>

            <div style={{ position: "relative", flex: 1, minHeight: 400 }}>
              <div ref={mapDivRef} style={{ width: "100%", height: "100%", minHeight: 400 }} />
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                {[
                  { l: "+", f: () => mapObjRef.current?.setZoom((mapObjRef.current.getZoom() || 14) + 1) },
                  { l: "−", f: () => mapObjRef.current?.setZoom((mapObjRef.current.getZoom() || 14) - 1) },
                  { l: "⌖", f: () => { mapObjRef.current?.setCenter(PRAGUE); mapObjRef.current?.setZoom(13); } },
                ].map(b => (
                  <button key={b.l} type="button" onClick={b.f}
                    style={{ width: 32, height: 32, background: "#fff", border: "2px solid #111110", fontSize: 15, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
                    {b.l}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: "14px 18px", borderTop: "2px solid #111110", background: "#FAFAF8", flexShrink: 0, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>Selected location</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pickerLoading ? "Getting address…" : pickerAddr || "No location selected — click the map"}
                </div>
                {pickerCoords && (
                  <div style={{ fontSize: 10, color: "#9B8F7A", fontFamily: "monospace", marginTop: 2 }}>
                    {pickerCoords.lat.toFixed(6)}, {pickerCoords.lng.toFixed(6)}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => setShowPicker(false)}
                  style={{ padding: "9px 16px", border: "2px solid #111110", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="button" onClick={confirmPicker} disabled={!pickerCoords}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: "2px solid #111110", background: pickerCoords ? "#FFD400" : "#F5F0E8", fontSize: 12, fontWeight: 800, cursor: pickerCoords ? "pointer" : "not-allowed", boxShadow: pickerCoords ? "3px 3px 0 #111110" : "none", color: "#111110" }}>
                  <Check size={13} /> Confirm location
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
