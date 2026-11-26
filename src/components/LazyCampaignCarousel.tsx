"use client";
// The campaign carousel sits near the bottom of the landing page and needs the
// database client, so its code (and Supabase's) loads after the page, in its
// own file, instead of being part of what the landing page needs to start.
import dynamic from "next/dynamic";

export default dynamic(() => import("./CampaignCarousel"), { ssr: false });
