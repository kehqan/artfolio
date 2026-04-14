"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Shield, CheckCircle2, Clock, MapPin, ExternalLink,
  Copy, Check, ChevronDown, Eye, ArrowLeft, Star,
  Award, Fingerprint, History, CalendarDays, Building2,
  QrCode, Share2, X, ImageIcon,
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
const AUTH_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  original:        { label: "Original Work",    color: "#16A34A", bg: "#DCFCE7", icon: "✦" },
  limited_edition: { label: "Limited Edition",  color: "#CA8A04", bg: "#FEF9C3", icon: "◈" },
  reproduction:    { label: "Reproduction",     color: "#9B8F7A", bg: "#F5F0E8", icon: "◇" },
  pending:         { label: "Pending Review",   color: "#9B8F7A", bg: "#F5F0E8", icon: "○" },
};

const EVENT_TYPE_CFG: Record<string, { label: string; icon: string; color: string }> = {
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

// ── Scroll reveal hook ─────────────────────────────────────────────
function useReveal(threshold = 0.12) {
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
  }, [threshold]);
  return { ref, visible };
}

// ── Parallax image hook ────────────────────────────────────────────
function useParallax(factor = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onScroll() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const offset = (rect.top / window.innerHeight) * factor * 100;
      const img = ref.current.querySelector("img") as HTMLImageElement | null;
      if (img) img.style.transform = `translateY(${offset}px) scale(1.1)`;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [factor]);
  return ref;
}

