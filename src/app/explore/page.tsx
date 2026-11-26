// Explore: built on the server from public data and kept on Vercel's CDN for
// five minutes, so it opens with works and artists already on the page.
import { publicClient } from "@/lib/supabase/public";
import ExploreClient from "./ExploreClient";
import { loadExplore } from "./data";

export const revalidate = 300;
export const metadata = { title: "Explore" };

export default async function ExplorePage() {
  return <ExploreClient initial={await loadExplore(publicClient())} />;
}
