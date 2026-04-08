"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin, Globe, ExternalLink, X, ChevronLeft, ChevronRight,
  ImageIcon, Star, ShoppingBag, Mail, Handshake, CalendarDays,
  ArrowRight, Copy, Check, Palette, Building2, Users,
} from "lucide-react";

/* ── Types ────────────────────────────────────────────────────── */
type StoreSettings = {
  store_name: string; tagline: string; accent_color: string;
  banner_url: string; show_bio: boolean; show_collabs: boolean;
  show_events: boolean; show_location: boolean; layout: string;
  is_active: boolean;
};

type Profile = {
  id: string; full_name: string; username: string; bio?: string;
  location?: string; avatar_url?: string; website?: string;
  role?: string; email?: string;
};

type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  description?: string; price?: number; currency?: string;
  status: string; images?: string[]; sale_method?: string;
  width_cm?: number; height_cm?: number; depth_cm?: number;
  framed?: boolean; editions?: number;
};

type StoreArtworkEntry = {
  artwork_id: string; sort_order: number; featured: boolean;
};

type Collab = {
  id: string; title: string; type?: string; status: string;
  partner_name?: string; description?: string;
};

type Exhibition = {
  id: string; title: string; venue?: string; start_date?: string;
  end_date?: string; status: string;
};

const SALE_METHOD_CFG: Record<string, { icon: string; label: string; color: string }> = {
  direct:           { icon: "🛒", label: "Buy Now",          color: "#16A34A" },
  inquiry:          { icon: "✉️", label: "Inquiry",          color: "#0EA5E9" },
  price_on_request: { icon: "💬", label: "Price on Request", color: "#CA8A04" },
  auction:          { icon: "🔨", label: "Auction",          color: "#8B5CF6" },
  not_for_sale:     { icon: "🚫", label: "Not for Sale",     color: "#9B8F7A" },
};