// ════════════════════════════════════════════════════════════════════
export default function ArtworkPassportPage() {
  const params = useParams<{ id: string }>();
  const artworkId = params?.id;

  const [artwork, setArtwork]         = useState<Artwork | null>(null);
  const [artist, setArtist]           = useState<Artist | null>(null);
  const [provenance, setProvenance]   = useState<ProvenanceEntry[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [viewCount, setViewCount]     = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [copied, setCopied]           = useState(false);
  const [showQR, setShowQR]           = useState(false);

  const coverRef     = useParallax(0.25);
  const identityR    = useReveal(0.1);
  const authR        = useReveal(0.1);
  const provenanceR  = useReveal(0.08);
  const exhibitionsR = useReveal(0.1);
  const verifyR      = useReveal(0.15);

  useEffect(() => {
    if (!artworkId) return;
    loadPassport();
  }, [artworkId]);

  async function loadPassport() {
    const sb = createClient();

    // 1. Fetch artwork
    const { data: aw, error: awErr } = await sb
      .from("artworks").select("*").eq("id", artworkId).single();
    if (awErr || !aw) { setError("Artwork not found"); setLoading(false); return; }
    setArtwork(aw);

    // 2. Fetch artist profile
    const { data: prof } = await sb
      .from("profiles")
      .select("id, full_name, username, role, bio, location, avatar_url, website, instagram")
      .eq("id", aw.user_id).single();
    setArtist(prof);

    // 3. Fetch provenance
    const { data: prov } = await sb
      .from("provenance_entries").select("*")
      .eq("artwork_id", artworkId).order("date", { ascending: true });
    setProvenance(prov || []);

    // 4. Fetch exhibitions via junction
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

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";
  const qrUrl = pageUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pageUrl)}&bgcolor=FFFBEA&color=111110&margin=20`
    : "";

  if (loading) return (
    <div style={S.loadWrap}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.loadInner}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: "passFloat 3s ease-in-out infinite" }}>🥭</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#9B8F7A", letterSpacing: "0.2em", textTransform: "uppercase" }}>Loading passport…</div>
        <div style={{ width: 120, height: 2, background: "#E8E0D0", marginTop: 16, borderRadius: 1, overflow: "hidden" }}>
          <div style={{ width: "60%", height: "100%", background: "#FFD400", animation: "passLoad 1.5s ease-in-out infinite" }} />
        </div>
      </div>
    </div>
  );

  if (error || !artwork) return (
    <div style={S.loadWrap}>
      <style>{GLOBAL_CSS}</style>
      <div style={S.loadInner}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: "#111110", marginBottom: 6 }}>Passport not found</div>
        <div style={{ fontSize: 13, color: "#9B8F7A", marginBottom: 28 }}>{error || "This artwork doesn't exist."}</div>
        <Link href="/" style={{ textDecoration: "none" }}>
          <button style={{ padding: "10px 24px", background: "#FFD400", border: "2.5px solid #111110", borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "3px 3px 0 #111110" }}>← Go Home</button>
        </Link>
      </div>
    </div>
  );

  const authCfg = AUTH_STATUS_CFG[artwork.authentication_status || "pending"];
  const dims = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean);
  const mainImg = Array.isArray(artwork.images) ? artwork.images[0] : null;

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* ══════════════════════════════════════════════════════════════
          FIXED NAV
      ══════════════════════════════════════════════════════════════ */}
      <nav className="pp-nav">
        <div className="pp-nav-inner">
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <span style={{ fontSize: 18 }}>🥭</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: "#111110" }}>artomango</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div className="pp-nav-badge">
              <Fingerprint size={11} />
              Digital Passport
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            <button onClick={() => setShowQR(p => !p)} className="pp-icon-btn">
              <QrCode size={14} />
            </button>
            <button onClick={copyUrl} className="pp-icon-btn">
              {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} />}
            </button>
            {artist?.username && (
              <Link href={`/${artist.username}`} style={{ textDecoration: "none" }}>
                <button className="pp-nav-cta">View Artist →</button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1: COVER — Full-width cinematic hero
      ══════════════════════════════════════════════════════════════ */}
      <section className="pp-cover" ref={coverRef}>
        {mainImg ? (
          <img src={mainImg} alt={artwork.title} className="pp-cover-img" />
        ) : (
          <div className="pp-cover-fallback">
            <ImageIcon size={80} color="#D4C9A8" />
          </div>
        )}
        <div className="pp-cover-overlay" />
        <div className="pp-cover-grain" />

        {/* Content overlay */}
        <div className="pp-cover-content">
          {/* Verified badge */}
          {artwork.authentication_status && artwork.authentication_status !== "pending" && (
            <div className="pp-verified-badge pp-fade-up pp-d1">
              <Shield size={12} />
              Verified Artwork
            </div>
          )}

          <h1 className="pp-cover-title pp-fade-up pp-d2">{artwork.title}</h1>

          {artist && (
            <div className="pp-cover-artist pp-fade-up pp-d3">
              <div className="pp-cover-avatar">
                {artist.avatar_url
                  ? <img src={artist.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : (artist.full_name || "A")[0]
                }
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{artist.full_name}</div>
                {artist.location && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={10} /> {artist.location}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pp-cover-meta pp-fade-up pp-d4">
            {artwork.year && <span>{artwork.year}</span>}
            {artwork.medium && <><span className="pp-meta-dot">·</span><span>{artwork.medium}</span></>}
          </div>

          {/* Certificate ID watermark */}
          <div className="pp-cover-cert-id pp-fade-up pp-d5">
            {artwork.certificate_id || "—"}
          </div>
        </div>

        {/* Scroll hint */}
        <div className="pp-scroll-hint">
          <ChevronDown size={18} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2: IDENTITY — Passport-style identity card
      ══════════════════════════════════════════════════════════════ */}
      <section className="pp-section pp-section-identity" ref={identityR.ref}>
        <div className={`pp-container pp-reveal${identityR.visible ? " visible" : ""}`}>

          <div className="pp-section-label">
            <Award size={14} />
            <span>Artwork Identity</span>
            <div className="pp-section-line" />
          </div>

          <div className="pp-identity-grid">
            {/* Left: passport card */}
            <div className="pp-passport-card">
              {/* Passport header bar */}
              <div className="pp-passport-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🥭</span>
                  <div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,212,0,0.5)", letterSpacing: "0.3em", textTransform: "uppercase" }}>Artomango</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#FFD400", letterSpacing: "0.08em" }}>ARTWORK PASSPORT</div>
                  </div>
                </div>
                <div className="pp-passport-cert-id">
                  {artwork.certificate_id || "—"}
                </div>
              </div>

              {/* Passport body */}
              <div className="pp-passport-body">
                {/* Thumbnail */}
                <div className="pp-passport-thumb">
                  {mainImg
                    ? <img src={mainImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F3" }}><ImageIcon size={32} color="#D4C9A8" /></div>
                  }
                  {/* Verification seal overlay */}
                  {artwork.authentication_status !== "pending" && (
                    <div className="pp-passport-seal">
                      <CheckCircle2 size={10} />
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="pp-passport-fields">
                  {[
                    { label: "Title",      value: artwork.title },
                    { label: "Artist",     value: artist?.full_name },
                    { label: "Year",       value: artwork.year },
                    { label: "Medium",     value: artwork.medium },
                    { label: "Dimensions", value: dims.length ? dims.join(" × ") + " cm" : null },
                    { label: "Framed",     value: artwork.framed ? "Yes" : null },
                    { label: "Editions",   value: artwork.editions ? `${artwork.editions} edition${artwork.editions > 1 ? "s" : ""}` : null },
                    { label: "Status",     value: artwork.status },
                  ].filter(f => f.value).map((f, i) => (
                    <div key={f.label} className="pp-passport-field" style={{ animationDelay: `${0.1 + i * 0.04}s` }}>
                      <div className="pp-field-label">{f.label}</div>
                      <div className="pp-field-value">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passport footer with MRZ-style code */}
              <div className="pp-passport-mrz">
                <span>P&lt;ARTOMANGO&lt;{(artwork.title || "").toUpperCase().replace(/\s/g, "&lt;").slice(0, 30)}</span>
                <span>{artwork.certificate_id || "AM-00000000-XXXXX"}&lt;&lt;&lt;&lt;{artwork.year || "0000"}</span>
              </div>
            </div>

            {/* Right: description + stats */}
            <div className="pp-identity-right">
              {artwork.description && (
                <div className="pp-identity-desc">
                  <div className="pp-desc-label">About This Work</div>
                  <p className="pp-desc-text">{artwork.description}</p>
                </div>
              )}

              <div className="pp-identity-stats">
                {[
                  { label: "Provenance Entries", value: provenance.length, icon: "📜" },
                  { label: "Exhibitions", value: exhibitions.length, icon: "🏛️" },
                  { label: "Passport Views", value: viewCount, icon: "👁" },
                ].map(s => (
                  <div key={s.label} className="pp-stat-card">
                    <div className="pp-stat-emoji">{s.icon}</div>
                    <div className="pp-stat-num">{s.value}</div>
                    <div className="pp-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3: AUTHENTICATION — Seal & status
      ══════════════════════════════════════════════════════════════ */}
      <section className="pp-section pp-section-auth" ref={authR.ref}>
        <div className={`pp-container pp-reveal${authR.visible ? " visible" : ""}`}>

          <div className="pp-section-label">
            <Shield size={14} />
            <span>Authentication</span>
            <div className="pp-section-line" />
          </div>

          <div className="pp-auth-grid">
            {/* Seal */}
            <div className="pp-auth-seal-wrap">
              <div className={`pp-auth-seal ${artwork.authentication_status !== "pending" ? "verified" : ""}`}>
                <div className="pp-seal-ring pp-seal-ring-1" />
                <div className="pp-seal-ring pp-seal-ring-2" />
                <div className="pp-seal-inner">
                  <div className="pp-seal-icon">{authCfg.icon}</div>
                  <div className="pp-seal-status">{authCfg.label}</div>
                  {artwork.authentication_status !== "pending" && (
                    <div className="pp-seal-check"><CheckCircle2 size={14} /></div>
                  )}
                </div>
                <div className="pp-seal-text-ring">
                  {"ARTOMANGO · CERTIFICATE OF AUTHENTICITY · ".split("").map((c, i) => (
                    <span key={i} style={{ transform: `rotate(${i * 8.5}deg)`, transformOrigin: "0 80px" }}>{c}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="pp-auth-details">
              <div className="pp-auth-status-badge" style={{ background: authCfg.bg, color: authCfg.color, borderColor: authCfg.color }}>
                <span className="pp-auth-status-icon">{authCfg.icon}</span>
                {authCfg.label}
              </div>

              <div className="pp-auth-fields">
                {[
                  { label: "Authenticated By", value: artwork.authenticated_by, icon: <Award size={14} /> },
                  { label: "Authentication Date", value: fmtDate(artwork.authentication_date), icon: <CalendarDays size={14} /> },
                  { label: "Certificate ID", value: artwork.certificate_id, icon: <Fingerprint size={14} />, mono: true },
                ].filter(f => f.value).map(f => (
                  <div key={f.label} className="pp-auth-field">
                    <div className="pp-auth-field-icon">{f.icon}</div>
                    <div>
                      <div className="pp-auth-field-label">{f.label}</div>
                      <div className={`pp-auth-field-value${f.mono ? " mono" : ""}`}>{f.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {artwork.authentication_notes && (
                <div className="pp-auth-notes">
                  <div className="pp-auth-notes-label">Notes</div>
                  <p className="pp-auth-notes-text">{artwork.authentication_notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4: PROVENANCE TIMELINE
      ══════════════════════════════════════════════════════════════ */}
      <section className="pp-section pp-section-provenance" ref={provenanceR.ref}>
        <div className={`pp-container pp-reveal${provenanceR.visible ? " visible" : ""}`}>

          <div className="pp-section-label">
            <History size={14} />
            <span>Provenance History</span>
            <div className="pp-section-line" />
          </div>

          {provenance.length === 0 ? (
            <div className="pp-empty">
              <div style={{ fontSize: 36, marginBottom: 10 }}>📜</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#111110" }}>No provenance recorded yet</div>
              <div style={{ fontSize: 13, color: "#9B8F7A", marginTop: 4 }}>The history of this artwork will appear here as entries are added.</div>
            </div>
          ) : (
            <div className="pp-timeline">
              <div className="pp-timeline-line" />
              {provenance.map((entry, i) => {
                const cfg = EVENT_TYPE_CFG[entry.event_type] || EVENT_TYPE_CFG.created;
                return (
                  <div
                    key={entry.id}
                    className="pp-timeline-entry"
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {/* Dot */}
                    <div className="pp-timeline-dot" style={{ background: cfg.color, borderColor: cfg.color }}>
                      <span className="pp-timeline-dot-icon">{cfg.icon}</span>
                    </div>

                    {/* Card */}
                    <div className="pp-timeline-card">
                      <div className="pp-timeline-card-header">
                        <span className="pp-timeline-type" style={{ background: cfg.color + "18", color: cfg.color, borderColor: cfg.color + "40" }}>
                          {cfg.label}
                        </span>
                        {entry.date && (
                          <span className="pp-timeline-date">{fmtDate(entry.date)}</span>
                        )}
                      </div>
                      <div className="pp-timeline-card-body">
                        {entry.owner_name && !entry.is_anonymous && (
                          <div className="pp-timeline-owner">{entry.owner_name}</div>
                        )}
                        {entry.is_anonymous && (
                          <div className="pp-timeline-owner" style={{ fontStyle: "italic", color: "#9B8F7A" }}>Private collection</div>
                        )}
                        {entry.location && (
                          <div className="pp-timeline-location">
                            <MapPin size={11} /> {entry.location}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="pp-timeline-notes">{entry.notes}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5: EXHIBITIONS
      ══════════════════════════════════════════════════════════════ */}
      {exhibitions.length > 0 && (
        <section className="pp-section pp-section-exhibitions" ref={exhibitionsR.ref}>
          <div className={`pp-container pp-reveal${exhibitionsR.visible ? " visible" : ""}`}>

            <div className="pp-section-label">
              <Building2 size={14} />
              <span>Exhibition History</span>
              <div className="pp-section-line" />
            </div>

            <div className="pp-exhibition-grid">
              {exhibitions.map((ex, i) => (
                <div key={ex.id} className="pp-exhibition-card" style={{ animationDelay: `${i * 0.06}s` }}>
                  {/* Cover */}
                  <div className="pp-ex-cover">
                    {ex.cover_image
                      ? <img src={ex.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF7F3", fontSize: 28 }}>🏛️</div>
                    }
                  </div>
                  <div className="pp-ex-body">
                    <div className="pp-ex-title">{ex.title}</div>
                    {(ex.venue || ex.gallery_name) && (
                      <div className="pp-ex-venue">
                        <Building2 size={11} /> {ex.gallery_name || ex.venue}
                      </div>
                    )}
                    {(ex.start_date || ex.end_date) && (
                      <div className="pp-ex-dates">
                        <CalendarDays size={11} />
                        {fmtDateShort(ex.start_date)}{ex.end_date ? ` — ${fmtDateShort(ex.end_date)}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════
          SECTION 6: VERIFICATION & SHARING
      ══════════════════════════════════════════════════════════════ */}
      <section className="pp-section pp-section-verify" ref={verifyR.ref}>
        <div className={`pp-container pp-reveal${verifyR.visible ? " visible" : ""}`}>

          <div className="pp-verify-card">
            <div className="pp-verify-left">
              <div className="pp-verify-eyebrow">
                <Fingerprint size={14} />
                Verification
              </div>
              <h3 className="pp-verify-title">
                Verify this<br />artwork.
              </h3>
              <p className="pp-verify-sub">
                This digital passport serves as the certificate of authenticity for this artwork. Share this page or use the QR code to verify provenance.
              </p>

              <div className="pp-verify-cert-row">
                <div className="pp-verify-cert-label">Certificate ID</div>
                <div className="pp-verify-cert-value">{artwork.certificate_id || "—"}</div>
              </div>

              <div className="pp-verify-actions">
                <button onClick={copyUrl} className="pp-verify-btn primary">
                  {copied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Share Passport</>}
                </button>
                <button onClick={() => setShowQR(p => !p)} className="pp-verify-btn secondary">
                  <QrCode size={14} /> {showQR ? "Hide" : "Show"} QR Code
                </button>
              </div>

              {showQR && qrUrl && (
                <div className="pp-verify-qr">
                  <img src={qrUrl} alt="Passport QR Code" style={{ width: 160, height: 160, display: "block" }} />
                  <div className="pp-verify-qr-hint">Scan to verify</div>
                </div>
              )}
            </div>

            <div className="pp-verify-right">
              <div className="pp-verify-stamp">
                <div className="pp-stamp-ring" />
                <div className="pp-stamp-inner">
                  <div style={{ fontSize: 28, marginBottom: 4 }}>🥭</div>
                  <div style={{ fontSize: 8, fontWeight: 800, color: "#FFD400", letterSpacing: "0.3em", textTransform: "uppercase" }}>Artomango</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,212,0,0.5)", letterSpacing: "0.15em", marginTop: 2 }}>CERTIFIED</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════ */}
      <footer className="pp-footer">
        <div className="pp-footer-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🥭</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#FFD400" }}>artomango</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#444" }}>· Digital Artwork Passport</span>
          </div>
          <div style={{ fontSize: 11, color: "#444", fontWeight: 600 }}>
            Certificate: {artwork.certificate_id} · Generated {fmtDate(new Date().toISOString())}
          </div>
        </div>
      </footer>

      {/* QR overlay */}
      {showQR && (
        <div className="pp-qr-overlay" onClick={() => setShowQR(false)}>
          <div className="pp-qr-modal" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowQR(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", color: "#9B8F7A" }}><X size={18} /></button>
            <div style={{ fontSize: 36, marginBottom: 14 }}>🥭</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#111110", marginBottom: 4 }}>Scan to Verify</div>
            <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 600, marginBottom: 20 }}>{artwork.title} by {artist?.full_name}</div>
            {qrUrl && <img src={qrUrl} alt="QR" style={{ width: 200, height: 200, border: "2.5px solid #111110", borderRadius: 12 }} />}
            <div style={{ fontSize: 11, color: "#C0B8A8", fontWeight: 700, marginTop: 12, fontFamily: "monospace" }}>{artwork.certificate_id}</div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Inline style constants (non-CSS) ─────────────────────────────
const S = {
  loadWrap: { minHeight: "100vh", background: "#FFFBEA", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Darker Grotesque', system-ui, sans-serif" } as React.CSSProperties,
  loadInner: { textAlign: "center" } as React.CSSProperties,
};

// ══════════════════════════════════════════════════════════════════
// CSS — The entire premium passport styling
// ══════════════════════════════════════════════════════════════════
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-family: 'Darker Grotesque', system-ui, sans-serif; scroll-behavior: smooth; }
  body { background: #FFFBEA; color: #111110; overflow-x: hidden; }

  /* ── Animations ─────────────────────────────────────────────── */
  @keyframes passFloat { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-12px) rotate(3deg)} }
  @keyframes passLoad { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
  @keyframes sealPulse { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,106,0.15)} 50%{box-shadow:0 0 0 16px rgba(22,163,106,0)} }
  @keyframes sealSpin { to{transform:rotate(360deg)} }
  @keyframes stampIn { from{opacity:0;transform:scale(0.5) rotate(-20deg)} to{opacity:1;transform:scale(1) rotate(0deg)} }
  @keyframes grainAnim { 0%,100%{transform:translate(0,0)} 10%{transform:translate(-5%,-10%)} 30%{transform:translate(3%,-15%)} 50%{transform:translate(12%,9%)} 70%{transform:translate(9%,4%)} 90%{transform:translate(-1%,7%)} }
  @keyframes scrollBob { 0%,100%{transform:translateY(0);opacity:0.6} 50%{transform:translateY(6px);opacity:1} }

  .pp-fade-up { animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) both; }
  .pp-d1 { animation-delay: 0.2s; }
  .pp-d2 { animation-delay: 0.35s; }
  .pp-d3 { animation-delay: 0.5s; }
  .pp-d4 { animation-delay: 0.65s; }
  .pp-d5 { animation-delay: 0.8s; }

  .pp-reveal { opacity: 0; transform: translateY(32px); transition: opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1); }
  .pp-reveal.visible { opacity: 1; transform: none; }

  /* ── NAV ─────────────────────────────────────────────────────── */
  .pp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    background: rgba(255,251,234,0.88);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 2px solid #111110;
  }
  .pp-nav-inner {
    max-width: 1100px; margin: 0 auto; padding: 0 24px; height: 52px;
    display: flex; align-items: center; gap: 12;
  }
  .pp-nav-badge {
    display: flex; align-items: center; gap: 5;
    background: #111110; color: #FFD400;
    padding: 4px 12px; border-radius: 9999px;
    font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  }
  .pp-icon-btn {
    width: 34px; height: 34px; border-radius: 9999px;
    border: 2px solid #E8E0D0; background: #fff;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #111110; transition: all 0.15s;
  }
  .pp-icon-btn:hover { border-color: #111110; box-shadow: 2px 2px 0 #111110; transform: translateY(-1px); }
  .pp-nav-cta {
    padding: 7px 16px; background: #FFD400; border: 2px solid #111110;
    border-radius: 9999px; font-family: inherit; font-size: 12px;
    font-weight: 800; color: #111110; cursor: pointer; transition: all 0.15s;
  }
  .pp-nav-cta:hover { box-shadow: 2px 2px 0 #111110; transform: translateY(-1px); }

  /* ── COVER ───────────────────────────────────────────────────── */
  .pp-cover {
    position: relative; width: 100%; height: 100vh; min-height: 600px;
    overflow: hidden; border-bottom: 3px solid #111110;
  }
  .pp-cover-img {
    position: absolute; inset: 0; width: 100%; height: 120%;
    object-fit: cover; object-position: center;
    will-change: transform;
  }
  .pp-cover-fallback {
    position: absolute; inset: 0; background: #F5F0E8;
    display: flex; align-items: center; justify-content: center;
  }
  .pp-cover-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(0,0,0,0.15) 0%,
      rgba(0,0,0,0.02) 40%,
      rgba(0,0,0,0.55) 80%,
      rgba(0,0,0,0.8) 100%
    );
  }
  .pp-cover-grain {
    position: absolute; inset: -50%; z-index: 1;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    opacity: 0.03;
    animation: grainAnim 8s steps(10) infinite;
    pointer-events: none;
  }
  .pp-cover-content {
    position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
    padding: 0 48px 64px;
    max-width: 1100px; margin: 0 auto;
  }
  .pp-verified-badge {
    display: inline-flex; align-items: center; gap: 6;
    padding: 5px 14px; border-radius: 9999px;
    background: rgba(22,163,106,0.2); border: 1.5px solid rgba(22,163,106,0.4);
    color: #4ADE80; font-size: 11px; font-weight: 800;
    letter-spacing: 0.12em; text-transform: uppercase;
    backdrop-filter: blur(8px); margin-bottom: 16px;
  }
  .pp-cover-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: clamp(42px, 7vw, 80px); font-weight: 900;
    color: #fff; letter-spacing: -2px; line-height: 0.92;
    margin-bottom: 20px;
    text-shadow: 0 2px 40px rgba(0,0,0,0.3);
  }
  .pp-cover-artist {
    display: flex; align-items: center; gap: 12; margin-bottom: 16;
  }
  .pp-cover-avatar {
    width: 40px; height: 40px; border-radius: 12px;
    border: 2px solid rgba(255,255,255,0.3); overflow: hidden;
    background: #FFD400; display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 900; color: #111110; flex-shrink: 0;
  }
  .pp-cover-meta {
    font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.45); letter-spacing: 0.05em;
  }
  .pp-meta-dot { margin: 0 8px; opacity: 0.4; }
  .pp-cover-cert-id {
    font-family: monospace; font-size: 11px; font-weight: 700;
    color: rgba(255,255,255,0.18); letter-spacing: 0.3em;
    text-transform: uppercase; margin-top: 20px;
  }
  .pp-scroll-hint {
    position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 2;
    color: rgba(255,255,255,0.35); animation: scrollBob 2s ease-in-out infinite;
  }

  /* ── SECTIONS ────────────────────────────────────────────────── */
  .pp-section { padding: 80px 0; border-bottom: 2px solid #E8E0D0; }
  .pp-container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
  .pp-section-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 11px; font-weight: 800; color: #9B8F7A;
    text-transform: uppercase; letter-spacing: 0.18em; margin-bottom: 32px;
  }
  .pp-section-line { flex: 1; height: 1.5px; background: #E8E0D0; }

  /* ── IDENTITY ────────────────────────────────────────────────── */
  .pp-section-identity { background: #FFFBEA; }
  .pp-identity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; align-items: start; }
  .pp-passport-card {
    background: #fff; border: 2.5px solid #111110;
    border-radius: 20px; overflow: hidden;
    box-shadow: 6px 8px 0 #D4C9A8;
    transition: box-shadow 0.3s, transform 0.3s;
  }
  .pp-passport-card:hover { box-shadow: 8px 10px 0 #111110; transform: translate(-1px,-2px); }
  .pp-passport-header {
    background: #111110; padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 2px solid #333;
  }
  .pp-passport-cert-id {
    font-family: monospace; font-size: 10px; font-weight: 800;
    color: #FFD400; letter-spacing: 0.15em; background: #1a1a1a;
    padding: 3px 10px; border-radius: 6px; border: 1px solid #333;
  }
  .pp-passport-body {
    display: grid; grid-template-columns: 140px 1fr; gap: 20px;
    padding: 24px 20px;
  }
  .pp-passport-thumb {
    width: 140px; height: 180px; border-radius: 12px;
    border: 2px solid #111110; overflow: hidden;
    box-shadow: 3px 3px 0 #111110; position: relative;
    background: #FAF7F3;
  }
  .pp-passport-seal {
    position: absolute; bottom: 6px; right: 6px;
    width: 22px; height: 22px; border-radius: 50%;
    background: #16A34A; border: 2px solid #fff;
    display: flex; align-items: center; justify-content: center;
    color: #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
  .pp-passport-fields { display: flex; flex-direction: column; gap: 0; }
  .pp-passport-field {
    display: flex; flex-direction: column; gap: 1px;
    padding: 7px 0; border-bottom: 1px solid #F5F0E8;
  }
  .pp-passport-field:last-child { border-bottom: none; }
  .pp-field-label {
    font-size: 8px; font-weight: 800; color: #9B8F7A;
    text-transform: uppercase; letter-spacing: 0.16em;
  }
  .pp-field-value {
    font-size: 14px; font-weight: 700; color: #111110; letter-spacing: -0.2px;
  }
  .pp-passport-mrz {
    background: #FAF7F3; border-top: 2px dashed #E8E0D0;
    padding: 10px 16px; font-family: monospace;
    font-size: 9px; font-weight: 600; color: #C0B8A8;
    letter-spacing: 0.08em; line-height: 1.6;
    display: flex; flex-direction: column;
    overflow: hidden; word-break: break-all;
  }
  .pp-identity-right { display: flex; flex-direction: column; gap: 24px; }
  .pp-identity-desc {
    background: #fff; border: 2px solid #E8E0D0; border-radius: 16px;
    padding: 24px; box-shadow: 3px 3px 0 #E0D8CA;
  }
  .pp-desc-label {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 700; color: #111110;
    margin-bottom: 12px; font-style: italic;
  }
  .pp-desc-text { font-size: 14px; color: #5C5346; line-height: 1.8; font-weight: 500; }
  .pp-identity-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .pp-stat-card {
    background: #fff; border: 2px solid #E8E0D0; border-radius: 14px;
    padding: 18px 14px; text-align: center;
    box-shadow: 2px 3px 0 #E0D8CA; transition: all 0.2s;
  }
  .pp-stat-card:hover { box-shadow: 4px 5px 0 #111110; transform: translate(-1px,-1px); border-color: #111110; }
  .pp-stat-emoji { font-size: 22px; margin-bottom: 6px; }
  .pp-stat-num { font-size: 28px; font-weight: 900; color: #111110; letter-spacing: -1px; }
  .pp-stat-label { font-size: 10px; font-weight: 700; color: #9B8F7A; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 2px; }

  /* ── AUTHENTICATION ──────────────────────────────────────────── */
  .pp-section-auth { background: #F5F0E8; }
  .pp-auth-grid { display: grid; grid-template-columns: 260px 1fr; gap: 48px; align-items: center; }
  .pp-auth-seal-wrap { display: flex; align-items: center; justify-content: center; }
  .pp-auth-seal {
    width: 200px; height: 200px; border-radius: 50%;
    background: #fff; border: 3px solid #E8E0D0;
    position: relative; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 24px rgba(0,0,0,0.06);
    transition: all 0.5s cubic-bezier(0.16,1,0.3,1);
  }
  .pp-auth-seal.verified {
    border-color: #16A34A;
    animation: sealPulse 3s ease-in-out infinite;
  }
  .pp-seal-ring { position: absolute; border-radius: 50%; border: 1.5px dashed; }
  .pp-seal-ring-1 { inset: 8px; border-color: rgba(0,0,0,0.06); }
  .pp-seal-ring-2 { inset: 16px; border-color: rgba(0,0,0,0.04); }
  .pp-seal-inner { text-align: center; z-index: 2; }
  .pp-seal-icon { font-size: 32px; font-weight: 900; color: #111110; margin-bottom: 4px; }
  .pp-seal-status { font-size: 11px; font-weight: 800; color: #9B8F7A; text-transform: uppercase; letter-spacing: 0.14em; }
  .pp-seal-check { color: #16A34A; margin-top: 6px; }
  .pp-seal-text-ring {
    position: absolute; inset: 0; animation: sealSpin 30s linear infinite;
  }
  .pp-seal-text-ring span {
    position: absolute; left: 50%; top: 0; font-size: 7px; font-weight: 800;
    color: rgba(0,0,0,0.08); letter-spacing: 0.1em; text-transform: uppercase;
    transform-origin: 0 100px;
  }
  .pp-auth-details { display: flex; flex-direction: column; gap: 20px; }
  .pp-auth-status-badge {
    display: inline-flex; align-items: center; gap: 8px; width: fit-content;
    padding: 8px 18px; border-radius: 12px; border: 2px solid;
    font-size: 15px; font-weight: 900; letter-spacing: -0.2px;
  }
  .pp-auth-status-icon { font-size: 18px; }
  .pp-auth-fields { display: flex; flex-direction: column; gap: 0; }
  .pp-auth-field {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 0; border-bottom: 1px solid #E0D8CA;
  }
  .pp-auth-field:last-child { border-bottom: none; }
  .pp-auth-field-icon { color: #9B8F7A; margin-top: 2px; flex-shrink: 0; }
  .pp-auth-field-label { font-size: 10px; font-weight: 800; color: #9B8F7A; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 2px; }
  .pp-auth-field-value { font-size: 15px; font-weight: 700; color: #111110; }
  .pp-auth-field-value.mono { font-family: monospace; letter-spacing: 0.1em; font-size: 14px; }
  .pp-auth-notes { background: #fff; border: 2px solid #E0D8CA; border-radius: 12px; padding: 16px; }
  .pp-auth-notes-label { font-size: 10px; font-weight: 800; color: #9B8F7A; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
  .pp-auth-notes-text { font-size: 13px; color: #5C5346; line-height: 1.7; font-weight: 500; }

  /* ── PROVENANCE ──────────────────────────────────────────────── */
  .pp-section-provenance { background: #FFFBEA; }
  .pp-timeline { position: relative; padding-left: 36px; }
  .pp-timeline-line {
    position: absolute; left: 13px; top: 0; bottom: 0; width: 2px;
    background: linear-gradient(to bottom, #FFD400, #E8E0D0 60%, transparent);
  }
  .pp-timeline-entry {
    position: relative; margin-bottom: 20px;
    animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both;
  }
  .pp-timeline-entry:last-child { margin-bottom: 0; }
  .pp-timeline-dot {
    position: absolute; left: -36px; top: 14px;
    width: 28px; height: 28px; border-radius: 50%;
    border: 3px solid; display: flex; align-items: center; justify-content: center;
    z-index: 2; box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .pp-timeline-dot-icon { font-size: 11px; font-weight: 900; color: #fff; }
  .pp-timeline-card {
    background: #fff; border: 2px solid #E8E0D0; border-radius: 16px;
    overflow: hidden; box-shadow: 3px 3px 0 #E0D8CA;
    transition: all 0.2s;
  }
  .pp-timeline-card:hover { border-color: #111110; box-shadow: 4px 5px 0 #111110; transform: translate(-1px,-1px); }
  .pp-timeline-card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid #F5F0E8;
  }
  .pp-timeline-type {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 9999px; border: 1.5px solid;
    font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;
  }
  .pp-timeline-date { font-size: 12px; font-weight: 600; color: #9B8F7A; }
  .pp-timeline-card-body { padding: 14px 16px; }
  .pp-timeline-owner { font-size: 15px; font-weight: 800; color: #111110; margin-bottom: 4px; }
  .pp-timeline-location {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: #9B8F7A; margin-bottom: 6px;
  }
  .pp-timeline-notes { font-size: 13px; color: #5C5346; line-height: 1.6; font-weight: 500; }

  /* ── EXHIBITIONS ─────────────────────────────────────────────── */
  .pp-section-exhibitions { background: #F5F0E8; }
  .pp-exhibition-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;
  }
  .pp-exhibition-card {
    background: #fff; border: 2.5px solid #E8E0D0; border-radius: 18px;
    overflow: hidden; box-shadow: 3px 4px 0 #D4C9A8;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both;
  }
  .pp-exhibition-card:hover { border-color: #111110; box-shadow: 5px 6px 0 #111110; transform: translate(-1px,-2px); }
  .pp-ex-cover { height: 120px; overflow: hidden; }
  .pp-ex-body { padding: 14px 16px; }
  .pp-ex-title { font-size: 15px; font-weight: 800; color: #111110; margin-bottom: 6px; letter-spacing: -0.2px; }
  .pp-ex-venue { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #9B8F7A; font-weight: 600; margin-bottom: 4px; }
  .pp-ex-dates { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #C0B8A8; font-weight: 600; }

  /* ── VERIFICATION ────────────────────────────────────────────── */
  .pp-section-verify { background: #FFFBEA; border-bottom: none; padding-bottom: 0; }
  .pp-verify-card {
    background: #111110; border: 3px solid #111110; border-radius: 24px;
    display: grid; grid-template-columns: 1fr 280px; overflow: hidden;
    box-shadow: 8px 8px 0 #FFD400;
  }
  .pp-verify-left { padding: 48px 40px; }
  .pp-verify-eyebrow {
    display: inline-flex; align-items: center; gap: 6px;
    color: #FFD400; font-size: 10px; font-weight: 800;
    letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 16px;
  }
  .pp-verify-title {
    font-family: 'Playfair Display', serif;
    font-size: clamp(28px, 4vw, 42px); font-weight: 900; color: #fff;
    letter-spacing: -1px; line-height: 1; margin-bottom: 16px;
  }
  .pp-verify-sub { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 600; line-height: 1.7; margin-bottom: 28px; max-width: 420px; }
  .pp-verify-cert-row {
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;
  }
  .pp-verify-cert-label { font-size: 9px; font-weight: 800; color: rgba(255,212,0,0.5); text-transform: uppercase; letter-spacing: 0.16em; margin-bottom: 4px; }
  .pp-verify-cert-value { font-family: monospace; font-size: 18px; font-weight: 900; color: #FFD400; letter-spacing: 0.12em; }
  .pp-verify-actions { display: flex; gap: 10px; flex-wrap: wrap; }
  .pp-verify-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 20px; border-radius: 12px;
    font-family: inherit; font-size: 13px; font-weight: 800;
    cursor: pointer; transition: all 0.15s;
  }
  .pp-verify-btn.primary { background: #FFD400; color: #111110; border: 2px solid #FFD400; }
  .pp-verify-btn.primary:hover { box-shadow: 0 0 0 3px rgba(255,212,0,0.3); }
  .pp-verify-btn.secondary { background: transparent; color: rgba(255,255,255,0.6); border: 2px solid rgba(255,255,255,0.2); }
  .pp-verify-btn.secondary:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
  .pp-verify-qr { margin-top: 20px; display: flex; align-items: center; gap: 16px; }
  .pp-verify-qr img { border-radius: 12px; border: 2px solid rgba(255,255,255,0.1); }
  .pp-verify-qr-hint { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.3); }
  .pp-verify-right {
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,212,0,0.04); border-left: 1px solid rgba(255,255,255,0.06);
  }
  .pp-verify-stamp {
    width: 140px; height: 140px; border-radius: 50%;
    border: 2px dashed rgba(255,212,0,0.2);
    display: flex; align-items: center; justify-content: center;
    position: relative; animation: stampIn 0.6s 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  .pp-stamp-ring {
    position: absolute; inset: -12px; border-radius: 50%;
    border: 1px dashed rgba(255,212,0,0.1);
  }
  .pp-stamp-inner { text-align: center; }

  /* ── EMPTY ───────────────────────────────────────────────────── */
  .pp-empty {
    text-align: center; padding: 56px 24px;
    background: #fff; border: 2px dashed #E0D8CA; border-radius: 18px;
  }

  /* ── QR OVERLAY ──────────────────────────────────────────────── */
  .pp-qr-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
  }
  .pp-qr-modal {
    background: #FFFBEA; border: 2.5px solid #111110; border-radius: 24px;
    padding: 36px; text-align: center; box-shadow: 8px 8px 0 #111110;
    position: relative; max-width: 340px;
  }

  /* ── FOOTER ──────────────────────────────────────────────────── */
  .pp-footer {
    background: #111110; padding: 24px 0; border-top: 3px solid #111110;
  }
  .pp-footer-inner {
    max-width: 1100px; margin: 0 auto; padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }

  /* ── RESPONSIVE ──────────────────────────────────────────────── */
  @media (max-width: 860px) {
    .pp-identity-grid { grid-template-columns: 1fr; }
    .pp-passport-body { grid-template-columns: 100px 1fr; }
    .pp-passport-thumb { width: 100px; height: 130px; }
    .pp-auth-grid { grid-template-columns: 1fr; gap: 32px; }
    .pp-verify-card { grid-template-columns: 1fr; }
    .pp-verify-right { padding: 32px; }
    .pp-cover-content { padding: 0 24px 48px; }
    .pp-cover-title { font-size: clamp(32px, 9vw, 56px); }
  }
  @media (max-width: 600px) {
    .pp-identity-stats { grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
    .pp-stat-card { padding: 12px 8px; }
    .pp-stat-num { font-size: 22px; }
    .pp-exhibition-grid { grid-template-columns: 1fr; }
    .pp-verify-left { padding: 32px 24px; }
  }
`;
