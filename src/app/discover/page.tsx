"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Heart,
  MapPin,
  Tag,
  DollarSign,
  Sparkles,
  AlertCircle,
} from "lucide-react";

type TabType = "artworks" | "artists" | "venues" | "board";

interface Artwork {
  id: string;
  title: string;
  medium: string;
  dimensions: string;
  price: number;
  availability_status: string;
  is_one_of_a_kind: boolean;
  images: string[];
  artist_id: string;
  artist_name: string;
  artist_username: string;
  venue_location: string;
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
  venue_name: string;
  venue_city: string;
  venue_type: string;
}

export default function DiscoverPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<TabType>("artworks");
  const [search, setSearch] = useState("");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [requests, setRequests] = useState<DiscoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load artworks
      const { data: artworksData } = await supabase
        .from("artworks")
        .select(
          `id, title, medium, dimensions, price, availability_status, is_one_of_a_kind, images, artist_id, venue_location,
           artists(name, username)`
        )
        .not("artist_id", "is", null);

      if (artworksData) {
        setArtworks(
          artworksData.map((a: any) => ({
            ...a,
            artist_name: a.artists?.name || "Unknown",
            artist_username: a.artists?.username || "",
          }))
        );
      }

      // Load artists
      const { data: artistsData } = await supabase
        .from("artists")
        .select("id, name, username, city, country, medium, style_tags, avatar_url");
      setArtists(artistsData || []);

      // Load venues
      const { data: venuesData } = await supabase
        .from("venues")
        .select("id, name, type, city, description, cover_image_url");
      setVenues(venuesData || []);

      // Load discovery requests
      const { data: requestsData } = await supabase
        .from("discovery_requests")
        .select(
          `id, title, description, style_tags, budget_min, budget_max, deadline, status, venue_id,
           venues(name, city, type)`
        )
        .eq("status", "open");

      if (requestsData) {
        setRequests(
          requestsData.map((r: any) => ({
            ...r,
            venue_name: r.venues?.name || "",
            venue_city: r.venues?.city || "",
            venue_type: r.venues?.type || "",
          }))
        );
      }
    } catch (error) {
      console.error("Error loading data:", error);
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

  const filteredArtworks = artworks.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.artist_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredArtists = artists.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.username.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVenues = venues.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Search Bar */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search artworks, artists, venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 px-6 sticky top-28 z-30 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-8">
            {(["artworks", "artists", "venues", "board"] as const).map(
              (tab) => (
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
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading...</div>
          </div>
        ) : (
          <>
            {/* Artworks Tab */}
            {activeTab === "artworks" && (
              <div>
                {filteredArtworks.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No artworks found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredArtworks.map((artwork) => (
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
                            <Heart className="w-5 h-5 text-gray-300 hover:text-red-500 transition-colors" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Artists Tab */}
            {activeTab === "artists" && (
              <div>
                {filteredArtists.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No artists found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredArtists.map((artist) => (
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
                              <div className="flex gap-1 flex-wrap justify-center mb-3">
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
                          <p className="text-xs text-gray-500">0 followers</p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Venues Tab */}
            {activeTab === "venues" && (
              <div>
                {filteredVenues.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No venues found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVenues.map((venue) => (
                      <a
                        key={venue.id}
                        href={`/venues/${venue.id}`}
                        className="group cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
                      >
                        <div className="relative bg-gray-100 aspect-video overflow-hidden">
                          <img
                            src={
                              venue.cover_image_url ||
                              "https://images.unsplash.com/photo-1578926078328-123456789012?w=500&h=300&fit=crop"
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

            {/* Board Tab */}
            {activeTab === "board" && (
              <div>
                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No open requests</p>
                  </div>
                ) : (
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
                              <span
                                className={
                                  "px-3 py-1 rounded-full text-xs font-medium " +
                                  getVenueTypeColor(request.venue_type)
                                }
                              >
                                {request.venue_type}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Open
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {request.venue_name}, {request.venue_city}
                            </p>
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
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
