"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, CheckCircle2, MapPin, Award, Fingerprint,
  CalendarDays, Building2, QrCode, Share2, X, ImageIcon,
  ChevronLeft, ChevronRight, Check,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type Artist = {
  id: string; full_name: string; username?: string; role?: string;
  bio?: string; location?: string; avatar_url?: string;
  website?: string; instagram?: string;
};
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  description?: string; price?: number; currency?: string;
  status: string; images?: string[];
  width_cm?: number; height_cm?: number; depth_cm?: number;
  framed?: boolean; editions?: number;
  certificate_id?: string; authentication_status?: string;
  authenticated_by?: string; authentication_date?: string;
  authentication_notes?: string;
  venue_location?: string; location_name?: string;
  created_at: string; updated_at?: string;
  user_id: string;
};
type ProvenanceEntry = {
  id: string; event_type: string; owner_name?: string;
  is_anonymous?: boolean; date?: string; location?: string;
  notes?: string; created_at: string;
};
type Exhibition = {
  id: string; title: string; venue?: string; gallery_name?: string;
  start_date?: string; end_date?: string; status: string;
  description?: string; cover_image?: string;
};

// ── Config ─────────────────────────────────────────────────────────
const AUTH_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  original:        { label: "Original Work",   color: "#16A34A", bg: "#DCFCE7", icon: "✦" },
  limited_edition: { label: "Limited Edition", color: "#CA8A04", bg: "#FEF9C3", icon: "◈" },
  reproduction:    { label: "Reproduction",    color: "#9B8F7A", bg: "#F5F0E8", icon: "◇" },
  pending:         { label: "Pending Review",  color: "#9B8F7A", bg: "#F5F0E8", icon: "○" },
};

const EVT_CFG: Record<string, { label: string; icon: string; color: string }> = {
  created:     { label: "Created",     icon: "✦", color: "#FFD400" },
  sold:        { label: "Sold",        icon: "◆", color: "#16A34A" },
  transferred: { label: "Transferred", icon: "→", color: "#0EA5E9" },
  exhibited:   { label: "Exhibited",   icon: "▣", color: "#8B5CF6" },
  restored:    { label: "Restored",    icon: "◎", color: "#D97706" },
  appraised:   { label: "Appraised",   icon: "◈", color: "#4ECDC4" },
  donated:     { label: "Donated",     icon: "♡", color: "#EC4899" },
  loaned:      { label: "Loaned",      icon: "⇄", color: "#FF6B6B" },
};

