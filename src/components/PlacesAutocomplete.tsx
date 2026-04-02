"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, X, Loader2 } from "lucide-react";

export type PlaceResult = {
  name: string;       // formatted address
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
  /** bias results around this location (default: Prague) */
  biasLat?: number;
  biasLng?: number;
}

declare global {
  interface Window { google: any; }
}

export default function PlacesAutocomplete({
  value,
  onChange,
  placeholder = "Search address…",
  label,
  required,
  biasLat = 50.0755,
  biasLng = 14.4378,
}: Props) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const listRef         = useRef<HTMLDivElement>(null);
  const serviceRef      = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [open, setOpen]               = useState(false);
  const [inputVal, setInputVal]       = useState(value || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value
  useEffect(() => { setInputVal(value || ""); }, [value]);

  // Init Places service once Maps is loaded
  useEffect(() => {
    function tryInit() {
      if (!window.google?.maps?.places) return false;
      serviceRef.current      = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      return true;
    }
    if (!tryInit()) {
      const interval = setInterval(() => { if (tryInit()) clearInterval(interval); }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) && !listRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputVal(v);
    // If user clears the field, notify parent
    if (!v.trim()) { onChange(null, ""); setSuggestions([]); setOpen(false); return; }
    // Debounce autocomplete call
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 250);
  }

  function fetchSuggestions(query: string) {
    if (!serviceRef.current) return;
    setLoading(true);
    const circle = new window.google.maps.Circle({
      center: { lat: biasLat, lng: biasLng },
      radius: 50000, // 50km bias radius
    });
    serviceRef.current.getPlacePredictions(
      {
        input: query,
        sessionToken: sessionTokenRef.current,
        locationBias: circle.getBounds(),
        types: ["geocode", "establishment"],
      },
      (results: any[], status: string) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setSuggestions(results);
          setOpen(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }

  function selectPlace(prediction: any) {
    setOpen(false);
    setSuggestions([]);
    setLoading(true);
    setInputVal(prediction.description);

    // Need PlacesService on a real DOM node to get details
    const dummyMap = document.createElement("div");
    const placesService = new window.google.maps.places.PlacesService(dummyMap);

    placesService.getDetails(
      {
        placeId:      prediction.place_id,
        fields:       ["geometry", "formatted_address", "name"],
        sessionToken: sessionTokenRef.current,
      },
      (place: any, status: string) => {
        setLoading(false);
        // Refresh session token after use
        sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry) {
          const result: PlaceResult = {
            name:    place.formatted_address || prediction.description,
            lat:     place.geometry.location.lat(),
            lng:     place.geometry.location.lng(),
            placeId: prediction.place_id,
          };
          setInputVal(result.name);
          onChange(result, result.name);
        }
      }
    );
  }

  function handleClear() {
    setInputVal("");
    onChange(null, "");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  const inputStyle: React.CSSProperties = {
    flex: 1, border: "none", outline: "none", fontSize: 13,
    fontFamily: "inherit", background: "transparent", color: "#111110",
    minWidth: 0,
  };

  return (
    <div style={{ position: "relative" }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          {label}{required && " *"}
        </div>
      )}

      {/* Input row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", border: "2px solid #E0D8CA", background: "#fff", transition: "border-color 0.1s" }}
        onFocus={() => (document.querySelector(".pac-wrap-" + label?.replace(/\s/g,"")) as HTMLElement | null)?.style.setProperty("border-color", "#FFD400")}
        className={"pac-wrap-" + (label?.replace(/\s/g,"") || "loc")}>
        {loading
          ? <Loader2 size={14} color="#9B8F7A" style={{ flexShrink: 0, animation: "spin 0.8s linear infinite" }} />
          : <MapPin size={14} color="#9B8F7A" style={{ flexShrink: 0 }} />
        }
        <input
          ref={inputRef}
          value={inputVal}
          onChange={handleInput}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          required={required}
          style={inputStyle}
          autoComplete="off"
        />
        {inputVal && (
          <button type="button" onClick={handleClear}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#9B8F7A", padding: 0, display: "flex", alignItems: "center" }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {open && suggestions.length > 0 && (
        <div ref={listRef}
          style={{ position: "absolute", top: "calc(100% + 2px)", left: 0, right: 0, background: "#fff", border: "2px solid #111110", boxShadow: "4px 4px 0 #111110", zIndex: 100, maxHeight: 280, overflowY: "auto" }}>
          {suggestions.map((s, i) => (
            <button key={s.place_id} type="button" onClick={() => selectPlace(s)}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", padding: "10px 14px", border: "none", borderBottom: i < suggestions.length - 1 ? "1px solid #F5F0E8" : "none", background: "none", cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#FFFBEA")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}>
              <MapPin size={13} color="#FF6B6B" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", lineHeight: 1.3 }}>
                  {s.structured_formatting?.main_text || s.description.split(",")[0]}
                </div>
                <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 500, marginTop: 2 }}>
                  {s.structured_formatting?.secondary_text || s.description.split(",").slice(1).join(",").trim()}
                </div>
              </div>
            </button>
          ))}
          {/* Powered by Google */}
          <div style={{ padding: "6px 14px", borderTop: "1px solid #F5F0E8", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 9, color: "#d4cfc4", fontWeight: 600 }}>Powered by</span>
            <span style={{ fontSize: 9, color: "#9B8F7A", fontWeight: 800 }}>Google</span>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
