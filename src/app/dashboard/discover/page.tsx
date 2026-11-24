"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, MapPin, UserCheck, UserPlus } from "lucide-react";
import { Avatar, Button, ButtonLink, Card, Chip, EmptyState, PageHeader, SearchField, Skeleton } from "@/components/ui";

type Profile = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  artwork_count?: number; follower_count?: number; is_following?: boolean;
};
type Filter = "all" | "artist" | "venue";

const isVenue = (r?: string) => r === "venue" || r === "gallery";

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); loadProfiles(user.id); } else setLoading(false);
    });
  }, []);

  async function loadProfiles(me: string) {
    const sb = createClient();
    const [{ data: rows }, { data: follows }] = await Promise.all([
      sb.from("profiles").select("id, full_name, username, role, bio, location, avatar_url")
        .neq("id", me).not("full_name", "is", null).neq("full_name", "").limit(50),
      sb.from("followers").select("following_id").eq("follower_id", me),
    ]);
    if (!rows) { setLoading(false); return; }
    const following = new Set(follows?.map(f => f.following_id) || []);
    const enriched = await Promise.all(rows.map(async (p: Profile) => {
      const [{ count: artwork_count }, { count: follower_count }] = await Promise.all([
        sb.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", p.id),
        sb.from("followers").select("*", { count: "exact", head: true }).eq("following_id", p.id),
      ]);
      return { ...p, artwork_count: artwork_count || 0, follower_count: follower_count || 0, is_following: following.has(p.id) };
    }));
    setProfiles(enriched);
    setLoading(false);
  }

  async function toggleFollow(target: Profile) {
    if (!userId) return;
    setFollowLoading(target.id); setError("");
    const sb = createClient();
    const { error: err } = target.is_following
      ? await sb.from("followers").delete().eq("follower_id", userId).eq("following_id", target.id)
      : await sb.from("followers").insert({ follower_id: userId, following_id: target.id });
    if (err) {
      setError("That didn't go through. Please try again.");
    } else {
      setProfiles(prev => prev.map(p => p.id === target.id ? {
        ...p, is_following: !p.is_following,
        follower_count: Math.max(0, (p.follower_count || 0) + (p.is_following ? -1 : 1)),
      } : p));
    }
    setFollowLoading(null);
  }

  const q = search.toLowerCase().trim();
  const filtered = profiles.filter(p => {
    const matchSearch = !q || [p.full_name, p.username, p.location].some(v => (v || "").toLowerCase().includes(q));
    const matchFilter = filter === "all" || (filter === "venue" ? isVenue(p.role) : p.role === "artist");
    return matchSearch && matchFilter;
  });
  const counts = {
    all: profiles.length,
    artist: profiles.filter(p => p.role === "artist").length,
    venue: profiles.filter(p => isVenue(p.role)).length,
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Artists and venues"
        description="Find people in the scene and follow the ones you want to keep up with."
        actions={<ButtonLink href="/explore" target="_blank" variant="secondary"><ExternalLink size={15} aria-hidden /> Public Explore</ButtonLink>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField value={search} onChange={setSearch} placeholder="Search by name or city" className="sm:w-80" />
        <div className="flex gap-2" role="group" aria-label="Show">
          {([["all", "Everyone"], ["artist", "Artists"], ["venue", "Venues"]] as [Filter, string][]).map(([k, label]) => (
            <Chip key={k} selected={filter === k} onClick={() => setFilter(k)}>
              {label} <span className="tabular-nums opacity-70">{counts[k]}</span>
            </Chip>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="font-ui text-body-sm text-bad">{error}</p>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-card" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={q ? "No one matches that" : "No one here yet"}
          description={q ? "Try a shorter name or a different city." : "As more artists and venues join, they show up here."}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(p => {
            const href = p.username ? `/${p.username}` : null;
            return (
              <li key={p.id}>
                <Card padding="md" className="flex h-full flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={p.full_name || "Member"} src={p.avatar_url} size="md" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      {href ? (
                        <Link href={href} target="_blank" className="truncate font-ui text-body font-semibold text-fg hover:underline hover:underline-offset-4">{p.full_name}</Link>
                      ) : (
                        <span className="truncate font-ui text-body font-semibold text-fg">{p.full_name}</span>
                      )}
                      <span className="flex items-center gap-1.5 truncate font-ui text-body-sm text-fg-3">
                        {isVenue(p.role) ? "Venue" : "Artist"}
                        {p.location && <><span aria-hidden>·</span><MapPin size={12} aria-hidden className="shrink-0" />{p.location}</>}
                      </span>
                    </div>
                  </div>
                  {p.bio && <p className="line-clamp-2 font-ui text-body-sm text-fg-2">{p.bio}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 border-t-hair border-line pt-3">
                    <span className="font-ui text-body-sm tabular-nums text-fg-3">
                      {!isVenue(p.role) && <>{p.artwork_count} {p.artwork_count === 1 ? "work" : "works"} · </>}
                      {p.follower_count} {p.follower_count === 1 ? "follower" : "followers"}
                    </span>
                    <Button
                      size="sm"
                      variant={p.is_following ? "ghost" : "secondary"}
                      onClick={() => toggleFollow(p)}
                      disabled={followLoading === p.id}
                      aria-pressed={!!p.is_following}
                    >
                      {p.is_following ? <><UserCheck size={14} aria-hidden /> Following</> : <><UserPlus size={14} aria-hidden /> Follow</>}
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
