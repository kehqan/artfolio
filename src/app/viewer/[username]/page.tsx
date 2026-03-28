import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Heart, Image as ImageIcon } from "lucide-react";

export default async function ViewerProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const { data: viewer } = await supabase.from("viewer_profiles").select("*").eq("username", params.username).single();
  if (!viewer) notFound();

  const [{ data: follows }, { data: wishlists }] = await Promise.all([
    supabase.from("follows").select("target_type, target_id").eq("viewer_id", viewer.id),
    supabase.from("wishlists").select("artworks(id, title, images, price, artists(name, username))").eq("viewer_id", viewer.id).limit(20),
  ]);

  const artistFollows = (follows || []).filter((f) => f.target_type === "artist");
  const venueFollows = (follows || []).filter((f) => f.target_type === "venue");
  const wishlistItems = (wishlists || []).map((w: any) => w.artworks).filter(Boolean);

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-display font-semibold text-stone-900 text-lg">Artfolio</Link>
        <Link href="/register" className="btn-primary text-sm py-2">Join Artfolio</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        {/* Profile */}
        <div className="flex items-start gap-6 mb-12">
          {viewer.avatar_url
            ? <img src={viewer.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover shrink-0" />
            : <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-3xl font-bold text-stone-400 shrink-0">{viewer.display_name?.[0]}</div>}
          <div>
            <h1 className="font-display text-2xl font-semibold text-stone-900">{viewer.display_name}</h1>
            {(viewer.city || viewer.country) && (
              <p className="flex items-center gap-1.5 text-stone-500 text-sm mt-1">
                <MapPin className="w-3.5 h-3.5" />{[viewer.city, viewer.country].filter(Boolean).join(", ")}
              </p>
            )}
            {viewer.bio && <p className="text-stone-600 mt-2 max-w-lg">{viewer.bio}</p>}
            <div className="flex items-center gap-4 mt-3 text-sm text-stone-500">
              <span>{artistFollows.length} artists followed</span>
              <span>{venueFollows.length} venues followed</span>
              <span>{wishlistItems.length} in wishlist</span>
            </div>
          </div>
        </div>

        {/* Wishlist */}
        {wishlistItems.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Heart className="w-5 h-5 text-rose-500" />
              <h2 className="font-display text-2xl font-semibold">Wishlist</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {wishlistItems.map((a: any) => (
                <div key={a.id} className="card-hover overflow-hidden group">
                  <div className="aspect-square bg-stone-100">
                    {a.images?.[0]
                      ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-stone-300" /></div>}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-stone-900 truncate">{a.title}</p>
                    {a.artists?.name && (
                      <Link href={`/artist/${a.artists.username}`} className="text-xs text-emerald-600 hover:underline">{a.artists.name}</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