/* ══════════════════════════════════════════════════════════════════ */
export default function PublicStorePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username;

  const [profile, setProfile]     = useState<Profile | null>(null);
  const [settings, setSettings]   = useState<StoreSettings | null>(null);
  const [artworks, setArtworks]   = useState<(Artwork & { featured: boolean })[]>([]);
  const [collabs, setCollabs]     = useState<Collab[]>([]);
  const [events, setEvents]       = useState<Exhibition[]>([]);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);
  const [selected, setSelected]   = useState<(Artwork & { featured: boolean }) | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [artworkCount, setArtworkCount]   = useState(0);
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    if (!username) return;
    load();
  }, [username]);

  async function load() {
    const supabase = createClient();

    // Get profile by username
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, full_name, username, bio, location, avatar_url, website, role, email")
      .eq("username", username)
      .single();

    if (!prof) { setNotFound(true); setLoading(false); return; }
    setProfile(prof);

    // Get store settings
    const { data: ss } = await supabase
      .from("store_settings")
      .select("*")
      .eq("user_id", prof.id)
      .eq("is_active", true)
      .single();

    if (!ss) { setNotFound(true); setLoading(false); return; }
    setSettings(ss);

    // Get store artworks
    const { data: storeAws } = await supabase
      .from("store_artworks")
      .select("artwork_id, sort_order, featured")
      .eq("user_id", prof.id)
      .order("sort_order", { ascending: true });

    if (storeAws?.length) {
      const ids = storeAws.map(sa => sa.artwork_id);
      const { data: awData } = await supabase
        .from("artworks")
        .select("id, title, medium, year, description, price, currency, status, images, sale_method, width_cm, height_cm, depth_cm, framed, editions")
        .in("id", ids);

      const saMap: Record<string, StoreArtworkEntry> = {};
      storeAws.forEach(sa => { saMap[sa.artwork_id] = sa; });

      const sorted = (awData || [])
        .map(aw => ({ ...aw, featured: saMap[aw.id]?.featured || false, _order: saMap[aw.id]?.sort_order ?? 999 }))
        .sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return a._order - b._order;
        });

      setArtworks(sorted);
    }

    // Counts
    const [{ count: fc }, { count: ac }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", prof.id),
      supabase.from("artworks").select("*", { count: "exact", head: true }).eq("user_id", prof.id),
    ]);
    setFollowerCount(fc || 0);
    setArtworkCount(ac || 0);

    // Collabs (if enabled)
    if (ss.show_collabs) {
      const { data: co } = await supabase
        .from("collaborations")
        .select("id, title, type, status, partner_name, description")
        .eq("user_id", prof.id)
        .in("status", ["Open", "In Progress", "open", "in_progress"])
        .limit(6);
      setCollabs(co || []);
    }

    // Events (if enabled)
    if (ss.show_events) {
      const { data: ex } = await supabase
        .from("exhibitions")
        .select("id, title, venue, start_date, end_date, status")
        .eq("user_id", prof.id)
        .eq("is_public", true)
        .order("start_date", { ascending: true })
        .limit(6);
      setEvents(ex || []);
    }

    setLoading(false);
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Derived ────────────────────────────────────────────────── */
  const accent = settings?.accent_color || "#FFD400";
  const storeName = settings?.store_name || profile?.full_name || "Store";
  const selectedImages = selected?.images?.filter(Boolean) || [];

  function fmtDate(d?: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function dims(aw: Artwork) {
    const d = [aw.width_cm, aw.height_cm, aw.depth_cm].filter(Boolean);
    return d.length ? d.join(" × ") + " cm" : null;
  }

  /* ── Loading / Not Found ────────────────────────────────────── */
  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#FFFBEA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <ShoppingBag size={32} color="#D4C9A8" style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 700, color: "#9B8F7A" }}>Loading store…</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: "#FFFBEA", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🥭</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", marginBottom: 8 }}>Store not found</div>
        <div style={{ fontSize: 14, color: "#9B8F7A", marginBottom: 24 }}>This store doesn't exist or isn't active yet.</div>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={{ padding: "10px 24px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110", fontFamily: "inherit" }}>
            Go to Artomango →
          </button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Darker Grotesque',system-ui,sans-serif;background:#FFFBEA;color:#111110}

        .store-card{background:#fff;border:2.5px solid #111110;border-radius:20px;box-shadow:4px 5px 0 #D4C9A8;overflow:hidden;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);cursor:pointer}
        .store-card:hover{box-shadow:6px 8px 0 #111110;transform:translate(-2px,-3px);border-color:#111110}
        .store-card:hover img{transform:scale(1.05)}
        .store-card img{transition:transform 0.5s cubic-bezier(0.16,1,0.3,1)}

        .store-featured{position:relative}
        .store-featured::before{content:'★ Featured';position:absolute;top:12px;left:12px;z-index:2;padding:3px 10px;border-radius:8px;font-size:10px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;border:2px solid #111110;box-shadow:2px 2px 0 #111110}

        .sale-badge{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:9999px;font-size:11px;font-weight:800;border:1.5px solid}

        @keyframes storeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
        .store-in{animation:storeIn 0.5s cubic-bezier(0.16,1,0.3,1) both}

        .modal-overlay{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px}

        .section-title{font-size:22px;font-weight:900;color:#111110;letter-spacing:-0.5px;display:flex;align-items:center;gap:10px;margin-bottom:20px}
        .section-dot{width:10px;height:10px;border-radius:4px;border:2px solid #111110;flex-shrink:0}
      `}</style>

      {/* ═══ NAV ═══ */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,251,234,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderBottom: "2.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", height: 54 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>🥭</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#111110" }}>artomango</span>
          </Link>
          <div style={{ width: 1, height: 20, background: "#E0D8CA", margin: "0 4px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 3, background: accent, border: "1.5px solid #111110" }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{storeName}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={copyUrl}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "2px solid #E8E0D0", borderRadius: 9999, background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all 0.15s" }}>
            {copied ? <><Check size={11} color="#16A34A" /> Copied</> : <><Copy size={11} /> Share</>}
          </button>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <button style={{ padding: "6px 14px", border: "2px solid #111110", borderRadius: 9999, background: accent, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
              Join Artomango
            </button>
          </Link>
        </div>
      </nav>

      {/* ═══ HERO BANNER ═══ */}
      <div className="store-in" style={{ position: "relative", overflow: "hidden", borderBottom: "2.5px solid #111110" }}>
        {settings?.banner_url ? (
          <div style={{ height: 220, position: "relative" }}>
            <img src={settings.banner_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${accent}CC 0%, transparent 60%)` }} />
          </div>
        ) : (
          <div style={{ height: 160, background: `linear-gradient(135deg, ${accent} 0%, ${accent}88 50%, #FFFBEA 100%)`, position: "relative" }}>
            <div style={{ position: "absolute", top: 30, right: 60, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
            <div style={{ position: "absolute", bottom: -20, left: 80, width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0.05)" }} />
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 64px" }}>

        {/* ═══ ARTIST HEADER ═══ */}
        <div className="store-in" style={{ display: "flex", gap: 24, alignItems: "flex-start", marginTop: -40, marginBottom: 40, flexWrap: "wrap", animationDelay: "0.1s" }}>
          {/* Avatar */}
          <div style={{ width: 96, height: 96, borderRadius: 22, border: "3px solid #111110", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 900, color: "#111110", overflow: "hidden", boxShadow: "4px 4px 0 #111110", flexShrink: 0, position: "relative", zIndex: 2 }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (profile?.full_name?.[0]?.toUpperCase() || "A")
            }
          </div>

          <div style={{ flex: 1, minWidth: 260, paddingTop: 44 }}>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 900, color: "#111110", letterSpacing: "-1px", margin: 0, lineHeight: 1.1 }}>
              {storeName}
            </h1>
            {settings?.tagline && (
              <p style={{ fontSize: 16, fontWeight: 600, color: "#9B8F7A", marginTop: 6, maxWidth: 500 }}>{settings.tagline}</p>
            )}

            {settings?.show_bio && profile?.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#9B8F7A", marginTop: 10 }}>
                <MapPin size={13} color="#FF6B6B" /> {profile.location}
              </div>
            )}

            {/* Stats + links */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 0, border: "2px solid #111110", borderRadius: 12, overflow: "hidden" }}>
                {[
                  { label: "Works", value: artworkCount },
                  { label: "In store", value: artworks.length },
                  { label: "Followers", value: followerCount },
                ].map((s, i) => (
                  <div key={s.label} style={{ padding: "8px 16px", borderRight: i < 2 ? "1px solid #E8E0D0" : "none", background: "#fff", textAlign: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#111110" }}>{s.value}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: "2px solid #E8E0D0", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
                    <Globe size={12} /> Website
                  </button>
                </a>
              )}

              <Link href={`/profile/${username}`} style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: "2px solid #E8E0D0", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
                  <ExternalLink size={12} /> Full Portfolio
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* ═══ BIO ═══ */}
        {settings?.show_bio && profile?.bio && (
          <div className="store-in" style={{ marginBottom: 40, maxWidth: 700, animationDelay: "0.15s" }}>
            <p style={{ fontSize: 15, color: "#5C5346", lineHeight: 1.7, fontWeight: 500 }}>{profile.bio}</p>
          </div>
        )}

        {/* ═══ ARTWORKS GRID ═══ */}
        {artworks.length > 0 && (
          <section className="store-in" style={{ marginBottom: 52, animationDelay: "0.2s" }}>
            <div className="section-title">
              <div className="section-dot" style={{ background: accent }} />
              Artworks
              <span style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", marginLeft: 4 }}>({artworks.length})</span>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: settings?.layout === "list"
                ? "1fr"
                : settings?.layout === "masonry"
                  ? "repeat(3, 1fr)"
                  : "repeat(auto-fill, minmax(250px, 1fr))",
              gap: settings?.layout === "list" ? 12 : 18,
            }}>
              {artworks.map((aw, i) => {
                const img = Array.isArray(aw.images) ? aw.images[0] : null;
                const sm = aw.sale_method ? SALE_METHOD_CFG[aw.sale_method] : null;

                if (settings?.layout === "list") {
                  return (
                    <div key={aw.id} onClick={() => setSelected(aw)}
                      style={{ display: "flex", gap: 16, padding: 16, background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 16, cursor: "pointer", transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)", alignItems: "center" }}
                      onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "#111110"; el.style.boxShadow = "4px 4px 0 #111110"; el.style.transform = "translate(-1px,-1px)"; }}
                      onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "#E8E0D0"; el.style.boxShadow = "none"; el.style.transform = ""; }}>
                      <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#FAF7F3", border: "2px solid #E8E0D0" }}>
                        {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={20} color="#D4C9A8" /></div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", marginBottom: 2 }}>{aw.title}</div>
                        <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600 }}>{[aw.medium, aw.year].filter(Boolean).join(" · ")}</div>
                      </div>
                      {sm && <span className="sale-badge" style={{ borderColor: sm.color + "60", background: sm.color + "12", color: sm.color }}>{sm.icon} {sm.label}</span>}
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", fontFamily: "monospace", flexShrink: 0 }}>
                        {aw.price ? `$${Number(aw.price).toLocaleString()}` : "—"}
                      </div>
                    </div>
                  );
                }

                // Grid / Masonry card
                return (
                  <div key={aw.id}
                    className={`store-card${aw.featured ? " store-featured" : ""}`}
                    onClick={() => setSelected(aw)}
                    style={{ animationDelay: `${0.2 + Math.min(i, 12) * 0.04}s` }}>
                    {aw.featured && (
                      <style>{`.store-featured::before{background:${accent};color:#111110}`}</style>
                    )}
                    <div style={{ position: "relative", aspectRatio: settings?.layout === "masonry" ? undefined : "4/3", overflow: "hidden", background: "#FAF7F3", minHeight: settings?.layout === "masonry" ? 180 : undefined }}>
                      {img
                        ? <img src={img} alt={aw.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <div style={{ width: "100%", height: "100%", minHeight: 200, display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={32} color="#D4C9A8" /></div>
                      }
                      {sm && (
                        <div style={{ position: "absolute", bottom: 10, right: 10 }}>
                          <span className="sale-badge" style={{ borderColor: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", color: sm.color }}>
                            {sm.icon} {sm.label}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#111110", letterSpacing: "-0.2px", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{aw.title}</div>
                      <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 10 }}>
                        {[aw.medium, aw.year].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-0.5px" }}>
                          {aw.price ? `$${Number(aw.price).toLocaleString()}` : <span style={{ color: "#D4C9A8", fontSize: 14 }}>Inquiry</span>}
                        </div>
                        <div style={{ padding: "5px 12px", borderRadius: 9999, background: accent, border: "1.5px solid #111110", fontSize: 11, fontWeight: 800, color: "#111110" }}>
                          View →
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ EVENTS ═══ */}
        {settings?.show_events && events.length > 0 && (
          <section className="store-in" style={{ marginBottom: 52, animationDelay: "0.3s" }}>
            <div className="section-title">
              <div className="section-dot" style={{ background: "#4ECDC4" }} />
              Exhibitions & Shows
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {events.map(ev => (
                <div key={ev.id} style={{ background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 16, padding: "16px 18px", transition: "all 0.2s" }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "#111110"; el.style.boxShadow = "3px 3px 0 #111110"; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "#E8E0D0"; el.style.boxShadow = "none"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>{ev.title}</div>
                    <span style={{ padding: "2px 8px", borderRadius: 8, background: ev.status?.toLowerCase() === "current" ? "#DCFCE7" : "#EDE9FE", color: ev.status?.toLowerCase() === "current" ? "#16A34A" : "#8B5CF6", fontSize: 10, fontWeight: 800, textTransform: "uppercase", flexShrink: 0 }}>{ev.status}</span>
                  </div>
                  {ev.venue && <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 4 }}>{ev.venue}</div>}
                  {(ev.start_date || ev.end_date) && (
                    <div style={{ fontSize: 11, color: "#9B8F7A", display: "flex", alignItems: "center", gap: 4 }}>
                      <CalendarDays size={11} /> {fmtDate(ev.start_date)}{ev.end_date ? ` — ${fmtDate(ev.end_date)}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ COLLABS ═══ */}
        {settings?.show_collabs && collabs.length > 0 && (
          <section className="store-in" style={{ marginBottom: 52, animationDelay: "0.35s" }}>
            <div className="section-title">
              <div className="section-dot" style={{ background: "#CA8A04" }} />
              Collaborations
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {collabs.map(c => (
                <div key={c.id} style={{ background: "#fff", border: "2.5px solid #E8E0D0", borderRadius: 16, padding: "16px 18px", transition: "all 0.2s" }}
                  onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = "#111110"; el.style.boxShadow = "3px 3px 0 #111110"; }}
                  onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "#E8E0D0"; el.style.boxShadow = "none"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{c.title}</div>
                    {c.type && <span style={{ padding: "2px 8px", borderRadius: 8, background: "#FEF9C3", color: "#854D0E", fontSize: 10, fontWeight: 800, textTransform: "uppercase", flexShrink: 0 }}>{c.type}</span>}
                  </div>
                  {c.description && <div style={{ fontSize: 12, color: "#9B8F7A", lineHeight: 1.5, marginBottom: 4 }}>{c.description.slice(0, 100)}{c.description.length > 100 ? "…" : ""}</div>}
                  {c.partner_name && <div style={{ fontSize: 11, color: "#5C5346", fontWeight: 600 }}>With: {c.partner_name}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═══ CONTACT CTA ═══ */}
        <div className="store-in" style={{ background: "#111110", borderRadius: 24, border: "2.5px solid #111110", padding: "36px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 40, boxShadow: `6px 6px 0 ${accent}`, animationDelay: "0.4s" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 900, color: accent, letterSpacing: "-0.5px", marginBottom: 4 }}>Interested in a piece?</div>
            <div style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Get in touch with {profile?.full_name || "the artist"} directly.</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {profile?.email && (
              <a href={`mailto:${profile.email}?subject=Inquiry from your Artomango store`} style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", background: accent, border: "2.5px solid " + accent, borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all 0.2s" }}>
                  <Mail size={15} /> Contact Artist
                </button>
              </a>
            )}
            <Link href={`/profile/${username}`} style={{ textDecoration: "none" }}>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 24px", background: "transparent", border: "2px solid #333", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#888", transition: "all 0.2s" }}>
                View Portfolio <ArrowRight size={14} />
              </button>
            </Link>
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{ borderTop: "1px solid #E0D8CA", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#9B8F7A" }}>
            <span>🥭</span> Powered by <a href="/" style={{ color: "#111110", fontWeight: 800, textDecoration: "none" }}>Artomango</a>
          </div>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#111110" }}>Create your own store →</span>
          </Link>
        </div>
      </div>

      {/* ═══ ARTWORK DETAIL MODAL ═══ */}
      {selected && (
        <div className="modal-overlay" onClick={() => { setSelected(null); setLightboxIdx(null); }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 24, boxShadow: "8px 8px 0 #111110", width: "100%", maxWidth: 780, maxHeight: "92vh", overflowY: "auto", position: "relative" }}>

            {/* Close */}
            <button onClick={() => { setSelected(null); setLightboxIdx(null); }}
              style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 36, height: 36, borderRadius: 10, background: "#111110", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <X size={16} color="#FFD400" />
            </button>

            {/* Images */}
            {selectedImages.length > 0 && (
              <div style={{ position: "relative", aspectRatio: "16/9", overflow: "hidden", borderRadius: "22px 22px 0 0" }}>
                <img src={selectedImages[lightboxIdx ?? 0]} alt={selected.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

                {selectedImages.length > 1 && (
                  <>
                    <button onClick={() => setLightboxIdx(p => Math.max(0, (p ?? 0) - 1))}
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: 9999, background: "rgba(255,255,255,0.9)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setLightboxIdx(p => Math.min(selectedImages.length - 1, (p ?? 0) + 1))}
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: 9999, background: "rgba(255,255,255,0.9)", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <ChevronRight size={16} />
                    </button>
                    <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                      {selectedImages.map((_, i) => (
                        <div key={i} onClick={() => setLightboxIdx(i)}
                          style={{ width: 8, height: 8, borderRadius: "50%", background: (lightboxIdx ?? 0) === i ? "#FFD400" : "rgba(255,255,255,0.5)", border: "1.5px solid #111110", cursor: "pointer" }} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Thumbnails */}
            {selectedImages.length > 1 && (
              <div style={{ display: "flex", gap: 6, padding: "12px 24px 0", overflowX: "auto" }}>
                {selectedImages.map((img, i) => (
                  <div key={i} onClick={() => setLightboxIdx(i)}
                    style={{ width: 60, height: 48, borderRadius: 8, overflow: "hidden", border: `2px solid ${(lightboxIdx ?? 0) === i ? accent : "#E8E0D0"}`, flexShrink: 0, cursor: "pointer", transition: "border-color 0.15s" }}>
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div style={{ padding: "24px 28px 28px" }}>
              {selected.featured && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 8, background: accent, border: "1.5px solid #111110", fontSize: 10, fontWeight: 800, color: "#111110", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  <Star size={10} fill="#111110" /> Featured
                </div>
              )}

              <h2 style={{ fontSize: 28, fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", marginBottom: 4 }}>{selected.title}</h2>

              <div style={{ fontSize: 14, color: "#9B8F7A", fontWeight: 600, marginBottom: 20 }}>
                {[selected.medium, selected.year].filter(Boolean).join(" · ")}
              </div>

              {/* Price + Sale method */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #F5F0E8" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-1px" }}>
                  {selected.price
                    ? `${selected.currency === "EUR" ? "€" : "$"}${Number(selected.price).toLocaleString()}`
                    : <span style={{ fontSize: 18, color: "#9B8F7A" }}>Price on request</span>
                  }
                </div>
                {selected.sale_method && SALE_METHOD_CFG[selected.sale_method] && (
                  <span className="sale-badge" style={{
                    borderColor: SALE_METHOD_CFG[selected.sale_method].color + "40",
                    background: SALE_METHOD_CFG[selected.sale_method].color + "12",
                    color: SALE_METHOD_CFG[selected.sale_method].color,
                    fontSize: 13, fontWeight: 800,
                  }}>
                    {SALE_METHOD_CFG[selected.sale_method].icon} {SALE_METHOD_CFG[selected.sale_method].label}
                  </span>
                )}
              </div>

              {/* Details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
                {[
                  ["Dimensions", dims(selected)],
                  ["Status", selected.status],
                  ["Framed", selected.framed ? "Yes" : null],
                  ["Editions", selected.editions ? `${selected.editions} editions` : null],
                ].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} style={{ padding: "10px 14px", background: "#FAF7F3", borderRadius: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#111110" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              {selected.description && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>About this work</div>
                  <p style={{ fontSize: 14, color: "#5C5346", lineHeight: 1.7 }}>{selected.description}</p>
                </div>
              )}

              {/* CTA */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {profile?.email && (
                  <a href={`mailto:${profile.email}?subject=Inquiry about "${selected.title}"&body=Hi, I'm interested in "${selected.title}" from your Artomango store.`} style={{ textDecoration: "none", flex: 1 }}>
                    <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 24px", background: accent, border: "2.5px solid #111110", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", boxShadow: "3px 3px 0 #111110", fontFamily: "inherit", color: "#111110", transition: "all 0.15s" }}>
                      <Mail size={16} /> {selected.sale_method === "direct" ? "Buy This Artwork" : "Inquire About This Artwork"}
                    </button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
