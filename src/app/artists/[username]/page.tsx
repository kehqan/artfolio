"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Heart,
  MapPin,
  Mail,
  Instagram,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface Artist {
  id: string;
  name: string;
  username: string;
  bio: string;
  city: string;
  country: string;
  medium: string;
  style_tags: string[];
  avatar_url: string;
  cover_image_url: string;
  contact_email: string;
  instagram_handle: string;
}

interface Artwork {
  id: string;
  title: string;
  medium: string;
  price: number;
  availability_status: string;
  is_one_of_a_kind: boolean;
  images: string[];
  artist_id: string;
}

interface VenueArtwork {
  id: string;
  venue_id: string;
  artwork_id: string;
  venue_name: string;
  venue_city: string;
  venue_type: string;
  artwork_title: string;
}

interface PageProps {
  params: {
    username: string;
  };
}

export default function ArtistProfilePage({ params }: PageProps) {
  const supabase = createClient();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [venueArtworks, setVenueArtworks] = useState<VenueArtwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    loadArtistData();
  }, [params.username]);

  async function loadArtistData() {
    setLoading(true);
    try {
      // Load artist
      const { data: artistData } = await supabase
        .from("artists")
        .select("*")
        .eq("username", params.username)
        .single();

      if (!artistData) {
        setLoading(false);
        return;
      }

      setArtist(artistData);

      // Load artworks
      const { data: artworksData } = await supabase
        .from("artworks")
        .select("*")
        .eq("artist_id", artistData.id);

      setArtworks(artworksData || []);

      // Load venue connections
      const { data: venueArtworksData } = await supabase
        .from("venue_artworks")
        .select(
          `id, venue_id, artwork_id,
           venues(name, city, type, id),
           artworks(title, artist_id)`
        )
        .eq("artworks.artist_id", artistData.id);

      if (venueArtworksData) {
        setVenueArtworks(
          venueArtworksData.map((va: any) => ({
            ...va,
            venue_name: va.venues?.name || "",
            venue_city: va.venues?.city || "",
            venue_type: va.venues?.type || "",
            artwork_title: va.artworks?.title || "",
          }))
        );
      }
    } catch (error) {
      console.error("Error loading artist data:", error);
    } finally {
      setLoading(false);
    }
  }

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

  const availableWorksCount = artworks.filter(
    (a) => a.availability_status === "available"
  ).length;

  const uniqueVenues = Array.from(
    new Set(venueArtworks.map((v) => v.venue_id))
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Artist not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative h-96 bg-gray-100 overflow-hidden">
        <img
          src={
            artist.cover_image_url ||
            "https://images.unsplash.com/photo-1578321272176-1d4d4a896b65?w=1200&h=400&fit=crop"
          }
          alt={artist.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold text-white mb-2">
              {artist.name}
            </h1>
            <div className="flex items-center gap-4 text-white">
              <div className="flex items-center gap-1">
                <MapPin className="w-5 h-5" />
                <span>
                  {artist.city}, {artist.country}
                </span>
              </div>
              <span className="text-gray-200">•</span>
              <span>{artist.medium}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {artworks.length}
              </div>
              <p className="text-sm text-gray-600">Artworks</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {uniqueVenues}
              </div>
              <p className="text-sm text-gray-600">Venues</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">
                {availableWorksCount}
              </div>
              <p className="text-sm text-gray-600">Available Works</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={() => setFollowed(!followed)}
            className={
              "px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors " +
              (followed
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50")
            }
          >
            <Heart className="w-5 h-5" fill={followed ? "currentColor" : "none"} />
            {followed ? "Following" : "Follow"}
          </button>
          {artist.contact_email && (
            <a
              href={`mailto:${artist.contact_email}`}
              className="px-4 py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Contact
            </a>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Bio Section */}
        <div className="mb-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">{artist.bio}</p>
          {artist.style_tags && artist.style_tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {artist.style_tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          {artist.instagram_handle && (
            <a
              href={`https://instagram.com/${artist.instagram_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Instagram className="w-5 h-5" />
              @{artist.instagram_handle}
            </a>
          )}
        </div>

        {/* Artworks Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Artworks</h2>
          {artworks.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 rounded-lg">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No artworks yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artworks.map((artwork) => (
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
                      <Heart className="w-5 h-5 text-gray-300 hover:text-red-500 transition-colors" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Venues Section */}
        {venueArtworks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Venues Showing Work
            </h2>
            <div className="flex gap-6 overflow-x-auto pb-4">
              {venueArtworks.map((va) => (
                <div
                  key={va.id}
                  className="flex-shrink-0 w-80 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {va.venue_name}
                    </h3>
                    <span
                      className={
                        "px-2 py-1 rounded text-xs font-medium " +
                        getVenueTypeColor(va.venue_type)
                      }
                    >
                      {va.venue_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{va.venue_city}</p>
                  <p className="text-sm text-indigo-600 font-medium">
                    {va.artwork_title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
