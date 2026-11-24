"use client";
// Venue sections of a personal site. Filled in by the venue site work.
import type { SectionKey, SiteConfig, SiteData, SiteWork } from "@/lib/site";

export function venueHas(_k: SectionKey, _data: SiteData, _site: SiteConfig): boolean {
  return false;
}

export function VenueSection(_props: { k: SectionKey; data: SiteData; site: SiteConfig; onOpenWork: (w: SiteWork) => void; preview?: boolean }) {
  return null;
}
