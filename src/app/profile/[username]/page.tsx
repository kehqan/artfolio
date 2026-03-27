"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Heart,
  MapPin,
  Instagram,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type TabType = "following" | "venues" | "wishlist";

interface ViewerProfile {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  city: string;
  country: string;
  avatar_url: string;
  instagram_handle: string;
}

interface Artist {
  id: string;
  name: string;
  username: string;
  city: string;
  country: string;
  medium: string;
  style_tags: string[];
  avatar_url: string;
}

interface Venue {
  id: string;
  name: string;
  type: string;
  city: string;
  description: string;
  cover_image_url: string;
}

interface Artwork {
  id: string;
  title: string;
  medium: string;
  price: number;
  availability_status: string;
  is_one_of_a_kind: boolean;
  images: string[];
  artist_name: string;
  artist_username: string;
}

interface PageProps {
  params: {
    username: string;
  };
}

export default function ViewerProfilePage({ params }: PageProps) {
  const supabase = createClient();
  const [viewer, setViewer] = useState<ViewerProfile | null>(null);
  const [followedArtists, setFollowedArtists] = useState<Artist[]>([]);
  const [followedVenues, setFollowedVenues] = useState<Venue[]>([]);
  const [wishlist, setWishlist] = useState<Artwork[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("following");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadViewerData();
  }, [params.username]);

  async function loadViewerData() {
    setLoading(true);
    try {
      // Load viewer profile
      const { data: viewerData } = await supabase
        .from("viewer_profiles")
        .select("*")
        .eq("username", params.username)
        .single();

      if (!viewerData) {
        setLoading(false);
        return;
      }

      setViewer(viewerData);

      // Load followed artists
      const { data: followedArtistsData } = await supabase
        .from("follows")
        .select("target_id, artists(id, name, username, city, country, medium, style_tags, avatar_url)")
        .eq("viewer_id", viewerData.id)
        .eq("target_type", "artist");

      if (followedArtistsData) {
        setFollowedArtists(
          followedArtistsData
            .filter((f: any) => f.artists)
            .map((f: any) => f.artists)
        );
      }

      // Load followed venues
      const { data: followedVenuesData } = await supabase
        .from("follows")
        .select("target_id, venues(id, name, type, city, description, cover_image_url)")
        .eq("viewer_id", viewerData.id)
        .eq("target_type", "venue");

      if (followedVenuesData) {
        setFollowedVenues(
          followedVenuesData
            .filter((f: any) => f.venues)
            .map((f: any) => f.venues)
        );
      }

      // Load wishlist
      const { data: wishlistData } = await supabase
        .from("wishlists")
        .select(
          `artwork_id,
           artworks(id, title, medium, price, availability_status, is_one_of_a_kind, images,
             artists(name, username))`
        )
        .eq("viewer_id", viewerData.id);

      if (wishlistData) {
        setWishlist(
          wishlistData
            .filter((w: any) => w.artworks)
            .map((w: any) => ({
              ...w.artworks,
              artist_name: w.artworks.artists?.name || "Unknown",
              artist_username: w.artworks.artists?.username || "",
            }))
        );
      }
    } catch (error) {
      console.error("Error loading viewer data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getAvatarInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  const formatPrice = (price: number) => {
    return "$" + price.toLocaleString();
  };

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800";
      case "sold":
        return "bg-red-100 text-red-800";
      case "reserved":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getVenueTypeColor = (type: string) => {
    switch (type) {
      case "gallery":
        return "bg-indigo-100 text-indigo-800";
      case "cafe":
        return "bg-amber-100 text-amber-800";
      case "studio":
        return "bg-emerald-100 text-emerald-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!viewer) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Profile Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center text-4xl font-bold text-indigo-600">
                {viewer.avatar_url ? (
                  <img
                    src={viewer.avatar_url}
                    alt={viewer.display_name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getAvatarInitial(viewer.display_name)
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {viewer.display_name}
              </h1>
              <p className="text-xl text-gray-600 mb-4">@{viewer.username}</p>

              {(viewer.city || viewer.country) && (
                <div className="flex items-center gap-1 text-gray-600 mb-4">
                  <MapPin className="w-5 h-5" />
                  <span>
                    {viewer.city}
                    {viewer.city && viewer.country && ", "}
                    {viewer.country}
                  </span>
                </div>
              )}

              {viewer.bio && (
                <p className="text-gray-700 mb-4 leading-relaxed max-w-2xl">
                  {viewer.bio}
                </p>
              )}

              {viewer.instagram_handle && (
                <a
                  href={`https://instagram.com/${viewer.instagram_handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  <Instagram className="w-5 h-5" />
                  @{viewer.instagram_handle}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {followedArtists.length}
              </div>
              <p className="text-sm text-gray-600">Following Artists</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {followedVenues.length}
              </div>
              <p className="text-sm text-gray-600">Following Venues</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {wishlist.length}
              </div>
              <p className="text-sm text-gray-600">Wishlisted</p>
            </div>
          </div>
        </div>
      </div>

      {/* Join Banner */}
      <div className="bg-indigo-50 border-b border-indigo-200">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Want to create your own profile?
            </p>
            <p className="font-medium text-indigo-600">Join Artfolio</p>
          </div>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 sticky top-16 z-30 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex gap-8">
            {(["following", "venues", "wishlist"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={
                  "py-4 px-1 font-medium text-sm border-b-2 transition-colors " +
                  (activeTab === tab
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-gray-600 hover:text-gray-900")
                }
              >
                {tab === "following"
                  ? "Following Artists"
                  : tab === "venues"
                    ? "Following Venues"
                    : "Wishlist"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Following Artists Tab */}
        {activeTab === "following" && (
          <div>
            {followedArtists.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Not following any artists yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {followedArtists.map((artist) => (
                  <a
                    key={artist.id}
                    href={`/artists/${artist.username}`}
                    className="group cursor-pointer rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3 text-xl font-bold text-indigo-600">
                        {artist.avatar_url ? (
                          <img
                            src={artist.avatar_url}
                            alt={artist.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          getAvatarInitial(artist.name)
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {artist.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        @{artist.username}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-3">
                        <MapPin className="w-3 h-3" />
                        {artist.city}, {artist.country}
                      </div>
                      <p className="text-xs text-gray-600 mb-3">
                        {artist.medium}
                      </p>
                      {artist.style_tags &&
                        artist.style_tags.slice(0, 3).length > 0 && (
                          <div className="flex gap-1 flex-wrap justify-center">
                            {artist.style_tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Following Venues Tab */}
        {activeTab === "venues" && (
          <div>
            {followedVenues.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Not following any venues yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {followedVenues.map((venue) => (
                  <a
                    key={venue.id}
                    href={`/venues/${venue.id}`}
                    className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="relative bg-gray-100 aspect-video overflow-hidden">
                      <img
                        src={
                          venue.cover_image_url ||
                          "https://images.unsplash.com/photo-1578321272176-1d4d4a896b65?w=500&h=300&fit=crop"
                        }
                        alt={venue.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 flex-1">
                          {venue.name}
                        </h3>
                        <span
                          className={
                            "px-2 py-1 rounded-full text-xs font-medium " +
                            getVenueTypeColor(venue.type)
                          }
                        >
                          {venue.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                        <MapPin className="w-4 h-4" />
                        {venue.city}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {venue.description.substring(0, 100)}
                        {venue.description.length > 100 ? "..." : ""}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Wishlist Tab */}
        {activeTab === "wishlist" && (
          <div>
            {wishlist.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No wishlisted artworks yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((artwork) => (
                  <div
                    key={artwork.id}
                    className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
                  >
                    <div className="relative bg-gray-100 aspect-square overflow-hidden">
                      <img
                        src={
                          artwork.images && artwork.images.length > 0
                            ? artwork.images[0]
                            : "https://images.unsplash.com/photo-1578321272176-1d4d4a896b65?w=500&h=500&fit=crop"
                        }
                        alt={artwork.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-3 right-3 flex gap-2">
                        <span
                          className={
                            "px-3 py-1 rounded-full text-xs font-medium " +
                            getAvailabilityColor(artwork.availability_status)
                          }
                        >
                          {artwork.availability_status.charAt(0).toUpperCase() +
                            artwork.availability_status.slice(1)}
                        </span>
                        {artwork.is_one_of_a_kind && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Unique
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-500 mb-1">
                        {artwork.artist_name}
                      </p>
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                        {artwork.title}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">
                        {artwork.medium}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg text-gray-900">
                          {formatPrice(artwork.price)}
                        </span>
                        <button
                          disabled
                          className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-400 cursor-not-allowed"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
