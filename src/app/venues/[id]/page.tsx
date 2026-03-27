"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Heart,
  MapPin,
  Globe,
  Instagram,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface Venue {
  id: string;
  name: string;
  type: string;
  city: string;
  country: string;
  description: string;
  address: string;
  cover_image_url: string;
  website_url: string;
  instagram_handle: string;
}

interface VenueArtwork {
  id: string;
  artwork_id: string;
  venue_id: string;
  title: string;
  images: string[];
  medium: string;
  price: number;
  availability_status: string;
  is_one_of_a_kind: boolean;
  artist_name: string;
  artist_username: string;
  artist_avatar: string;
}

interface DiscoveryRequest {
  id: string;
  title: string;
  description: string;
  style_tags: string[];
  budget_min: number;
  budget_max: number;
  deadline: string;
  status: string;
  venue_id: string;
}

interface PageProps {
  params: {
    id: string;
  };
}

export default function VenueProfilePage({ params }: PageProps) {
  const supabase = createClient();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [artworks, setArtworks] = useState<VenueArtwork[]>([]);
  const [requests, setRequests] = useState<DiscoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);

  useEffect(() => {
    loadVenueData();
  }, [params.id]);

  async function loadVenueData() {
    setLoading(true);
    try {
      // Load venue
      const { data: venueData } = await supabase
        .from("venues")
        .select("*")
        .eq("id", params.id)
        .single();

      if (!venueData) {
        setLoading(false);
        return;
      }

      setVenue(venueData);

      // Load venue's artworks
      const { data: venueArtworksData } = await supabase
        .from("venue_artworks")
        .select(
          `id, artwork_id,
           artworks(id, title, images, medium, price, availability_status, is_one_of_a_kind, artist_id,
             artists(name, username, avatar_url))`
        )
        .eq("venue_id", params.id);

      if (venueArtworksData) {
        setArtworks(
          venueArtworksData
            .filter((va: any) => va.artworks)
            .map((va: any) => ({
              id: va.id,
              ...va.artworks,
              artist_name: va.artworks.artists?.name || "Unknown",
              artist_username: va.artworks.artists?.username || "",
              artist_avatar: va.artworks.artists?.avatar_url || "",
            }))
        );
      }

      // Load discovery requests
      const { data: requestsData } = await supabase
        .from("discovery_requests")
        .select("*")
        .eq("venue_id", params.id)
        .eq("status", "open");

      setRequests(requestsData || []);
    } catch (error) {
      console.error("Error loading venue data:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatPrice = (price: number) => {
    return "$" + price.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
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

  if (!venue) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Venue not found</p>
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
            venue.cover_image_url ||
            "https://images.unsplash.com/photo-1578321272176-1d4d4a896b65?w=1200&h=400&fit=crop"
          }
          alt={venue.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end gap-4">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  {venue.name}
                </h1>
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-5 h-5" />
                    <span>{venue.city}</span>
                  </div>
                </div>
              </div>
              <span
                className={
                  "px-4 py-2 rounded-full font-medium " +
                  getVenueTypeColor(venue.type)
                }
              >
                {venue.type}
              </span>
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
          <button className="px-4 py-2 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Contact
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* About Section */}
        <div className="mb-16 max-w-3xl">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
          <p className="text-gray-700 mb-6 leading-relaxed">{venue.description}</p>

          <div className="space-y-3 text-gray-700">
            {venue.address && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{venue.address}</span>
              </div>
            )}
            {venue.website_url && (
              <a
                href={venue.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-indigo-600 hover:text-indigo-700"
              >
                <Globe className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{venue.website_url}</span>
              </a>
            )}
            {venue.instagram_handle && (
              <a
                href={`https://instagram.com/${venue.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 text-indigo-600 hover:text-indigo-700"
              >
                <Instagram className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>@{venue.instagram_handle}</span>
              </a>
            )}
          </div>
        </div>

        {/* Current Collection */}
        {artworks.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Current Collection
            </h2>
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
                    <div className="flex items-start gap-3 mb-3">
                      {artwork.artist_avatar ? (
                        <img
                          src={artwork.artist_avatar}
                          alt={artwork.artist_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {artwork.artist_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/artists/${artwork.artist_username}`}
                          className="text-sm text-gray-600 hover:text-indigo-600 transition-colors"
                        >
                          {artwork.artist_name}
                        </a>
                        <p className="text-xs text-gray-500">
                          @{artwork.artist_username}
                        </p>
                      </div>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {artwork.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                      {artwork.medium}
                    </p>
                    <span className="font-bold text-lg text-gray-900">
                      {formatPrice(artwork.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Calls */}
        {requests.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Open Calls for Artists
            </h2>
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {request.title}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Open
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{request.description}</p>

                  {request.style_tags && request.style_tags.length > 0 && (
                    <div className="flex gap-2 mb-4 flex-wrap">
                      {request.style_tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Budget:{" "}
                      <span className="font-semibold text-gray-900">
                        {formatPrice(request.budget_min)} -{" "}
                        {formatPrice(request.budget_max)}
                      </span>
                      {" • Deadline: "}
                      <span className="font-semibold text-gray-900">
                        {formatDate(request.deadline)}
                      </span>
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                      Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
