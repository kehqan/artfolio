import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Globe, ImageIcon } from "lucide-react";

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  available: { label: "Available", bg: "#DCFCE7", color: "#166534" },
  Available: { label: "Available", bg: "#DCFCE7", color: "#166534" },
  sold:      { label: "Sold",      bg: "#111110", color: "#FFD400" },
  Sold:      { label: "Sold",      bg: "#111110", color: "#FFD400" },
  reserved:  { label: "Reserved",  bg: "#FEF9C3", color: "#854D0E" },
  Reserved:  { label: "Reserved",  bg: "#FEF9C3", color: "#854D0E" },
};

const SALE_METHOD_LABEL: Record<string, { icon: string; label: string }> = {
  direct:           { icon: "🛒", label: "Direct Purchase"  },
  inquiry:          { icon: "✉️", label: "Inquiry Only"      },
  price_on_request: { icon: "💬", label: "Price on Request"  },
  auction:          { icon: "🔨", label: "Auction"           },
  not_for_sale:     { icon: "🚫", label: "Not for Sale"      },
};

export default async function PublicProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const supabase = createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single();

  if (profileError || !profile) notFound();

  const [
    artworksRes,
    exhibitionsRes,
    collabsRes,
    postsRes,
    followerRes,
    artworkCountRes,
  ] = await Promise.all([
    supabase
      .from("artworks")
      .select("id, title, status, images, price, medium, year, sale_method")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("exhibitions")
      .select("id, title, venue, start_date, end_date, status, cover_image")
      .eq("user_id", profile.id)
      .eq("is_public", true)
      .limit(6),
    supabase
      .from("collaborations")
      .select("id, title, type, status, partner_name, description")
      .eq("user_id", profile.id)
      .limit(6),
    supabase
      .from("posts")
      .select("id, content, images, created_at")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(9),
    supabase
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("artworks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id),
  ]);

  const artworks     = artworksRes.data     ?? [];
  const exhibitions  = exhibitionsRes.data  ?? [];
  const collabs      = collabsRes.data      ?? [];
  const posts        = postsRes.data        ?? [];
  const followers    = followerRes.count    ?? 0;
  const artworkCount = artworkCountRes.count ?? 0;

  function fmtDate(d: string | null | undefined) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const profileName    = (profile.full_name    as string | null) ?? "";
  const profileBio     = (profile.bio          as string | null) ?? null;
  const profileLoc     = (profile.location     as string | null) ?? null;
  const profileAvatar  = (profile.avatar_url   as string | null) ?? null;
  const profileRole    = (profile.role         as string | null) ?? null;
  const profileWebsite = (profile.website      as string | null) ?? null;

  const postsWithImages = posts.filter(
    (p) => Array.isArray(p.images) && (p.images as string[]).length > 0
  );

  return (
    <div style={{ minHeight: "100vh", background: "#FFFBEA" }}>

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 10, background: "#111110", borderBottom: "3px solid #111110", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: 56 }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: "#FFD400" }}>Artfolio ✦</span>
        </Link>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <button style={{ padding: "7px 14px", border: "2px solid #444", borderRadius: 6, background: "transparent", color: "#aaa", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Sign in</button>
          </Link>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <button style={{ padding: "7px 14px", border: "2px solid #FFD400", borderRadius: 6, background: "#FFD400", color: "#111110", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Join free</button>
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 64px" }}>

        {/* HERO */}
        <div style={{ display: "flex", gap: 36, alignItems: "flex-start", paddingTop: 48, paddingBottom: 40, borderBottom: "2px solid #111110", marginBottom: 40, flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0 }}>
            {profileAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profileAvatar} alt={profileName} style={{ width: 110, height: 110, borderRadius: "50%", objectFit: "cover", border: "3px solid #111110", boxShadow: "4px 4px 0 #111110" }} />
            ) : (
              <div style={{ width: 110, height: 110, borderRadius: "50%", background: "#FFD400", border: "3px solid #111110", boxShadow: "4px 4px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 900, color: "#111110" }}>
                {profileName ? profileName[0].toUpperCase() : "A"}
              </div>
            )}
          </div>

          {/* Identity */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", margin: 0 }}>{profileName}</h1>
              {profileRole && (
                <span style={{ padding: "3px 12px", border: "2px solid #111110", borderRadius: 20, fontSize: 11, fontWeight: 800, background: "#FFD400", color: "#111110", textTransform: "capitalize" }}>{profileRole}</span>
              )}
            </div>
            {profileLoc && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#9B8F7A", marginBottom: 12 }}>
                <MapPin size={13} /> {profileLoc}
              </div>
            )}
            {profileBio && (
              <p style={{ fontSize: 14, color: "#5C5346", lineHeight: 1.7, maxWidth: 540, marginBottom: 20 }}>{profileBio}</p>
            )}
            {profileWebsite && (
              <div style={{ marginBottom: 20 }}>
                <a href={profileWebsite} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "2px solid #111110", borderRadius: 6, background: "#fff", color: "#111110", fontWeight: 700, fontSize: 11, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                    <Globe size={11} /> Website
                  </button>
                </a>
              </div>
            )}

            {/* Stats */}
            <div style={{ display: "flex", gap: 0, border: "2px solid #111110", width: "fit-content" }}>
              {[
                { label: "Artworks",    value: artworkCount },
                { label: "Exhibitions", value: exhibitions.length },
                { label: "Followers",   value: followers },
              ].map((s, i) => (
                <div key={s.label} style={{ padding: "12px 20px", borderRight: i < 2 ? "2px solid #111110" : "none", background: "#fff", minWidth: 80, textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#111110" }}>{s.value}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ARTWORKS — Each card is clickable ── */}
        {artworks.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 18 }}>Works</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {artworks.map((a) => {
                const cfg = STATUS_CFG[a.status as string ?? ""] ?? { label: a.status, bg: "#F5F0E8", color: "#5C5346" };
                const imgs = Array.isArray(a.images) ? a.images as string[] : [];
                const img  = imgs[0] ?? null;
                const saleM = a.sale_method as string | null;
                const saleTag = saleM ? SALE_METHOD_LABEL[saleM] : null;

                return (
                  // ── CLICKABLE LINK to individual artwork page ──
                  <Link
                    key={a.id}
                    href={`/portfolio/${params.username}/artwork/${a.id}`}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div
                      style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "3px 3px 0 #111110", transition: "transform 0.12s, box-shadow 0.12s", cursor: "pointer" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; }}
                    >
                      {/* Image */}
                      <div style={{ aspectRatio: "1/1", background: "#F5F0E8", position: "relative" }}>
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt={a.title as string} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <ImageIcon size={28} color="#9B8F7A" />
                          </div>
                        )}
                        {/* Sale method overlay badge */}
                        {saleTag && (
                          <div style={{ position: "absolute", top: 8, right: 8, background: "#fff", border: "1.5px solid #111110", borderRadius: 4, padding: "2px 7px", fontSize: 9, fontWeight: 800, color: "#111110", display: "flex", alignItems: "center", gap: 3 }}>
                            <span>{saleTag.icon}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {a.title as string}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: cfg.bg, color: cfg.color, textTransform: "uppercase", flexShrink: 0 }}>
                            {cfg.label}
                          </span>
                          {typeof a.price === "number" && (a.status as string)?.toLowerCase() === "available" && (
                            <span style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#5C5346" }}>
                              ${(a.price as number).toLocaleString()}
                            </span>
                          )}
                        </div>
                        {/* Sale method label */}
                        {saleTag && (
                          <div style={{ fontSize: 10, color: "#9B8F7A", marginTop: 5, display: "flex", alignItems: "center", gap: 3 }}>
                            <span>{saleTag.icon}</span> {saleTag.label}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* EXHIBITIONS */}
        {exhibitions.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 18 }}>Exhibitions</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {exhibitions.map((ex) => (
                <div key={ex.id} style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "3px 3px 0 #111110" }}>
                  <div style={{ height: 100, background: "#F5F0E8" }}>
                    {ex.cover_image
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={ex.cover_image as string} alt={ex.title as string} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🏛</div>
                    }
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", marginBottom: 4 }}>{ex.title as string}</div>
                    {ex.venue && <div style={{ fontSize: 11, color: "#9B8F7A" }}>{ex.venue as string}</div>}
                    {(ex.start_date || ex.end_date) && (
                      <div style={{ fontSize: 11, color: "#9B8F7A", marginTop: 2 }}>
                        {fmtDate(ex.start_date as string | null)}{ex.end_date ? ` — ${fmtDate(ex.end_date as string | null)}` : ""}
                      </div>
                    )}
                    <span style={{ display: "inline-block", marginTop: 8, fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: String(ex.status).toLowerCase() === "current" ? "#FFD400" : "#F5F0E8", color: "#111110", textTransform: "uppercase" }}>
                      {ex.status as string}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* COLLABORATIONS */}
        {collabs.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 18 }}>Collaborations</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {collabs.map((c) => (
                <div key={c.id} style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, padding: "14px 16px", boxShadow: "3px 3px 0 #111110" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#111110", flex: 1 }}>{c.title as string}</span>
                    {c.type && <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: "#F5F0E8", color: "#5C5346", textTransform: "uppercase", flexShrink: 0 }}>{c.type as string}</span>}
                  </div>
                  {c.description && <p style={{ fontSize: 12, color: "#9B8F7A", lineHeight: 1.5 }}>{c.description as string}</p>}
                  {c.partner_name && <div style={{ fontSize: 11, color: "#5C5346", marginTop: 6 }}>With: <strong>{c.partner_name as string}</strong></div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* POSTS */}
        {postsWithImages.length > 0 && (
          <section style={{ marginBottom: 52 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#111110", marginBottom: 18 }}>Posts</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {postsWithImages.map((p) => {
                const imgs = p.images as string[];
                return (
                  <div key={p.id} style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "3px 3px 0 #111110" }}>
                    <div style={{ aspectRatio: "1/1" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgs[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    {p.content && (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "#5C5346", lineHeight: 1.5 }}>
                        {String(p.content).length > 80 ? String(p.content).slice(0, 80) + "…" : String(p.content)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* EMPTY */}
        {artworks.length === 0 && exhibitions.length === 0 && collabs.length === 0 && (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 6 }}>{profileName}&apos;s portfolio is taking shape</div>
            <div style={{ fontSize: 13, color: "#9B8F7A" }}>No public works yet — check back soon.</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #E0D8CA", paddingTop: 20, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
          <span>Artfolio ✦ {new Date().getFullYear()}</span>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <span style={{ color: "#111110", fontWeight: 800 }}>Join Artfolio →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
