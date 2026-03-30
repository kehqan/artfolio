import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Globe, Instagram, Mail, ImageIcon, ExternalLink } from "lucide-react";

export default async function PublicProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();

  // Find profile by username
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  // Parallel data fetch
  const [
    { data: artworks },
    { data: exhibitions },
    { data: collabs },
    { data: collections },
    { data: posts },
    { count: followerCount },
    { count: artworkCount },
  ] = await Promise.all([
    supabase.from("artworks").select("id, title, status, images, price, medium, year").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("exhibitions").select("id, title, venue, start_date, end_date, status, cover_image").eq("user_id", profile.id).eq("is_public", true).limit(6),
    supabase.from("collaborations").select("id, title, type, status, partner_name, description").eq("user_id", profile.id).limit(6),
    supabase.from("collections").select("id, name, description").eq("user_id", profile.id).eq("is_public", true).limit(4),
    supabase.from("posts").select("id, content, images, created_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(9),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("artworks").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);

  const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
    available: { bg: "#DCFCE7", color: "#166534" },
    Available: { bg: "#DCFCE7", color: "#166534" },
    sold:      { bg: "#111110", color: "#FFD400" },
    Sold:      { bg: "#111110", color: "#FFD400" },
    reserved:  { bg: "#FEF9C3", color: "#854D0E" },
    Reserved:  { bg: "#FEF9C3", color: "#854D0E" },
  };

  function timeAgo(dateStr: string) {
    const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (d === 0) return "Today";
    if (d === 1) return "Yesterday";
    if (d < 30) return `${d}d ago`;
    return `${Math.floor(d / 30)}mo ago`;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFFBEA" }}>

      {/* ── NAV ── */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#111110", borderBottom: "3px solid #111110",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 56,
      }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#FFD400", letterSpacing: "-0.3px" }}>Artfolio ✦</span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <button style={{ padding: "7px 14px", border: "2px solid #444", borderRadius: 6, background: "transparent", color: "#aaa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign in</button>
          </Link>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <button style={{ padding: "7px 14px", border: "2px solid #FFD400", borderRadius: 6, background: "#FFD400", color: "#111110", fontWeight: 800, fontSize: 12, cursor: "pointer", boxShadow: "2px 2px 0 #FFD400" }}>Join free</button>
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 48px" }}>

        {/* ── HERO HEADER ── */}
        <div style={{
          display: "grid", gridTemplateColumns: "260px 1fr",
          gap: 32, paddingTop: 40, paddingBottom: 36,
          borderBottom: "2px solid #111110", marginBottom: 36,
        }}>
          {/* Avatar + identity */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
            <div style={{ position: "relative" }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid #111110", boxShadow: "4px 4px 0 #111110" }} />
                : <div style={{ width: 120, height: 120, borderRadius: "50%", background: "#FFD400", border: "3px solid #111110", boxShadow: "4px 4px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 42, fontWeight: 900, color: "#111110" }}>
                    {profile.full_name?.[0]?.toUpperCase() || "A"}
                  </div>
              }
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 4 }}>
                {profile.full_name}
              </h1>
              {profile.role && (
                <span style={{ display: "inline-block", padding: "3px 12px", border: "2px solid #111110", borderRadius: 20, fontSize: 11, fontWeight: 800, background: "#FFD400", color: "#111110", marginBottom: 6, textTransform: "capitalize" }}>
                  {profile.role}
                </span>
              )}
              {profile.location && (
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9B8F7A", marginTop: 4 }}>
                  <MapPin size={12} /> {profile.location}
                </div>
              )}
            </div>

            {/* Social links */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {profile.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "2px solid #111110", borderRadius: 6, background: "#fff", color: "#111110", fontWeight: 700, fontSize: 11, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                    <Globe size={11} /> Website
                  </button>
                </a>
              )}
              {profile.username && (
                <a href={`https://instagram.com/${profile.username}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "2px solid #111110", borderRadius: 6, background: "#fff", color: "#111110", fontWeight: 700, fontSize: 11, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                    <Instagram size={11} /> @{profile.username}
                  </button>
                </a>
              )}
            </div>
          </div>

          {/* Bio + stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {profile.bio && (
              <p style={{ fontSize: 15, color: "#5C5346", lineHeight: 1.7, maxWidth: 560 }}>{profile.bio}</p>
            )}

            {/* Stats row */}
            <div style={{ display: "flex", gap: 0, borderTop: "2px solid #111110", borderLeft: "2px solid #111110" }}>
              {[
                { label: "Artworks", value: artworkCount ?? 0 },
                { label: "Exhibitions", value: (exhibitions ?? []).length },
                { label: "Followers",  value: followerCount ?? 0 },
                { label: "Collections", value: (collections ?? []).length },
              ].map(stat => (
                <div key={stat.label} style={{
                  flex: 1, padding: "14px 18px",
                  borderRight: "2px solid #111110", borderBottom: "2px solid #111110",
                  background: "#fff",
                }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px" }}>{stat.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ARTWORKS ── */}
        {(artworks ?? []).length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110" }}>Works</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {artworks!.map(a => {
                const cfg = STATUS_BADGE[a.status] ?? { bg: "#F5F0E8", color: "#5C5346" };
                return (
                  <div key={a.id} style={{
                    background: "#fff", border: "2px solid #111110",
                    borderRadius: 8, overflow: "hidden",
                    boxShadow: "3px 3px 0 #111110",
                    transition: "transform 0.1s, box-shadow 0.1s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "translate(-2px,-2px)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "5px 5px 0 #111110";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = "";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "3px 3px 0 #111110";
                  }}>
                    <div style={{ aspectRatio: "1/1", background: "#F5F0E8" }}>
                      {a.images?.[0]
                        ? <img src={a.images[0]} alt={a.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={28} color="#9B8F7A" /></div>
                      }
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: cfg.bg, color: cfg.color, textTransform: "uppercase" }}>
                          {a.status}
                        </span>
                        {a.price && a.status?.toLowerCase() === "available" && (
                          <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#5C5346" }}>${a.price.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── EXHIBITIONS ── */}
        {(exhibitions ?? []).length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 18 }}>Exhibitions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {exhibitions!.map(ex => (
                <div key={ex.id} style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "3px 3px 0 #111110" }}>
                  <div style={{ height: 100, background: "#F5F0E8" }}>
                    {ex.cover_image
                      ? <img src={ex.cover_image} alt={ex.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏛</div>
                    }
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", marginBottom: 4 }}>{ex.title}</div>
                    {ex.venue && <div style={{ fontSize: 11, color: "#9B8F7A" }}>{ex.venue}</div>}
                    {ex.start_date && (
                      <div style={{ fontSize: 11, color: "#9B8F7A", marginTop: 2 }}>
                        {new Date(ex.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {ex.end_date && ` — ${new Date(ex.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </div>
                    )}
                    <span style={{ display: "inline-block", marginTop: 8, fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: ex.status?.toLowerCase() === "current" ? "#FFD400" : "#F5F0E8", color: "#111110", textTransform: "uppercase" }}>
                      {ex.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── COLLABORATIONS ── */}
        {(collabs ?? []).length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 18 }}>Collaborations</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {collabs!.map(c => (
                <div key={c.id} style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, padding: "14px 16px", boxShadow: "3px 3px 0 #111110" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", flex: 1 }}>{c.title}</div>
                    {c.type && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: "#F5F0E8", color: "#5C5346", textTransform: "uppercase", flexShrink: 0 }}>{c.type}</span>}
                  </div>
                  {c.description && <p style={{ fontSize: 12, color: "#9B8F7A", lineHeight: 1.5, marginBottom: 8 }}>{c.description}</p>}
                  {c.partner_name && <div style={{ fontSize: 11, color: "#5C5346" }}>With: <strong>{c.partner_name}</strong></div>}
                  <span style={{ display: "inline-block", marginTop: 8, fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: c.status?.toLowerCase() === "open" ? "#DCFCE7" : "#F5F0E8", color: c.status?.toLowerCase() === "open" ? "#166534" : "#5C5346", textTransform: "uppercase" }}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── POSTS ── */}
        {(posts ?? []).length > 0 && (
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 18 }}>Posts</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              {posts!.filter(p => p.images && p.images.length > 0).map(p => (
                <div key={p.id} style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "3px 3px 0 #111110" }}>
                  {p.images!.length > 0 && (
                    <div style={{ aspectRatio: "1/1" }}>
                      <img src={p.images![0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  {p.content && (
                    <div style={{ padding: "10px 12px", fontSize: 12, color: "#5C5346", lineHeight: 1.5 }}>
                      {p.content.length > 80 ? p.content.slice(0, 80) + "…" : p.content}
                    </div>
                  )}
                  <div style={{ padding: "6px 12px 10px", fontSize: 10, color: "#9B8F7A" }}>{timeAgo(p.created_at)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {(artworks ?? []).length === 0 && (exhibitions ?? []).length === 0 && (collabs ?? []).length === 0 && (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>{profile.full_name}&apos;s portfolio is taking shape</div>
            <div style={{ fontSize: 13, color: "#9B8F7A" }}>No public works yet — check back soon.</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "2px solid #E0D8CA", paddingTop: 20, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
          <span>Artfolio ✦ {new Date().getFullYear()}</span>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <span style={{ color: "#111110", fontWeight: 800, cursor: "pointer" }}>Join Artfolio →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