function fmtDate(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
function fmtDateShort(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Reveal hook ────────────────────────────────────────────────────
function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ══════════════════════════════════════════════════════════════════
// 3D PASSPORT BOOK COMPONENT
// ══════════════════════════════════════════════════════════════════
function PassportBook({
  artwork, artist, provenance, exhibitions,
}: {
  artwork: Artwork; artist: Artist | null;
  provenance: ProvenanceEntry[]; exhibitions: Exhibition[];
}) {
  const [page, setPage] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"next" | "prev">("next");
  const mainImg = artwork.images?.[0];
  const isVerified = artwork.authentication_status && artwork.authentication_status !== "pending";
  const authCfg = AUTH_CFG[artwork.authentication_status || "pending"];
  const dims = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean);

  // Build pages
  const pages = [
    "cover",
    "identity",
    "authentication",
    "provenance",
    ...(exhibitions.length ? ["exhibitions"] : []),
  ];
  const totalPages = pages.length;

  function goTo(dir: "next" | "prev") {
    const next = dir === "next" ? page + 1 : page - 1;
    if (next < 0 || next >= totalPages || flipping) return;
    setFlipDir(dir);
    setFlipping(true);
    setTimeout(() => {
      setPage(next);
      setFlipping(false);
    }, 350);
  }

  return (
    <div className="pb-scene">
      {/* Book container */}
      <div className={`pb-book ${flipping ? `pb-flipping-${flipDir}` : ""}`}>
        {/* Left cover (always dark) */}
        <div className="pb-cover-left">
          <div className="pb-cover-spine">
            <span className="pb-spine-text">ARTOMANGO PASSPORT</span>
          </div>
        </div>

        {/* Right page content */}
        <div className="pb-page-right">
          {/* PAGE: COVER */}
          {pages[page] === "cover" && (
            <div className="pb-page-content pb-page-cover-content">
              <div className="pb-page-cover-img">
                {mainImg
                  ? <img src={mainImg} alt={artwork.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div className="pb-no-img"><ImageIcon size={48} color="#D4C9A8" /></div>
                }
                {isVerified && (
                  <div className="pb-cover-verified-badge">
                    <CheckCircle2 size={12} /> Verified
                  </div>
                )}
              </div>
              <div className="pb-page-cover-info">
                <div className="pb-page-tag">🥭 Artomango</div>
                <div className="pb-page-cover-title">{artwork.title}</div>
                {artist && <div className="pb-page-cover-artist">by {artist.full_name}</div>}
                <div className="pb-page-cover-meta">
                  {[artwork.year, artwork.medium].filter(Boolean).join(" · ")}
                </div>
                <div className="pb-cert-pill">
                  <Fingerprint size={10} />
                  {artwork.certificate_id || "No Certificate Yet"}
                </div>
              </div>
              <div className="pb-page-number">1 / {totalPages}</div>
            </div>
          )}

          {/* PAGE: IDENTITY */}
          {pages[page] === "identity" && (
            <div className="pb-page-content">
              <div className="pb-page-header">
                <Award size={13} />
                <span>Identity</span>
              </div>
              <div className="pb-id-thumb">
                {mainImg
                  ? <img src={mainImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div className="pb-no-img"><ImageIcon size={28} color="#D4C9A8" /></div>
                }
              </div>
              <div className="pb-id-fields">
                {[
                  { label: "Title",      value: artwork.title },
                  { label: "Artist",     value: artist?.full_name },
                  { label: "Year",       value: artwork.year?.toString() },
                  { label: "Medium",     value: artwork.medium },
                  { label: "Dimensions", value: dims.length ? dims.join(" × ") + " cm" : null },
                  { label: "Status",     value: artwork.status },
                  { label: "Framed",     value: artwork.framed ? "Yes" : null },
                  { label: "Editions",   value: artwork.editions ? `${artwork.editions}` : null },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="pb-id-field">
                    <div className="pb-id-label">{f.label}</div>
                    <div className="pb-id-value">{f.value}</div>
                  </div>
                ))}
              </div>
              {/* MRZ strip */}
              <div className="pb-mrz">
                <div>P&lt;ART&lt;{(artwork.title || "").toUpperCase().replace(/\s/g, "<").slice(0, 28)}</div>
                <div>{(artwork.certificate_id || "AM000000000XXXXX").slice(0, 20)}&lt;&lt;{artwork.year || "0000"}</div>
              </div>
              <div className="pb-page-number">2 / {totalPages}</div>
            </div>
          )}

          {/* PAGE: AUTHENTICATION */}
          {pages[page] === "authentication" && (
            <div className="pb-page-content">
              <div className="pb-page-header">
                <Shield size={13} />
                <span>Authentication</span>
              </div>

              {/* Big seal */}
              <div className={`pb-seal ${isVerified ? "pb-seal-verified" : ""}`}>
                <div className="pb-seal-ring1" />
                <div className="pb-seal-ring2" />
                <div className="pb-seal-inner">
                  <div style={{ fontSize: 28, marginBottom: 4 }}>
                    {isVerified ? "✦" : "○"}
                  </div>
                  <div className="pb-seal-status" style={{ color: authCfg.color }}>
                    {authCfg.label}
                  </div>
                </div>
              </div>

              {/* Auth details */}
              <div className="pb-auth-details">
                {[
                  { label: "Status",          value: authCfg.label },
                  { label: "Authenticated by", value: artwork.authenticated_by },
                  { label: "Date",            value: fmtDate(artwork.authentication_date) },
                  { label: "Certificate ID",  value: artwork.certificate_id },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="pb-auth-row">
                    <div className="pb-auth-lbl">{f.label}</div>
                    <div className="pb-auth-val">{f.value}</div>
                  </div>
                ))}
                {artwork.authentication_notes && (
                  <div className="pb-auth-notes">
                    <div className="pb-auth-lbl">Notes</div>
                    <div style={{ fontSize: 11, color: "#5C5346", lineHeight: 1.5, marginTop: 3 }}>
                      {artwork.authentication_notes}
                    </div>
                  </div>
                )}
              </div>
              <div className="pb-page-number">3 / {totalPages}</div>
            </div>
          )}

          {/* PAGE: PROVENANCE */}
          {pages[page] === "provenance" && (
            <div className="pb-page-content">
              <div className="pb-page-header">
                <Fingerprint size={13} />
                <span>Provenance</span>
              </div>

              {provenance.length === 0 ? (
                <div className="pb-empty-state">
                  No provenance entries yet
                </div>
              ) : (
                <div className="pb-timeline">
                  {provenance.map((p, i) => {
                    const cfg = EVT_CFG[p.event_type] || { label: p.event_type, icon: "·", color: "#9B8F7A" };
                    return (
                      <div key={p.id} className="pb-timeline-item">
                        <div className="pb-timeline-dot" style={{ color: cfg.color, borderColor: cfg.color }}>
                          {cfg.icon}
                        </div>
                        <div className="pb-timeline-content">
                          <div className="pb-timeline-type" style={{ color: cfg.color }}>{cfg.label}</div>
                          {p.date && <div className="pb-timeline-date">{fmtDate(p.date)}</div>}
                          {p.owner_name && !p.is_anonymous && (
                            <div className="pb-timeline-owner">{p.owner_name}</div>
                          )}
                          {p.location && (
                            <div className="pb-timeline-loc">
                              <MapPin size={9} /> {p.location}
                            </div>
                          )}
                          {p.notes && <div className="pb-timeline-notes">{p.notes}</div>}
                        </div>
                        {i < provenance.length - 1 && <div className="pb-timeline-line" />}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pb-page-number">{pages.indexOf("provenance") + 1} / {totalPages}</div>
            </div>
          )}

          {/* PAGE: EXHIBITIONS */}
          {pages[page] === "exhibitions" && (
            <div className="pb-page-content">
              <div className="pb-page-header">
                <Building2 size={13} />
                <span>Exhibitions</span>
              </div>
              <div className="pb-exhibitions">
                {exhibitions.map(ex => (
                  <div key={ex.id} className="pb-ex-card">
                    {ex.cover_image && (
                      <div className="pb-ex-img">
                        <img src={ex.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div className="pb-ex-info">
                      <div className="pb-ex-title">{ex.title}</div>
                      {(ex.gallery_name || ex.venue) && (
                        <div className="pb-ex-venue">
                          <Building2 size={9} /> {ex.gallery_name || ex.venue}
                        </div>
                      )}
                      {ex.start_date && (
                        <div className="pb-ex-dates">
                          <CalendarDays size={9} /> {fmtDateShort(ex.start_date)}
                          {ex.end_date ? ` — ${fmtDateShort(ex.end_date)}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pb-page-number">{totalPages} / {totalPages}</div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="pb-nav">
        <button
          className="pb-nav-btn"
          onClick={() => goTo("prev")}
          disabled={page === 0 || flipping}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="pb-dots">
          {pages.map((_, i) => (
            <div
              key={i}
              className={`pb-dot ${i === page ? "active" : ""}`}
              onClick={() => {
                if (i !== page && !flipping) {
                  setFlipDir(i > page ? "next" : "prev");
                  setFlipping(true);
                  setTimeout(() => { setPage(i); setFlipping(false); }, 350);
                }
              }}
            />
          ))}
        </div>
        <button
          className="pb-nav-btn"
          onClick={() => goTo("next")}
          disabled={page === totalPages - 1 || flipping}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="pb-hint">Click arrows or dots to flip pages</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function ArtworkPassportPage() {
  const params = useParams<{ id: string }>();
  const artworkId = params?.id;

  const [artwork, setArtwork]       = useState<Artwork | null>(null);
  const [artist, setArtist]         = useState<Artist | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceEntry[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [viewCount, setViewCount]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [copied, setCopied]         = useState(false);
  const [showQR, setShowQR]         = useState(false);

  const heroR    = useReveal(0.05);
  const bookR    = useReveal(0.05);
  const detailsR = useReveal(0.08);
  const verifyR  = useReveal(0.1);

  useEffect(() => {
    if (!artworkId) return;
    loadPassport();
  }, [artworkId]);

  async function loadPassport() {
    setLoading(true);
    setError("");
    const sb = createClient();

    // 1. Artwork
    const { data: aw, error: awErr } = await sb
      .from("artworks").select("*").eq("id", artworkId).single();
    if (awErr || !aw) { setError("Artwork not found"); setLoading(false); return; }
    setArtwork(aw);

    // 2. Artist
    const { data: prof } = await sb
      .from("profiles")
      .select("id, full_name, username, role, bio, location, avatar_url, website, instagram")
      .eq("id", aw.user_id).single();
    setArtist(prof);

    // 3. Provenance
    const { data: prov } = await sb
      .from("provenance_entries").select("*")
      .eq("artwork_id", artworkId).order("date", { ascending: true });
    setProvenance(prov || []);

    // 4. Exhibitions
    const { data: exLinks } = await sb
      .from("exhibition_artworks").select("exhibition_id").eq("artwork_id", artworkId);
    if (exLinks?.length) {
      const exIds = exLinks.map((l: any) => l.exhibition_id);
      const { data: exData } = await sb
        .from("exhibitions")
        .select("id, title, venue, gallery_name, start_date, end_date, status, description, cover_image")
        .in("id", exIds).order("start_date", { ascending: false });
      setExhibitions(exData || []);
    }

    // 5. View count + record view
    const { count } = await sb
      .from("passport_views").select("*", { count: "exact", head: true }).eq("artwork_id", artworkId);
    setViewCount(count || 0);
    sb.from("passport_views").insert({ artwork_id: artworkId }).then(() => {});

    setLoading(false);
  }

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const mainImg = artwork?.images?.[0];
  const isVerified = artwork?.authentication_status && artwork.authentication_status !== "pending";
  const authCfg = AUTH_CFG[artwork?.authentication_status || "pending"];
  const qrUrl = artwork?.certificate_id && typeof window !== "undefined"
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}&bgcolor=FFFBEA&color=111110&margin=16`
    : null;

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="pp-loading">
          <div className="pp-loading-passport">
            <div className="pp-loading-shine" />
            <div style={{ fontSize: 32, marginBottom: 12 }}>🥭</div>
            <div className="pp-loading-title">Loading Passport…</div>
            <div className="pp-loading-bar"><div className="pp-loading-fill" /></div>
          </div>
        </div>
      </>
    );
  }

  if (error || !artwork) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="pp-loading">
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🥭</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#111110", marginBottom: 8 }}>Passport not found</div>
            <div style={{ fontSize: 14, color: "#9B8F7A" }}>{error || "This artwork passport doesn't exist."}</div>
            <Link href="/" style={{ display: "inline-block", marginTop: 24, padding: "10px 24px", background: "#111110", color: "#FFD400", borderRadius: 10, fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
              ← Back to Artomango
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="pp-hero" ref={heroR.ref}>
        {/* Background artwork image */}
        {mainImg && (
          <div className="pp-hero-bg">
            <img src={mainImg} alt="" />
            <div className="pp-hero-bg-overlay" />
          </div>
        )}

        <div className={`pp-hero-content pp-reveal${heroR.visible ? " visible" : ""}`}>
          {/* Top bar */}
          <div className="pp-hero-topbar">
            <Link href="/" className="pp-back-btn">
              <span>🥭</span> Artomango
            </Link>
            {isVerified && (
              <div className="pp-hero-badge">
                <CheckCircle2 size={12} />
                Verified Artwork
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="pp-hero-text">
            <h1 className="pp-hero-title">{artwork.title}</h1>
            {artist && (
              <div className="pp-hero-artist">
                <div className="pp-hero-avatar">
                  {artist.avatar_url
                    ? <img src={artist.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : (artist.full_name || "A")[0]
                  }
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{artist.full_name}</div>
                  {artist.location && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={10} /> {artist.location}
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="pp-hero-meta">
              {artwork.year && <span>{artwork.year}</span>}
              {artwork.medium && <><span className="pp-meta-dot">·</span><span>{artwork.medium}</span></>}
              <span className="pp-meta-dot">·</span>
              <span style={{ color: authCfg.color }}>{authCfg.icon} {authCfg.label}</span>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="pp-scroll-hint">scroll to explore</div>
        </div>
      </section>

      {/* ── 3D PASSPORT BOOK SECTION ─────────────────────────────── */}
      <section className="pp-book-section" ref={bookR.ref}>
        <div className={`pp-container pp-reveal${bookR.visible ? " visible" : ""}`}>
          <div className="pp-section-eyebrow">
            <Fingerprint size={14} />
            <span>Digital Artwork Passport</span>
            <div className="pp-eyebrow-line" />
          </div>
          <p className="pp-book-subtitle">
            Flip through the pages to explore the full history and authentication of this artwork.
          </p>
          <PassportBook
            artwork={artwork}
            artist={artist}
            provenance={provenance}
            exhibitions={exhibitions}
          />
        </div>
      </section>

      {/* ── DETAILS SECTION ──────────────────────────────────────── */}
      {artwork.description && (
        <section className="pp-details-section" ref={detailsR.ref}>
          <div className={`pp-container pp-reveal${detailsR.visible ? " visible" : ""}`}>
            <div className="pp-section-eyebrow">
              <Award size={14} />
              <span>About this Work</span>
              <div className="pp-eyebrow-line" />
            </div>
            <div className="pp-details-grid">
              <div className="pp-details-desc">
                <p>{artwork.description}</p>
              </div>
              <div className="pp-details-stats">
                {[
                  { icon: "📜", label: "Provenance entries", value: provenance.length },
                  { icon: "🏛️", label: "Exhibitions", value: exhibitions.length },
                  { icon: "👁", label: "Passport views", value: viewCount },
                ].map(s => (
                  <div key={s.label} className="pp-stat">
                    <div className="pp-stat-icon">{s.icon}</div>
                    <div className="pp-stat-num">{s.value}</div>
                    <div className="pp-stat-lbl">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── VERIFY SECTION ───────────────────────────────────────── */}
      <section className="pp-verify-section" ref={verifyR.ref}>
        <div className={`pp-container pp-reveal${verifyR.visible ? " visible" : ""}`}>
          <div className="pp-verify-card">
            <div className="pp-verify-left">
              <div className="pp-section-eyebrow" style={{ marginBottom: 16 }}>
                <Shield size={14} />
                <span>Verification</span>
              </div>
              <h3 className="pp-verify-title">Verify this<br />artwork.</h3>
              <p className="pp-verify-sub">
                This digital passport serves as the certificate of authenticity. Share this page or scan the QR code to verify provenance.
              </p>
              <div className="pp-cert-row">
                <div className="pp-cert-label">Certificate ID</div>
                <div className="pp-cert-value">{artwork.certificate_id || "—"}</div>
              </div>
              <div className="pp-verify-actions">
                <button onClick={copyUrl} className="pp-btn-primary">
                  {copied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Share Passport</>}
                </button>
                {artwork.certificate_id && (
                  <button onClick={() => setShowQR(p => !p)} className="pp-btn-secondary">
                    <QrCode size={14} /> {showQR ? "Hide QR" : "Show QR"}
                  </button>
                )}
              </div>
              {showQR && qrUrl && (
                <div className="pp-qr-inline">
                  <img src={qrUrl} alt="QR" style={{ width: 160, height: 160, borderRadius: 12, border: "2px solid #E8E0D0" }} />
                </div>
              )}
            </div>
            <div className="pp-verify-right">
              <div className={`pp-verify-stamp ${isVerified ? "verified" : ""}`}>
                <div className="pp-stamp-ring" />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 6 }}>
                    {isVerified ? "✦" : "○"}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: isVerified ? "#FFD400" : "#9B8F7A", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    {authCfg.label}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.2em" }}>
                    ARTOMANGO
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="pp-footer">
        <div className="pp-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🥭</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#FFD400" }}>Artomango</span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>
            Artwork Passport · Certificate of Authenticity
          </div>
        </div>
      </footer>

      {/* ── QR MODAL ─────────────────────────────────────────────── */}
      {showQR && qrUrl && (
        <div className="pp-qr-overlay" onClick={() => setShowQR(false)}>
          <div className="pp-qr-modal" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowQR(false)} className="pp-qr-close"><X size={16} /></button>
            <div style={{ fontSize: 20, marginBottom: 8 }}>🥭</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#111110", marginBottom: 4 }}>Scan to verify</div>
            <div style={{ fontSize: 12, color: "#9B8F7A", marginBottom: 20 }}>{artwork.title}</div>
            <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, border: "2.5px solid #111110", borderRadius: 12 }} />
            <div style={{ fontSize: 10, color: "#C0B8A8", fontFamily: "monospace", marginTop: 12, letterSpacing: "0.15em" }}>
              {artwork.certificate_id}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// CSS
// ══════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-family: 'Darker Grotesque', system-ui, sans-serif; scroll-behavior: smooth; }
  body { background: #FFFBEA; color: #111110; overflow-x: hidden; }

  /* ── ANIMATIONS ─────────────────────────────────────────────── */
  @keyframes fadeUp { from { opacity:0; transform:translateY(28px); } to { opacity:1; transform:none; } }
  @keyframes loadBar { from { transform:translateX(-100%); } to { transform:translateX(100%); } }
  @keyframes sealPulse { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,106,.2)} 50%{box-shadow:0 0 0 18px rgba(22,163,106,0)} }
  @keyframes pageFlipNext { 0%{transform:perspective(1200px) rotateY(0deg)} 100%{transform:perspective(1200px) rotateY(-25deg)} }
  @keyframes pageFlipPrev { 0%{transform:perspective(1200px) rotateY(-25deg)} 100%{transform:perspective(1200px) rotateY(0deg)} }
  @keyframes stampSpin { to{transform:rotate(360deg)} }
  @keyframes scrollBob { 0%,100%{opacity:.4;transform:translateX(-50%) translateY(0)} 50%{opacity:.8;transform:translateX(-50%) translateY(6px)} }

  .pp-reveal { opacity: 0; transform: translateY(32px); transition: opacity .7s ease, transform .7s cubic-bezier(.16,1,.3,1); }
  .pp-reveal.visible { opacity: 1; transform: none; }

  /* ── LOADING ─────────────────────────────────────────────────── */
  .pp-loading {
    min-height: 100vh; background: #FFFBEA;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Darker Grotesque', system-ui, sans-serif;
  }
  .pp-loading-passport {
    background: #fff; border: 2.5px solid #111110; border-radius: 20px;
    padding: 48px 56px; text-align: center; position: relative; overflow: hidden;
    box-shadow: 8px 8px 0 #D4C9A8;
  }
  .pp-loading-shine {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, transparent, #FFD400, transparent);
    animation: loadBar 1.6s ease-in-out infinite;
  }
  .pp-loading-title { font-size: 18px; font-weight: 900; color: #111110; margin-bottom: 20px; }
  .pp-loading-bar { height: 4px; background: #E8E0D0; border-radius: 99px; overflow: hidden; }
  .pp-loading-fill { height: 100%; width: 40%; background: #FFD400; border-radius: 99px; animation: loadBar 1.2s ease-in-out infinite; }

  /* ── HERO ────────────────────────────────────────────────────── */
  .pp-hero {
    position: relative; min-height: 90vh;
    display: flex; align-items: flex-end;
    background: #111110; overflow: hidden;
  }
  .pp-hero-bg {
    position: absolute; inset: 0; z-index: 0;
  }
  .pp-hero-bg img {
    width: 100%; height: 100%; object-fit: cover;
    transform: scale(1.06); filter: brightness(0.55) saturate(0.8);
    transition: transform 0.1s;
  }
  .pp-hero-bg-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(0,0,0,.1) 0%, rgba(0,0,0,.0) 40%, rgba(0,0,0,.6) 75%, rgba(0,0,0,.9) 100%);
  }
  .pp-hero-content {
    position: relative; z-index: 2; width: 100%;
    padding: 0 48px 80px; max-width: 1200px; margin: 0 auto;
  }
  .pp-hero-topbar {
    position: absolute; top: -56vh; left: 0; right: 0;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0;
  }
  .pp-back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; font-weight: 800; color: rgba(255,255,255,.6);
    text-decoration: none; padding: 6px 14px; border-radius: 9999px;
    border: 1px solid rgba(255,255,255,.15); backdrop-filter: blur(8px);
    transition: color .2s, border-color .2s;
  }
  .pp-back-btn:hover { color: #FFD400; border-color: rgba(255,212,0,.3); }
  .pp-hero-badge {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 11px; font-weight: 800; color: #4ADE80;
    padding: 5px 14px; border-radius: 9999px;
    background: rgba(22,163,106,.15); border: 1.5px solid rgba(22,163,106,.35);
    backdrop-filter: blur(8px); letter-spacing: .12em; text-transform: uppercase;
  }
  .pp-hero-text { padding-top: 48px; }
  .pp-hero-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(40px, 7vw, 80px); font-weight: 900; color: #fff;
    letter-spacing: -2px; line-height: .92; margin-bottom: 20px;
    text-shadow: 0 2px 40px rgba(0,0,0,.3);
  }
  .pp-hero-artist { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .pp-hero-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    border: 2px solid rgba(255,255,255,.3); overflow: hidden;
    background: #FFD400; display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 900; color: #111110; flex-shrink: 0;
  }
  .pp-hero-meta { font-size: 14px; font-weight: 600; color: rgba(255,255,255,.45); }
  .pp-meta-dot { margin: 0 8px; opacity: .4; }
  .pp-scroll-hint {
    position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
    font-size: 10px; font-weight: 800; letter-spacing: .2em; text-transform: uppercase;
    color: rgba(255,255,255,.3); animation: scrollBob 2s ease-in-out infinite;
  }

  /* ── CONTAINERS & SECTIONS ───────────────────────────────────── */
  .pp-container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
  .pp-section-eyebrow {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 800; color: #9B8F7A;
    text-transform: uppercase; letter-spacing: .18em; margin-bottom: 12px;
  }
  .pp-eyebrow-line { flex: 1; height: 1.5px; background: #E8E0D0; }

  /* ── BOOK SECTION ────────────────────────────────────────────── */
  .pp-book-section { padding: 80px 0; background: #FFFBEA; }
  .pp-book-subtitle { font-size: 15px; color: #9B8F7A; font-weight: 600; margin-bottom: 48px; }

  /* ── 3D PASSPORT BOOK ────────────────────────────────────────── */
  .pb-scene {
    display: flex; flex-direction: column; align-items: center; gap: 24px;
    perspective: 1200px;
  }
  .pb-book {
    display: flex; position: relative;
    width: 640px; height: 420px;
    filter: drop-shadow(0 24px 48px rgba(0,0,0,.22));
    transition: transform .35s cubic-bezier(.16,1,.3,1);
  }
  .pb-book:hover { transform: translateY(-4px) rotateX(2deg); }
  .pb-flipping-next { animation: pageFlipNext .35s cubic-bezier(.4,0,.2,1) forwards; }
  .pb-flipping-prev { animation: pageFlipPrev .35s cubic-bezier(.4,0,.2,1) forwards; }

  /* Left (cover) side */
  .pb-cover-left {
    width: 52px; min-width: 52px; height: 100%; background: #111110;
    border-radius: 12px 0 0 12px; position: relative; overflow: hidden;
    border-right: 3px solid #1a1a1a;
    display: flex; align-items: center; justify-content: center;
  }
  .pb-cover-left::before {
    content: '';
    position: absolute; inset: 0;
    background: repeating-linear-gradient(
      to bottom, transparent, transparent 18px,
      rgba(255,212,0,.06) 18px, rgba(255,212,0,.06) 19px
    );
  }
  .pb-cover-spine { writing-mode: vertical-rl; text-orientation: mixed; transform: rotate(180deg); }
  .pb-spine-text {
    font-size: 8px; font-weight: 900; color: #FFD400;
    letter-spacing: .25em; text-transform: uppercase; opacity: .7;
  }

  /* Right (page) side */
  .pb-page-right {
    flex: 1; height: 100%; background: #FFFBEA;
    border-radius: 0 12px 12px 0; overflow: hidden;
    border: 2.5px solid #111110; border-left: none;
    position: relative;
    background-image: repeating-linear-gradient(
      to bottom, transparent, transparent 27px,
      #E8E0D0 27px, #E8E0D0 28px
    );
  }
  .pb-page-right::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
    background: linear-gradient(to right, rgba(0,0,0,.08), transparent);
  }

  .pb-page-content {
    position: absolute; inset: 0; padding: 24px 28px 40px;
    overflow-y: auto; scrollbar-width: thin;
    scrollbar-color: #E8E0D0 transparent;
  }

  /* Cover page */
  .pb-page-cover-content { padding: 0; display: flex; flex-direction: column; }
  .pb-page-cover-img {
    height: 220px; background: #F5F0E8; position: relative; overflow: hidden;
    flex-shrink: 0;
  }
  .pb-page-cover-img::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,.4) 100%);
  }
  .pb-cover-verified-badge {
    position: absolute; top: 12px; right: 12px; z-index: 2;
    display: flex; align-items: center; gap: 4px;
    background: rgba(22,163,74,.9); color: #fff;
    font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 99px;
    letter-spacing: .08em;
  }
  .pb-no-img {
    width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
    background: #F5F0E8;
  }
  .pb-page-cover-info { padding: 16px 20px 20px; flex: 1; }
  .pb-page-tag {
    font-size: 9px; font-weight: 800; color: rgba(255,212,0,.7);
    letter-spacing: .25em; text-transform: uppercase; margin-bottom: 6px;
  }
  .pb-page-cover-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px; font-weight: 900; color: #111110;
    letter-spacing: -.5px; line-height: 1.1; margin-bottom: 6px;
  }
  .pb-page-cover-artist { font-size: 13px; font-weight: 700; color: #5C5346; margin-bottom: 4px; }
  .pb-page-cover-meta { font-size: 11px; font-weight: 600; color: #9B8F7A; margin-bottom: 12px; }
  .pb-cert-pill {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 9px; font-weight: 800; color: #9B8F7A;
    background: #F5F0E8; border: 1px solid #E8E0D0; border-radius: 99px;
    padding: 3px 10px; font-family: monospace; letter-spacing: .1em;
  }

  /* Page header */
  .pb-page-header {
    display: flex; align-items: center; gap: 6px;
    font-size: 9px; font-weight: 900; color: #9B8F7A;
    text-transform: uppercase; letter-spacing: .2em;
    margin-bottom: 16px; padding-bottom: 10px;
    border-bottom: 1.5px solid #E8E0D0;
  }

  /* Identity page */
  .pb-id-thumb {
    width: 90px; height: 110px; float: left; margin: 0 16px 8px 0;
    border: 2px solid #111110; border-radius: 8px; overflow: hidden;
    box-shadow: 3px 3px 0 #111110; background: #F5F0E8; flex-shrink: 0;
  }
  .pb-id-fields { overflow: hidden; }
  .pb-id-field {
    display: flex; flex-direction: column; padding: 4px 0;
    border-bottom: 1px solid #F5F0E8;
  }
  .pb-id-label {
    font-size: 7px; font-weight: 800; color: #C0B8A8;
    text-transform: uppercase; letter-spacing: .16em;
  }
  .pb-id-value { font-size: 12px; font-weight: 700; color: #111110; }
  .pb-mrz {
    clear: both; margin-top: 14px; background: #F5F0E8; border-radius: 6px;
    padding: 8px 10px; font-family: monospace; font-size: 8px; font-weight: 600;
    color: #C0B8A8; letter-spacing: .05em; line-height: 1.7;
    word-break: break-all; border-top: 1.5px dashed #E8E0D0;
  }

  /* Auth page */
  .pb-seal {
    width: 140px; height: 140px; border-radius: 50%;
    border: 2.5px solid #E8E0D0; margin: 0 auto 20px;
    display: flex; align-items: center; justify-content: center;
    position: relative; background: #fff;
    box-shadow: 0 4px 24px rgba(0,0,0,.06);
    transition: all .4s;
  }
  .pb-seal-verified {
    border-color: #16A34A;
    animation: sealPulse 3s ease-in-out infinite;
  }
  .pb-seal-ring1 { position: absolute; inset: 8px; border-radius: 50%; border: 1px dashed #E8E0D0; }
  .pb-seal-ring2 { position: absolute; inset: 16px; border-radius: 50%; border: 1px dashed rgba(0,0,0,.05); }
  .pb-seal-inner { text-align: center; z-index: 2; }
  .pb-seal-status { font-size: 11px; font-weight: 900; letter-spacing: .06em; }
  .pb-auth-details { display: flex; flex-direction: column; gap: 0; }
  .pb-auth-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 6px 0; border-bottom: 1px solid #F5F0E8; gap: 8px;
  }
  .pb-auth-lbl { font-size: 9px; font-weight: 800; color: #C0B8A8; text-transform: uppercase; letter-spacing: .14em; flex-shrink: 0; }
  .pb-auth-val { font-size: 12px; font-weight: 700; color: #111110; text-align: right; font-family: monospace; }
  .pb-auth-notes { padding: 8px 0; }

  /* Provenance timeline */
  .pb-timeline { display: flex; flex-direction: column; }
  .pb-timeline-item { display: flex; gap: 10px; position: relative; padding-bottom: 14px; }
  .pb-timeline-dot {
    width: 22px; height: 22px; border-radius: 50%;
    border: 1.5px solid; display: flex; align-items: center; justify-content: center;
    font-size: 9px; flex-shrink: 0; background: #fff; z-index: 1;
  }
  .pb-timeline-line {
    position: absolute; left: 10px; top: 22px; bottom: 0; width: 1.5px;
    background: #E8E0D0;
  }
  .pb-timeline-content { flex: 1; min-width: 0; }
  .pb-timeline-type { font-size: 11px; font-weight: 900; letter-spacing: .04em; }
  .pb-timeline-date { font-size: 10px; font-weight: 600; color: #9B8F7A; margin-top: 1px; }
  .pb-timeline-owner { font-size: 11px; font-weight: 700; color: #111110; margin-top: 2px; }
  .pb-timeline-loc { display: flex; align-items: center; gap: 3px; font-size: 10px; color: #9B8F7A; margin-top: 2px; }
  .pb-timeline-notes { font-size: 10px; color: #5C5346; line-height: 1.5; margin-top: 3px; font-style: italic; }

  /* Exhibitions page */
  .pb-exhibitions { display: flex; flex-direction: column; gap: 10px; }
  .pb-ex-card {
    display: flex; gap: 10px; padding: 10px;
    background: #fff; border: 1.5px solid #E8E0D0; border-radius: 10px;
    box-shadow: 2px 2px 0 #E0D8CA;
  }
  .pb-ex-img {
    width: 48px; height: 48px; border-radius: 6px;
    border: 1.5px solid #E8E0D0; overflow: hidden; flex-shrink: 0;
    background: #F5F0E8;
  }
  .pb-ex-info { flex: 1; min-width: 0; }
  .pb-ex-title { font-size: 12px; font-weight: 800; color: #111110; margin-bottom: 3px; }
  .pb-ex-venue { display: flex; align-items: center; gap: 3px; font-size: 10px; color: #9B8F7A; margin-bottom: 2px; }
  .pb-ex-dates { display: flex; align-items: center; gap: 3px; font-size: 10px; color: #9B8F7A; }

  /* Empty */
  .pb-empty-state {
    text-align: center; padding: 40px 20px;
    font-size: 12px; color: #C0B8A8; font-weight: 600;
    border: 1.5px dashed #E8E0D0; border-radius: 12px;
  }

  /* Page number */
  .pb-page-number {
    position: absolute; bottom: 12px; right: 20px;
    font-size: 9px; font-weight: 700; color: #C0B8A8;
    letter-spacing: .1em;
  }

  /* Navigation */
  .pb-nav {
    display: flex; align-items: center; gap: 16px;
  }
  .pb-nav-btn {
    width: 40px; height: 40px; border-radius: 50%;
    background: #111110; color: #FFD400; border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all .2s;
    box-shadow: 2px 2px 0 rgba(0,0,0,.2);
  }
  .pb-nav-btn:hover:not(:disabled) { background: #FFD400; color: #111110; transform: scale(1.08); }
  .pb-nav-btn:disabled { background: #E8E0D0; color: #C0B8A8; cursor: not-allowed; box-shadow: none; }
  .pb-dots { display: flex; gap: 6px; }
  .pb-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #E8E0D0; cursor: pointer; transition: all .2s;
  }
  .pb-dot.active { background: #111110; transform: scale(1.3); }
  .pb-hint { font-size: 11px; color: #C0B8A8; font-weight: 600; letter-spacing: .05em; }

  /* ── DETAILS SECTION ─────────────────────────────────────────── */
  .pp-details-section { padding: 80px 0; background: #F5F0E8; border-top: 2px solid #E8E0D0; }
  .pp-details-grid { display: grid; grid-template-columns: 1fr 320px; gap: 40px; align-items: start; }
  .pp-details-desc {
    background: #fff; border: 2px solid #E8E0D0; border-radius: 16px;
    padding: 28px; box-shadow: 3px 3px 0 #E0D8CA;
    font-size: 15px; color: #5C5346; line-height: 1.8; font-weight: 500;
  }
  .pp-details-stats { display: flex; flex-direction: column; gap: 12px; }
  .pp-stat {
    background: #fff; border: 2px solid #E8E0D0; border-radius: 14px;
    padding: 16px 20px; display: flex; align-items: center; gap: 14px;
    box-shadow: 2px 3px 0 #E0D8CA; transition: all .2s;
  }
  .pp-stat:hover { box-shadow: 4px 5px 0 #111110; transform: translate(-1px,-1px); border-color: #111110; }
  .pp-stat-icon { font-size: 24px; flex-shrink: 0; }
  .pp-stat-num { font-size: 26px; font-weight: 900; color: #111110; letter-spacing: -1px; }
  .pp-stat-lbl { font-size: 11px; font-weight: 700; color: #9B8F7A; text-transform: uppercase; letter-spacing: .1em; }

  /* ── VERIFY SECTION ──────────────────────────────────────────── */
  .pp-verify-section { padding: 80px 0; background: #111110; }
  .pp-verify-card {
    display: grid; grid-template-columns: 1fr 280px;
    background: rgba(255,255,255,.03); border: 1.5px solid rgba(255,255,255,.08);
    border-radius: 24px; overflow: hidden;
  }
  .pp-verify-left { padding: 40px 48px; }
  .pp-verify-left .pp-section-eyebrow { color: rgba(255,212,0,.5); }
  .pp-verify-left .pp-eyebrow-line { background: rgba(255,255,255,.08); }
  .pp-verify-title {
    font-family: 'Playfair Display', serif;
    font-size: 40px; font-weight: 900; color: #fff; line-height: .95;
    margin-bottom: 16px; letter-spacing: -1px;
  }
  .pp-verify-sub { font-size: 14px; color: rgba(255,255,255,.4); font-weight: 600; line-height: 1.7; margin-bottom: 24px; }
  .pp-cert-row { margin-bottom: 24px; }
  .pp-cert-label { font-size: 9px; font-weight: 800; color: rgba(255,255,255,.3); text-transform: uppercase; letter-spacing: .16em; margin-bottom: 4px; }
  .pp-cert-value { font-family: monospace; font-size: 13px; font-weight: 700; color: #FFD400; letter-spacing: .1em; }
  .pp-verify-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .pp-btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; background: #FFD400; color: #111110;
    border: none; border-radius: 10px; font-size: 13px; font-weight: 800;
    cursor: pointer; font-family: inherit; transition: all .2s;
  }
  .pp-btn-primary:hover { background: #FFC200; transform: translateY(-1px); }
  .pp-btn-secondary {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; background: transparent; color: rgba(255,255,255,.5);
    border: 1.5px solid rgba(255,255,255,.15); border-radius: 10px;
    font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all .2s;
  }
  .pp-btn-secondary:hover { border-color: rgba(255,255,255,.4); color: rgba(255,255,255,.8); }
  .pp-qr-inline { margin-top: 20px; }
  .pp-verify-right {
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,212,0,.03); border-left: 1px solid rgba(255,255,255,.06);
    padding: 40px;
  }
  .pp-verify-stamp {
    width: 160px; height: 160px; border-radius: 50%;
    border: 2px dashed rgba(255,212,0,.2);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .pp-verify-stamp.verified { border-color: rgba(255,212,0,.4); }
  .pp-stamp-ring {
    position: absolute; inset: -14px; border-radius: 50%;
    border: 1px dashed rgba(255,212,0,.1);
  }

  /* ── FOOTER ──────────────────────────────────────────────────── */
  .pp-footer { background: #0a0a0a; padding: 20px 0; border-top: 2px solid rgba(255,255,255,.05); }
  .pp-footer-inner {
    max-width: 900px; margin: 0 auto; padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }

  /* ── QR MODAL ────────────────────────────────────────────────── */
  .pp-qr-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,.7); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
  }
  .pp-qr-modal {
    background: #FFFBEA; border: 2.5px solid #111110; border-radius: 24px;
    padding: 40px; text-align: center; box-shadow: 8px 8px 0 #111110;
    position: relative; max-width: 340px;
  }
  .pp-qr-close {
    position: absolute; top: 14px; right: 14px;
    background: #F5F0E8; border: 1.5px solid #E8E0D0; border-radius: 50%;
    width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #111110; transition: all .2s;
  }
  .pp-qr-close:hover { background: #111110; color: #fff; }

  /* ── RESPONSIVE ──────────────────────────────────────────────── */
  @media (max-width: 700px) {
    .pb-book { width: 340px; height: 380px; }
    .pb-cover-left { width: 36px; min-width: 36px; }
    .pb-page-cover-img { height: 160px; }
    .pp-hero-content { padding: 0 24px 60px; }
    .pp-details-grid { grid-template-columns: 1fr; }
    .pp-verify-card { grid-template-columns: 1fr; }
    .pp-verify-right { display: none; }
    .pp-verify-left { padding: 32px 24px; }
  }
`;
