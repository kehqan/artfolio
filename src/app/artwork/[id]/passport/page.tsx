"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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
  artist?: Artist;
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
  try { return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
}
function fmtDateShort(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric" }); }
  catch { return d; }
}

// ── Reveal hook ────────────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

// ══════════════════════════════════════════════════════════════════
// 3D PASSPORT BOOK
// ══════════════════════════════════════════════════════════════════
function PassportBook({
  artwork, artist, provenance, exhibitions,
}: {
  artwork: Artwork; artist: Artist | null;
  provenance: ProvenanceEntry[]; exhibitions: Exhibition[];
}) {
  const [page, setPage] = useState(0);
  const [animDir, setAnimDir] = useState<"next" | "prev" | null>(null);
  const mainImg = Array.isArray(artwork.images) ? artwork.images[0] : null;
  const isVerified = artwork.authentication_status && artwork.authentication_status !== "pending";
  const authCfg = AUTH_CFG[artwork.authentication_status || "pending"];
  const dims = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean);

  const pages = [
    "cover", "identity", "authentication", "provenance",
    ...(exhibitions.length ? ["exhibitions"] : []),
  ];
  const total = pages.length;

  function goTo(dir: "next" | "prev") {
    const next = dir === "next" ? page + 1 : page - 1;
    if (next < 0 || next >= total || animDir !== null) return;
    setAnimDir(dir);
    setTimeout(() => { setPage(next); setAnimDir(null); }, 320);
  }

  const bookClass = ["pb-book", animDir ? `pb-flip-${animDir}` : ""].filter(Boolean).join(" ");

  return (
    <div className="pb-scene">
      <div className={bookClass}>
        {/* Spine */}
        <div className="pb-spine">
          <span className="pb-spine-label">ARTOMANGO · ARTWORK PASSPORT</span>
        </div>

        {/* Page */}
        <div className="pb-page">
          {/* Ruled lines background */}
          <div className="pb-ruled" />

          {/* COVER PAGE */}
          {pages[page] === "cover" && (
            <div className="pb-content pb-cover-layout">
              <div className="pb-cover-img-wrap">
                {mainImg
                  ? <img src={mainImg} alt={artwork.title} className="pb-cover-img" />
                  : <div className="pb-no-img"><ImageIcon size={40} color="#D4C9A8" /></div>
                }
                {isVerified && (
                  <div className="pb-verified-chip">
                    <CheckCircle2 size={11} /> Verified
                  </div>
                )}
              </div>
              <div className="pb-cover-body">
                <div className="pb-cover-eyebrow">🥭 Artomango Artwork Passport</div>
                <div className="pb-cover-title">{artwork.title}</div>
                {artist && <div className="pb-cover-artist">by {artist.full_name}</div>}
                <div className="pb-cover-meta">
                  {[artwork.year, artwork.medium].filter(Boolean).join(" · ")}
                </div>
                {artwork.certificate_id && (
                  <div className="pb-cert-chip">
                    <Fingerprint size={9} /> {artwork.certificate_id}
                  </div>
                )}
              </div>
              <div className="pb-page-num">Page 1 of {total}</div>
            </div>
          )}

          {/* IDENTITY PAGE */}
          {pages[page] === "identity" && (
            <div className="pb-content">
              <div className="pb-page-hdr">
                <Award size={12} /> Identity
              </div>
              <div className="pb-id-layout">
                <div className="pb-id-photo">
                  {mainImg
                    ? <img src={mainImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div className="pb-no-img" style={{ height: "100%" }}><ImageIcon size={24} color="#D4C9A8" /></div>
                  }
                </div>
                <div className="pb-id-fields">
                  {[
                    { label: "Title",       value: artwork.title },
                    { label: "Artist",      value: artist?.full_name },
                    { label: "Year",        value: artwork.year?.toString() },
                    { label: "Medium",      value: artwork.medium },
                    { label: "Dimensions",  value: dims.length ? dims.join(" × ") + " cm" : null },
                    { label: "Status",      value: artwork.status },
                    { label: "Framed",      value: artwork.framed ? "Yes" : null },
                    { label: "Editions",    value: artwork.editions?.toString() },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label} className="pb-field">
                      <div className="pb-field-label">{f.label}</div>
                      <div className="pb-field-value">{f.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pb-mrz">
                <div>P&lt;ART&lt;{(artwork.title || "UNTITLED").toUpperCase().replace(/\s/g, "<").slice(0, 26)}&lt;&lt;&lt;</div>
                <div>{(artwork.certificate_id || "AM00000000000XXXXX").slice(0, 18)}&lt;&lt;{artwork.year || "0000"}&lt;&lt;</div>
              </div>
              <div className="pb-page-num">Page 2 of {total}</div>
            </div>
          )}

          {/* AUTHENTICATION PAGE */}
          {pages[page] === "authentication" && (
            <div className="pb-content">
              <div className="pb-page-hdr">
                <Shield size={12} /> Authentication
              </div>
              <div className="pb-seal-wrap">
                <div className={`pb-seal ${isVerified ? "verified" : ""}`}>
                  <div className="pb-seal-r1" />
                  <div className="pb-seal-r2" />
                  <div className="pb-seal-core">
                    <div className="pb-seal-icon">{isVerified ? "✦" : "○"}</div>
                    <div className="pb-seal-label" style={{ color: authCfg.color }}>{authCfg.label}</div>
                  </div>
                </div>
              </div>
              <div className="pb-auth-rows">
                {[
                  { k: "Status",           v: authCfg.label },
                  { k: "Authenticated by", v: artwork.authenticated_by },
                  { k: "Date",             v: fmtDate(artwork.authentication_date) },
                  { k: "Certificate ID",   v: artwork.certificate_id },
                ].filter(r => r.v).map(r => (
                  <div key={r.k} className="pb-auth-row">
                    <span className="pb-auth-k">{r.k}</span>
                    <span className="pb-auth-v">{r.v}</span>
                  </div>
                ))}
                {artwork.authentication_notes && (
                  <div className="pb-auth-notes">{artwork.authentication_notes}</div>
                )}
              </div>
              <div className="pb-page-num">Page 3 of {total}</div>
            </div>
          )}

          {/* PROVENANCE PAGE */}
          {pages[page] === "provenance" && (
            <div className="pb-content">
              <div className="pb-page-hdr">
                <Fingerprint size={12} /> Provenance History
              </div>
              {provenance.length === 0 ? (
                <div className="pb-empty">No provenance entries recorded yet.</div>
              ) : (
                <div className="pb-timeline">
                  {provenance.map((p, i) => {
                    const cfg = EVT_CFG[p.event_type] || { label: p.event_type, icon: "·", color: "#9B8F7A" };
                    return (
                      <div key={p.id} className="pb-tl-item">
                        <div className="pb-tl-dot" style={{ color: cfg.color, borderColor: cfg.color + "60" }}>
                          {cfg.icon}
                        </div>
                        {i < provenance.length - 1 && <div className="pb-tl-line" />}
                        <div className="pb-tl-body">
                          <div className="pb-tl-type" style={{ color: cfg.color }}>{cfg.label}</div>
                          {p.date && <div className="pb-tl-date">{fmtDate(p.date)}</div>}
                          {p.owner_name && !p.is_anonymous && <div className="pb-tl-owner">{p.owner_name}</div>}
                          {p.location && <div className="pb-tl-loc"><MapPin size={8} />{p.location}</div>}
                          {p.notes && <div className="pb-tl-notes">{p.notes}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pb-page-num">Page {pages.indexOf("provenance") + 1} of {total}</div>
            </div>
          )}

          {/* EXHIBITIONS PAGE */}
          {pages[page] === "exhibitions" && (
            <div className="pb-content">
              <div className="pb-page-hdr">
                <Building2 size={12} /> Exhibition History
              </div>
              <div className="pb-exh-list">
                {exhibitions.map(ex => (
                  <div key={ex.id} className="pb-exh-card">
                    {ex.cover_image && (
                      <div className="pb-exh-img">
                        <img src={ex.cover_image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                    <div className="pb-exh-info">
                      <div className="pb-exh-title">{ex.title}</div>
                      {(ex.gallery_name || ex.venue) && (
                        <div className="pb-exh-venue"><Building2 size={9} />{ex.gallery_name || ex.venue}</div>
                      )}
                      {ex.start_date && (
                        <div className="pb-exh-date"><CalendarDays size={9} />{fmtDateShort(ex.start_date)}{ex.end_date ? ` – ${fmtDateShort(ex.end_date)}` : ""}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pb-page-num">Page {total} of {total}</div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="pb-controls">
        <button className="pb-btn" onClick={() => goTo("prev")} disabled={page === 0 || animDir !== null}>
          <ChevronLeft size={16} />
        </button>
        <div className="pb-dots">
          {pages.map((_, i) => (
            <button
              key={i}
              className={`pb-dot ${i === page ? "active" : ""}`}
              onClick={() => {
                if (i === page || animDir !== null) return;
                setAnimDir(i > page ? "next" : "prev");
                setTimeout(() => { setPage(i); setAnimDir(null); }, 320);
              }}
            />
          ))}
        </div>
        <button className="pb-btn" onClick={() => goTo("next")} disabled={page === total - 1 || animDir !== null}>
          <ChevronRight size={16} />
        </button>
      </div>
      <p className="pb-hint">Tap arrows or dots to turn pages</p>
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

  const heroR    = useReveal();
  const bookR    = useReveal();
  const verifyR  = useReveal();

  useEffect(() => {
    if (!artworkId) return;
    // ── KEY FIX: fetch via API route (server-side, bypasses RLS) ──
    fetch(`/api/artworks/${artworkId}/passport`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        const aw = data.artwork;
        const ar = aw?.artist ?? null;
        // Strip nested artist from artwork object
        if (aw) delete aw.artist;
        setArtwork(aw);
        setArtist(ar);
        setProvenance(data.provenance || []);
        setExhibitions(data.exhibitions || []);
        setViewCount(data.viewCount || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Passport fetch error:", err);
        setError("Failed to load passport");
        setLoading(false);
      });
  }, [artworkId]);

  function copyUrl() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const mainImg = Array.isArray(artwork?.images) ? artwork!.images![0] : null;
  const isVerified = artwork?.authentication_status && artwork.authentication_status !== "pending";
  const authCfg = AUTH_CFG[artwork?.authentication_status || "pending"];
  const qrUrl = typeof window !== "undefined" && artwork?.certificate_id
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(window.location.href)}&bgcolor=FFFBEA&color=111110&margin=16`
    : null;

  // ── LOADING ──────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="pp-fullscreen pp-center">
        <div className="pp-loader-box">
          <div className="pp-loader-shine" />
          <div className="pp-loader-emoji">🥭</div>
          <div className="pp-loader-text">Loading Passport…</div>
          <div className="pp-loader-bar"><div className="pp-loader-fill" /></div>
        </div>
      </div>
    </>
  );

  // ── ERROR ────────────────────────────────────────────────────────
  if (error || !artwork) return (
    <>
      <style>{CSS}</style>
      <div className="pp-fullscreen pp-center">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", marginBottom: 8 }}>Passport not found</div>
          <div style={{ fontSize: 14, color: "#9B8F7A", marginBottom: 24 }}>{error || "This artwork doesn't exist."}</div>
          <Link href="/" className="pp-home-btn">← Back to Artomango</Link>
        </div>
      </div>
    </>
  );

  // ── PAGE ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>

      {/* HERO */}
      <section className="pp-hero">
        {mainImg && (
          <div className="pp-hero-bg">
            <img src={mainImg} alt="" />
          </div>
        )}
        <div className="pp-hero-overlay" />
        <div className={`pp-hero-content pp-reveal${heroR.visible ? " is-visible" : ""}`} ref={heroR.ref}>
          <div className="pp-hero-top">
            <Link href="/" className="pp-back">🥭 Artomango</Link>
            {isVerified && (
              <span className="pp-verified-badge"><CheckCircle2 size={11} /> Verified Artwork</span>
            )}
          </div>
          <h1 className="pp-hero-title">{artwork.title}</h1>
          {artist && (
            <div className="pp-hero-artist">
              <div className="pp-hero-avatar">
                {artist.avatar_url
                  ? <img src={artist.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} />
                  : (artist.full_name || "A")[0]
                }
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{artist.full_name}</div>
                {artist.location && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin size={10} /> {artist.location}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="pp-hero-meta">
            {artwork.year && <span>{artwork.year}</span>}
            {artwork.medium && <><span className="pp-dot">·</span><span>{artwork.medium}</span></>}
            <span className="pp-dot">·</span>
            <span style={{ color: authCfg.color }}>{authCfg.icon} {authCfg.label}</span>
          </div>
        </div>
        <div className="pp-scroll-hint">↓ scroll to explore</div>
      </section>

      {/* PASSPORT BOOK */}
      <section className="pp-section pp-book-section">
        <div className={`pp-container pp-reveal${bookR.visible ? " is-visible" : ""}`} ref={bookR.ref}>
          <div className="pp-eyebrow">
            <Fingerprint size={13} /> Digital Artwork Passport
            <span className="pp-eyebrow-line" />
          </div>
          <p className="pp-sub">Flip through the pages to explore the full history and authentication of this artwork.</p>
          <PassportBook artwork={artwork} artist={artist} provenance={provenance} exhibitions={exhibitions} />
        </div>
      </section>

      {/* ABOUT + STATS */}
      {(artwork.description || provenance.length > 0 || exhibitions.length > 0) && (
        <section className="pp-section pp-details-section">
          <div className="pp-container">
            <div className="pp-details-grid">
              {artwork.description && (
                <div className="pp-desc-card">
                  <div className="pp-card-label"><Award size={12} /> About this work</div>
                  <p className="pp-desc-text">{artwork.description}</p>
                </div>
              )}
              <div className="pp-stats-col">
                {[
                  { icon: "📜", n: provenance.length, label: "Provenance entries" },
                  { icon: "🏛️", n: exhibitions.length, label: "Exhibitions" },
                  { icon: "👁", n: viewCount, label: "Passport views" },
                ].map(s => (
                  <div key={s.label} className="pp-stat-card">
                    <div className="pp-stat-icon">{s.icon}</div>
                    <div className="pp-stat-n">{s.n}</div>
                    <div className="pp-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* VERIFY */}
      <section className="pp-section pp-verify-section">
        <div className={`pp-container pp-reveal${verifyR.visible ? " is-visible" : ""}`} ref={verifyR.ref}>
          <div className="pp-verify-card">
            <div className="pp-verify-left">
              <div className="pp-eyebrow" style={{ color: "rgba(255,212,0,0.5)" }}>
                <Shield size={13} /> Verification
                <span className="pp-eyebrow-line" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>
              <h3 className="pp-verify-title">Verify this<br/>artwork.</h3>
              <p className="pp-verify-sub">This digital passport is the certificate of authenticity. Share or scan to verify provenance.</p>
              <div className="pp-cert-row">
                <div className="pp-cert-label">Certificate ID</div>
                <div className="pp-cert-val">{artwork.certificate_id || "—"}</div>
              </div>
              <div className="pp-verify-btns">
                <button onClick={copyUrl} className="pp-btn-gold">
                  {copied ? <><Check size={13} /> Copied!</> : <><Share2 size={13} /> Share Passport</>}
                </button>
                {artwork.certificate_id && (
                  <button onClick={() => setShowQR(p => !p)} className="pp-btn-ghost">
                    <QrCode size={13} /> {showQR ? "Hide QR" : "Show QR"}
                  </button>
                )}
              </div>
              {showQR && qrUrl && (
                <div style={{ marginTop: 20 }}>
                  <img src={qrUrl} alt="QR" style={{ width: 160, height: 160, borderRadius: 12, border: "2px solid rgba(255,255,255,0.1)" }} />
                </div>
              )}
            </div>
            <div className="pp-verify-right">
              <div className={`pp-stamp ${isVerified ? "verified" : ""}`}>
                <div className="pp-stamp-ring" />
                <div className="pp-stamp-body">
                  <div style={{ fontSize: 32 }}>{isVerified ? "✦" : "○"}</div>
                  <div className="pp-stamp-label">{authCfg.label}</div>
                  <div className="pp-stamp-brand">ARTOMANGO</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pp-footer">
        <span style={{ fontSize: 18 }}>🥭</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#FFD400" }}>Artomango</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>Artwork Passport · Certificate of Authenticity</span>
      </footer>

      {/* QR MODAL */}
      {showQR && qrUrl && (
        <div className="pp-qr-bg" onClick={() => setShowQR(false)}>
          <div className="pp-qr-box" onClick={e => e.stopPropagation()}>
            <button className="pp-qr-close" onClick={() => setShowQR(false)}><X size={15} /></button>
            <div style={{ fontSize: 22, marginBottom: 8 }}>🥭</div>
            <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>Scan to verify</div>
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
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-family: 'Darker Grotesque', system-ui, sans-serif; scroll-behavior: smooth; }
  body { background: #FFFBEA; color: #111110; overflow-x: hidden; }

  @keyframes loaderSlide { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
  @keyframes sealPulse { 0%,100%{box-shadow:0 0 0 0 rgba(22,163,74,.25)} 50%{box-shadow:0 0 0 16px rgba(22,163,74,0)} }
  @keyframes flipNext { 0%{transform:perspective(900px) rotateY(0deg)} 100%{transform:perspective(900px) rotateY(-20deg) scaleX(0.97)} }
  @keyframes flipPrev { 0%{transform:perspective(900px) rotateY(-20deg) scaleX(0.97)} 100%{transform:perspective(900px) rotateY(0deg)} }

  .pp-reveal { opacity:0; transform:translateY(24px); transition:opacity .65s ease, transform .65s cubic-bezier(.16,1,.3,1); }
  .pp-reveal.is-visible { opacity:1; transform:none; }

  /* ── LOADER ─────────────────────────────────────────────────── */
  .pp-fullscreen { min-height:100vh; background:#FFFBEA; font-family:'Darker Grotesque',system-ui,sans-serif; }
  .pp-center { display:flex; align-items:center; justify-content:center; }
  .pp-loader-box {
    background:#fff; border:2.5px solid #111110; border-radius:20px;
    padding:48px 56px; text-align:center; position:relative; overflow:hidden;
    box-shadow:8px 8px 0 #D4C9A8;
  }
  .pp-loader-shine {
    position:absolute; top:0; left:0; right:0; height:3px;
    background:linear-gradient(90deg,transparent,#FFD400,transparent);
    animation:loaderSlide 1.4s ease-in-out infinite;
  }
  .pp-loader-emoji { font-size:48px; margin-bottom:14px; }
  .pp-loader-text { font-size:16px; font-weight:800; color:#111110; margin-bottom:20px; letter-spacing:.04em; }
  .pp-loader-bar { height:4px; background:#E8E0D0; border-radius:99px; overflow:hidden; width:160px; margin:0 auto; }
  .pp-loader-fill { height:100%; background:#FFD400; border-radius:99px; animation:loaderSlide 1.2s ease-in-out infinite; }

  .pp-home-btn {
    display:inline-block; padding:10px 24px; background:#FFD400;
    border:2.5px solid #111110; border-radius:12px; font-size:14px;
    font-weight:800; text-decoration:none; color:#111110;
    box-shadow:3px 3px 0 #111110;
  }

  /* ── HERO ────────────────────────────────────────────────────── */
  .pp-hero {
    position:relative; min-height:92vh;
    display:flex; flex-direction:column; justify-content:flex-end;
    background:#111110; overflow:hidden;
  }
  .pp-hero-bg {
    position:absolute; inset:0; z-index:0;
  }
  .pp-hero-bg img {
    width:100%; height:100%; object-fit:cover;
    filter:brightness(.5) saturate(.75); transform:scale(1.04);
  }
  .pp-hero-overlay {
    position:absolute; inset:0; z-index:1;
    background:linear-gradient(to bottom, rgba(0,0,0,.05) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,.5) 70%, rgba(0,0,0,.88) 100%);
  }
  .pp-hero-content {
    position:relative; z-index:2;
    padding:0 48px 72px; max-width:1100px; margin:0 auto; width:100%;
  }
  .pp-hero-top {
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:40px;
  }
  .pp-back {
    font-size:13px; font-weight:800; color:rgba(255,255,255,.55);
    text-decoration:none; padding:6px 14px; border-radius:99px;
    border:1px solid rgba(255,255,255,.15); backdrop-filter:blur(8px);
    transition:color .2s, border-color .2s;
  }
  .pp-back:hover { color:#FFD400; border-color:rgba(255,212,0,.4); }
  .pp-verified-badge {
    display:inline-flex; align-items:center; gap:5px;
    font-size:11px; font-weight:800; color:#4ADE80; letter-spacing:.1em; text-transform:uppercase;
    padding:5px 14px; border-radius:99px;
    background:rgba(22,163,74,.15); border:1.5px solid rgba(22,163,74,.35);
  }
  .pp-hero-title {
    font-family:'Playfair Display',Georgia,serif;
    font-size:clamp(38px,7vw,78px); font-weight:900; color:#fff;
    letter-spacing:-2px; line-height:.92; margin-bottom:20px;
    text-shadow:0 2px 40px rgba(0,0,0,.3);
  }
  .pp-hero-artist { display:flex; align-items:center; gap:12px; margin-bottom:14px; }
  .pp-hero-avatar {
    width:40px; height:40px; border-radius:12px; flex-shrink:0; overflow:hidden;
    border:2px solid rgba(255,255,255,.25); background:#FFD400;
    display:flex; align-items:center; justify-content:center;
    font-size:16px; font-weight:900; color:#111110;
  }
  .pp-hero-meta { font-size:14px; font-weight:600; color:rgba(255,255,255,.4); }
  .pp-dot { margin:0 7px; opacity:.4; }
  .pp-scroll-hint {
    position:absolute; bottom:20px; left:50%; transform:translateX(-50%);
    font-size:10px; font-weight:800; letter-spacing:.2em; color:rgba(255,255,255,.25);
    text-transform:uppercase; z-index:2;
  }

  /* ── SECTIONS ────────────────────────────────────────────────── */
  .pp-section { padding:80px 0; }
  .pp-book-section { background:#FFFBEA; }
  .pp-details-section { background:#F5F0E8; border-top:2px solid #E8E0D0; }
  .pp-verify-section { background:#111110; }
  .pp-container { max-width:860px; margin:0 auto; padding:0 24px; }
  .pp-eyebrow {
    display:flex; align-items:center; gap:7px;
    font-size:11px; font-weight:800; color:#9B8F7A;
    text-transform:uppercase; letter-spacing:.18em; margin-bottom:10px;
  }
  .pp-eyebrow-line { flex:1; height:1.5px; background:#E8E0D0; }
  .pp-sub { font-size:15px; color:#9B8F7A; font-weight:600; margin-bottom:44px; }

  /* ── PASSPORT BOOK ───────────────────────────────────────────── */
  .pb-scene { display:flex; flex-direction:column; align-items:center; gap:20px; }
  .pb-book {
    display:flex; width:660px; height:420px;
    filter:drop-shadow(0 20px 44px rgba(0,0,0,.2));
    transition:transform .3s cubic-bezier(.16,1,.3,1);
  }
  .pb-book:hover { transform:translateY(-3px); }
  .pb-flip-next { animation:flipNext .32s cubic-bezier(.4,0,.2,1) forwards; }
  .pb-flip-prev { animation:flipPrev .32s cubic-bezier(.4,0,.2,1) forwards; }

  .pb-spine {
    width:48px; min-width:48px; height:100%;
    background:#111110; border-radius:12px 0 0 12px;
    border-right:3px solid #1e1e1e;
    display:flex; align-items:center; justify-content:center; overflow:hidden;
    background-image:repeating-linear-gradient(to bottom,transparent,transparent 16px,rgba(255,212,0,.05) 16px,rgba(255,212,0,.05) 17px);
  }
  .pb-spine-label {
    writing-mode:vertical-rl; transform:rotate(180deg);
    font-size:7px; font-weight:900; color:rgba(255,212,0,.5);
    letter-spacing:.28em; text-transform:uppercase;
  }
  .pb-page {
    flex:1; height:100%; position:relative; overflow:hidden;
    background:#FFFBEA; border-radius:0 12px 12px 0;
    border:2.5px solid #111110; border-left:none;
  }
  .pb-ruled {
    position:absolute; inset:0; pointer-events:none; z-index:0;
    background-image:repeating-linear-gradient(to bottom,transparent,transparent 26px,#E8E0D0 26px,#E8E0D0 27px);
  }
  .pb-page::before {
    content:''; position:absolute; left:0; top:0; bottom:0; width:3px;
    background:linear-gradient(to right,rgba(0,0,0,.06),transparent); z-index:1;
  }
  .pb-content {
    position:absolute; inset:0; z-index:2;
    padding:22px 26px 38px; overflow-y:auto;
    scrollbar-width:thin; scrollbar-color:#E8E0D0 transparent;
  }

  /* Cover */
  .pb-cover-layout { display:flex; flex-direction:column; padding:0; }
  .pb-cover-img-wrap {
    height:210px; flex-shrink:0; background:#F5F0E8; position:relative; overflow:hidden;
  }
  .pb-cover-img { width:100%; height:100%; object-fit:cover; }
  .pb-cover-img-wrap::after {
    content:''; position:absolute; inset:0;
    background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.35) 100%);
  }
  .pb-no-img { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#F5F0E8; }
  .pb-verified-chip {
    position:absolute; top:10px; right:10px; z-index:3;
    display:flex; align-items:center; gap:4px;
    background:rgba(22,163,74,.9); color:#fff; font-size:10px; font-weight:800;
    padding:3px 9px; border-radius:99px; letter-spacing:.06em;
  }
  .pb-cover-body { padding:14px 18px 14px; flex:1; }
  .pb-cover-eyebrow { font-size:8px; font-weight:800; color:rgba(255,212,0,.6); letter-spacing:.25em; text-transform:uppercase; margin-bottom:5px; }
  .pb-cover-title { font-family:'Playfair Display',serif; font-size:20px; font-weight:900; color:#111110; letter-spacing:-.4px; line-height:1.1; margin-bottom:5px; }
  .pb-cover-artist { font-size:13px; font-weight:700; color:#5C5346; margin-bottom:4px; }
  .pb-cover-meta { font-size:11px; font-weight:600; color:#9B8F7A; margin-bottom:10px; }
  .pb-cert-chip {
    display:inline-flex; align-items:center; gap:4px;
    font-size:8px; font-weight:700; color:#9B8F7A; font-family:monospace;
    background:#F5F0E8; border:1px solid #E8E0D0; border-radius:99px; padding:2px 9px;
  }

  /* Page header */
  .pb-page-hdr {
    display:flex; align-items:center; gap:5px;
    font-size:8px; font-weight:900; color:#9B8F7A; text-transform:uppercase; letter-spacing:.2em;
    padding-bottom:10px; margin-bottom:14px; border-bottom:1.5px solid #E8E0D0;
  }
  .pb-page-num { position:absolute; bottom:10px; right:16px; font-size:8px; font-weight:700; color:#C0B8A8; }

  /* Identity */
  .pb-id-layout { display:flex; gap:14px; margin-bottom:10px; }
  .pb-id-photo { width:80px; min-width:80px; height:100px; border:2px solid #111110; border-radius:7px; overflow:hidden; background:#F5F0E8; box-shadow:3px 3px 0 #111110; }
  .pb-id-fields { flex:1; display:flex; flex-direction:column; }
  .pb-field { padding:3px 0; border-bottom:1px solid #F0EAE0; }
  .pb-field-label { font-size:7px; font-weight:800; color:#C0B8A8; text-transform:uppercase; letter-spacing:.14em; }
  .pb-field-value { font-size:12px; font-weight:700; color:#111110; }
  .pb-mrz {
    background:#F5F0E8; border-radius:6px; padding:7px 10px;
    font-family:monospace; font-size:8px; font-weight:600; color:#C0B8A8;
    letter-spacing:.06em; line-height:1.7; word-break:break-all;
    border-top:1.5px dashed #E8E0D0; margin-top:10px;
  }

  /* Auth */
  .pb-seal-wrap { display:flex; justify-content:center; margin:8px 0 16px; }
  .pb-seal {
    width:120px; height:120px; border-radius:50%; position:relative;
    border:2.5px solid #E8E0D0; background:#fff;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 20px rgba(0,0,0,.06);
    transition:border-color .4s, box-shadow .4s;
  }
  .pb-seal.verified { border-color:#16A34A; animation:sealPulse 3s ease-in-out infinite; }
  .pb-seal-r1 { position:absolute; inset:8px; border-radius:50%; border:1px dashed #E8E0D0; }
  .pb-seal-r2 { position:absolute; inset:16px; border-radius:50%; border:1px dashed rgba(0,0,0,.04); }
  .pb-seal-core { text-align:center; z-index:2; }
  .pb-seal-icon { font-size:26px; margin-bottom:3px; }
  .pb-seal-label { font-size:10px; font-weight:900; letter-spacing:.05em; }
  .pb-auth-rows { display:flex; flex-direction:column; }
  .pb-auth-row { display:flex; justify-content:space-between; align-items:baseline; padding:5px 0; border-bottom:1px solid #F5F0E8; gap:8px; }
  .pb-auth-k { font-size:8px; font-weight:800; color:#C0B8A8; text-transform:uppercase; letter-spacing:.13em; flex-shrink:0; }
  .pb-auth-v { font-size:11px; font-weight:700; color:#111110; font-family:monospace; text-align:right; word-break:break-all; }
  .pb-auth-notes { font-size:10px; color:#5C5346; line-height:1.5; margin-top:6px; font-style:italic; }

  /* Timeline */
  .pb-timeline { display:flex; flex-direction:column; }
  .pb-tl-item { display:flex; gap:9px; position:relative; padding-bottom:12px; }
  .pb-tl-dot {
    width:20px; height:20px; min-width:20px; border-radius:50%;
    border:1.5px solid; display:flex; align-items:center; justify-content:center;
    font-size:8px; background:#fff; z-index:1;
  }
  .pb-tl-line { position:absolute; left:9px; top:20px; bottom:0; width:1.5px; background:#E8E0D0; }
  .pb-tl-body { flex:1; min-width:0; }
  .pb-tl-type { font-size:11px; font-weight:900; }
  .pb-tl-date { font-size:10px; color:#9B8F7A; font-weight:600; margin-top:1px; }
  .pb-tl-owner { font-size:11px; font-weight:700; color:#111110; }
  .pb-tl-loc { display:flex; align-items:center; gap:3px; font-size:9px; color:#9B8F7A; margin-top:1px; }
  .pb-tl-notes { font-size:10px; color:#5C5346; line-height:1.5; margin-top:2px; font-style:italic; }

  /* Exhibitions */
  .pb-exh-list { display:flex; flex-direction:column; gap:8px; }
  .pb-exh-card { display:flex; gap:10px; padding:9px; background:#fff; border:1.5px solid #E8E0D0; border-radius:9px; box-shadow:2px 2px 0 #E0D8CA; }
  .pb-exh-img { width:44px; height:44px; min-width:44px; border-radius:6px; border:1.5px solid #E8E0D0; overflow:hidden; background:#F5F0E8; }
  .pb-exh-info { flex:1; }
  .pb-exh-title { font-size:12px; font-weight:800; color:#111110; margin-bottom:2px; }
  .pb-exh-venue, .pb-exh-date { display:flex; align-items:center; gap:3px; font-size:9px; color:#9B8F7A; margin-top:1px; }

  .pb-empty { text-align:center; padding:32px; font-size:12px; color:#C0B8A8; border:1.5px dashed #E8E0D0; border-radius:10px; }

  /* Book controls */
  .pb-controls { display:flex; align-items:center; gap:14px; }
  .pb-btn {
    width:38px; height:38px; border-radius:50%; border:none;
    background:#111110; color:#FFD400; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    transition:all .2s; box-shadow:2px 2px 0 rgba(0,0,0,.15);
  }
  .pb-btn:hover:not(:disabled) { background:#FFD400; color:#111110; transform:scale(1.1); }
  .pb-btn:disabled { background:#E8E0D0; color:#C0B8A8; cursor:not-allowed; box-shadow:none; }
  .pb-dots { display:flex; gap:5px; }
  .pb-dot {
    width:7px; height:7px; border-radius:50%; border:none; padding:0;
    background:#E8E0D0; cursor:pointer; transition:all .2s;
  }
  .pb-dot.active { background:#111110; transform:scale(1.35); }
  .pb-hint { font-size:11px; color:#C0B8A8; font-weight:600; }

  /* ── DETAILS ─────────────────────────────────────────────────── */
  .pp-details-grid { display:grid; grid-template-columns:1fr 260px; gap:28px; align-items:start; }
  .pp-desc-card { background:#fff; border:2px solid #E8E0D0; border-radius:16px; padding:26px; box-shadow:3px 3px 0 #E0D8CA; }
  .pp-card-label { display:flex; align-items:center; gap:6px; font-size:10px; font-weight:800; color:#9B8F7A; text-transform:uppercase; letter-spacing:.16em; margin-bottom:12px; }
  .pp-desc-text { font-size:14px; color:#5C5346; line-height:1.8; font-weight:500; }
  .pp-stats-col { display:flex; flex-direction:column; gap:10px; }
  .pp-stat-card { background:#fff; border:2px solid #E8E0D0; border-radius:12px; padding:14px 16px; display:flex; align-items:center; gap:12px; box-shadow:2px 2px 0 #E0D8CA; transition:all .2s; }
  .pp-stat-card:hover { box-shadow:4px 4px 0 #111110; border-color:#111110; transform:translate(-1px,-1px); }
  .pp-stat-icon { font-size:22px; }
  .pp-stat-n { font-size:24px; font-weight:900; color:#111110; letter-spacing:-1px; }
  .pp-stat-label { font-size:10px; font-weight:700; color:#9B8F7A; text-transform:uppercase; letter-spacing:.1em; }

  /* ── VERIFY ──────────────────────────────────────────────────── */
  .pp-verify-card { display:grid; grid-template-columns:1fr 260px; background:rgba(255,255,255,.03); border:1.5px solid rgba(255,255,255,.08); border-radius:22px; overflow:hidden; }
  .pp-verify-left { padding:40px 44px; }
  .pp-verify-title { font-family:'Playfair Display',serif; font-size:38px; font-weight:900; color:#fff; line-height:.95; margin-bottom:14px; letter-spacing:-1px; }
  .pp-verify-sub { font-size:14px; color:rgba(255,255,255,.38); font-weight:600; line-height:1.7; margin-bottom:22px; }
  .pp-cert-row { margin-bottom:22px; }
  .pp-cert-label { font-size:9px; font-weight:800; color:rgba(255,255,255,.25); text-transform:uppercase; letter-spacing:.16em; margin-bottom:4px; }
  .pp-cert-val { font-family:monospace; font-size:13px; font-weight:700; color:#FFD400; letter-spacing:.1em; }
  .pp-verify-btns { display:flex; gap:8px; flex-wrap:wrap; }
  .pp-btn-gold { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; background:#FFD400; color:#111110; border:none; border-radius:9px; font-size:13px; font-weight:800; cursor:pointer; font-family:inherit; transition:all .2s; }
  .pp-btn-gold:hover { background:#FFC400; transform:translateY(-1px); }
  .pp-btn-ghost { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; background:transparent; color:rgba(255,255,255,.45); border:1.5px solid rgba(255,255,255,.12); border-radius:9px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:all .2s; }
  .pp-btn-ghost:hover { border-color:rgba(255,255,255,.35); color:rgba(255,255,255,.75); }
  .pp-verify-right { display:flex; align-items:center; justify-content:center; background:rgba(255,212,0,.03); border-left:1px solid rgba(255,255,255,.06); }
  .pp-stamp { width:150px; height:150px; border-radius:50%; border:2px dashed rgba(255,212,0,.18); display:flex; align-items:center; justify-content:center; position:relative; }
  .pp-stamp.verified { border-color:rgba(255,212,0,.4); }
  .pp-stamp-ring { position:absolute; inset:-12px; border-radius:50%; border:1px dashed rgba(255,212,0,.08); }
  .pp-stamp-body { text-align:center; }
  .pp-stamp-label { font-size:10px; font-weight:900; color:rgba(255,212,0,.6); letter-spacing:.1em; text-transform:uppercase; margin-top:5px; }
  .pp-stamp-brand { font-size:8px; font-weight:800; color:rgba(255,255,255,.2); letter-spacing:.25em; text-transform:uppercase; margin-top:3px; }

  /* ── FOOTER ──────────────────────────────────────────────────── */
  .pp-footer { background:#0a0a0a; padding:18px 32px; border-top:2px solid rgba(255,255,255,.04); display:flex; align-items:center; gap:10px; }

  /* ── QR ──────────────────────────────────────────────────────── */
  .pp-qr-bg { position:fixed; inset:0; z-index:999; background:rgba(0,0,0,.7); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; }
  .pp-qr-box { background:#FFFBEA; border:2.5px solid #111110; border-radius:22px; padding:36px; text-align:center; box-shadow:8px 8px 0 #111110; position:relative; max-width:320px; }
  .pp-qr-close { position:absolute; top:12px; right:12px; width:30px; height:30px; border-radius:50%; background:#F5F0E8; border:1.5px solid #E8E0D0; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#111110; transition:all .2s; }
  .pp-qr-close:hover { background:#111110; color:#fff; }

  /* ── RESPONSIVE ──────────────────────────────────────────────── */
  @media (max-width: 720px) {
    .pb-book { width:100%; max-width:360px; height:400px; }
    .pb-spine { width:32px; min-width:32px; }
    .pb-cover-img-wrap { height:160px; }
    .pp-hero-content { padding:0 20px 56px; }
    .pp-hero-title { font-size:clamp(32px,10vw,56px); }
    .pp-details-grid { grid-template-columns:1fr; }
    .pp-verify-card { grid-template-columns:1fr; }
    .pp-verify-right { display:none; }
    .pp-verify-left { padding:28px 22px; }
  }
`;
