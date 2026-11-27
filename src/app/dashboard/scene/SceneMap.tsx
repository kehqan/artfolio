"use client";
// The Scene feed on a map. Only posts with a real address get a pin;
// nothing is placed at made-up positions.
import { safeHref } from "@/lib/safe-url";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin, X } from "lucide-react";
import { getApiKey, loadScript, MAP_STYLE } from "@/components/PlacesAutocomplete";
import { Badge, Card, EmptyState } from "@/components/ui";
import type { FeedItem } from "./feed";

export type Venue = { id: string; name: string; type?: string; city?: string; address?: string; website?: string; lat: number; lng: number };

const DEFAULT_CENTER = { lat: 50.0755, lng: 14.4378 };

function pin(fill: string, size = 18) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="${fill}" stroke="#111110" stroke-width="2"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
function square() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><rect x="1.5" y="1.5" width="11" height="11" rx="2" fill="#FFFFFF" stroke="#6B6457" stroke-width="2"/></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

export function SceneMap({ items, venues, onOpen }: { items: FeedItem[]; venues: Venue[]; onOpen: (i: FeedItem) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const [ready, setReady] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const [venue, setVenue] = useState<Venue | null>(null);

  const placed = items.filter(i => i.lat != null && i.lng != null);
  const unplaced = items.length - placed.length;

  useEffect(() => {
    if (!getApiKey()) { setNoKey(true); return; }
    loadScript(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !ref.current) return;
    const g = (window as any).google;
    if (!mapRef.current) {
      mapRef.current = new g.maps.Map(ref.current, {
        center: DEFAULT_CENTER, zoom: 12, styles: MAP_STYLE,
        disableDefaultUI: true, zoomControl: true, clickableIcons: false,
      });
    }
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];
    const bounds = new g.maps.LatLngBounds();

    venues.forEach(v => {
      const m = new g.maps.Marker({ map: mapRef.current, position: { lat: v.lat, lng: v.lng }, title: v.name,
        icon: { url: square(), scaledSize: new g.maps.Size(14, 14), anchor: new g.maps.Point(7, 7) } });
      m.addListener("click", () => setVenue(v));
      markers.current.push(m); bounds.extend(m.getPosition());
    });
    placed.forEach(i => {
      const m = new g.maps.Marker({ map: mapRef.current, position: { lat: i.lat, lng: i.lng }, title: i.title, zIndex: 2,
        icon: { url: pin(i.kind === "opportunity" ? "#FFD400" : "#FFFFFF"), scaledSize: new g.maps.Size(18, 18), anchor: new g.maps.Point(9, 9) } });
      m.addListener("click", () => { setVenue(null); onOpen(i); });
      markers.current.push(m); bounds.extend(m.getPosition());
    });

    if (markers.current.length > 1) mapRef.current.fitBounds(bounds, 48);
    else if (markers.current.length === 1) { mapRef.current.setCenter(bounds.getCenter()); mapRef.current.setZoom(14); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, items, venues]);

  if (noKey) {
    return <EmptyState icon={<MapPin size={22} aria-hidden />} title="The map isn't set up yet"
      description="The map needs a Google Maps key on the server. Until then, everything is in the feed." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-card border-hair border-line">
        <div ref={ref} className="h-[62vh] min-h-[380px] w-full bg-sunken" aria-label="Map of the scene" role="region" />
        {venue && (
          <Card padding="sm" className="absolute bottom-3 left-3 right-3 flex items-start gap-3 shadow-hard-2 sm:right-auto sm:w-80">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Badge className="self-start">Venue</Badge>
              <span className="font-ui text-body font-semibold text-fg">{venue.name}</span>
              <span className="font-ui text-body-sm text-fg-3">{[venue.address, venue.city].filter(Boolean).join(", ")}</span>
              {venue.website && (
                <a href={safeHref(venue.website)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-ui text-body-sm font-semibold text-fg underline-offset-4 hover:underline">
                  Website <ExternalLink size={12} aria-hidden />
                </a>
              )}
            </div>
            <button type="button" aria-label="Close" onClick={() => setVenue(null)} className="grid h-7 w-7 place-items-center rounded-chip text-fg-3 hover:bg-sunken hover:text-fg">
              <X size={15} aria-hidden />
            </button>
          </Card>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-ui text-caption text-fg-3">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-pill border-outline border-ink bg-surface" /> Shows, events and collabs</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-pill border-outline border-ink bg-mango" /> Opportunities</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] border-outline border-fg-3 bg-surface" /> Venues</span>
        {unplaced > 0 && <span className="sm:ml-auto">{unplaced} {unplaced === 1 ? "post has" : "posts have"} no address and only show in the feed.</span>}
      </div>
      {placed.length === 0 && venues.length === 0 && (
        <p className="font-ui text-body-sm text-fg-3">Nothing with an address yet. Posts with a place show up here.</p>
      )}
    </div>
  );
}

