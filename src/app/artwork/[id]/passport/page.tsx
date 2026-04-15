"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type Artist = {
  id: string; full_name: string; username?: string;
  location?: string; avatar_url?: string;
};
type Artwork = {
  id: string; title: string; medium?: string; year?: number;
  description?: string; status: string; images?: string[];
  width_cm?: number; height_cm?: number; depth_cm?: number;
  framed?: boolean; editions?: number;
  certificate_id?: string; authentication_status?: string;
  authenticated_by?: string; authentication_date?: string;
  authentication_notes?: string;
  created_at: string; user_id: string;
  artist?: Artist;
};
type ProvenanceEntry = {
  id: string; event_type: string; owner_name?: string;
  is_anonymous?: boolean; date?: string; location?: string; notes?: string;
};

const AUTH_LABELS: Record<string, string> = {
  original: "Original Work",
  limited_edition: "Limited Edition",
  reproduction: "Reproduction",
  pending: "Pending Verification",
};

function fmt(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

export default function ArtworkPassportPage() {
  const params = useParams<{ id: string }>();
  const artworkId = params?.id;

  const [artwork, setArtwork]       = useState<Artwork | null>(null);
  const [artist, setArtist]         = useState<Artist | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceEntry[]>([]);
  const [viewCount, setViewCount]   = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    if (!artworkId) return;
    fetch(`/api/artworks/${artworkId}/passport`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return; }
        const aw = { ...data.artwork };
        const ar = aw.artist ?? null;
        delete aw.artist;
        setArtwork(aw);
        setArtist(ar);
        setProvenance(data.provenance || []);
        setViewCount(data.viewCount || 0);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load"); setLoading(false); });
  }, [artworkId]);

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="cert-loading">
        <div className="cert-loading-box">
          <div className="cert-loading-shine" />
          <div style={{ fontSize: 36, marginBottom: 12 }}>🥭</div>
          <div className="cert-loading-text">Loading Certificate…</div>
          <div className="cert-loading-bar"><div className="cert-loading-fill" /></div>
        </div>
      </div>
    </>
  );

  if (error || !artwork) return (
    <>
      <style>{CSS}</style>
      <div className="cert-loading">
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a2744", marginBottom: 8 }}>Certificate not found</div>
          <div style={{ fontSize: 14, color: "#8a9ab5" }}>{error}</div>
        </div>
      </div>
    </>
  );

  const mainImg = Array.isArray(artwork.images) ? artwork.images[0] : null;
  const isVerified = artwork.authentication_status && artwork.authentication_status !== "pending";
  const authLabel = AUTH_LABELS[artwork.authentication_status || "pending"] || "Pending";
  const dims = [artwork.width_cm, artwork.height_cm, artwork.depth_cm].filter(Boolean);
  const certId = artwork.certificate_id || "—";
  const qrUrl = typeof window !== "undefined"
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(window.location.href)}&bgcolor=f4f6fb&color=1a2744&margin=10`
    : null;

  // Owner = last non-anonymous provenance entry, or artist
  const ownerEntry = [...provenance].reverse().find(p => p.owner_name && !p.is_anonymous);
  const ownerName = ownerEntry?.owner_name || artist?.full_name || "—";

  return (
    <>
      <style>{CSS}</style>
      <div className="cert-page">
        {/* Outer border frame */}
        <div className="cert-frame">
          {/* Corner ornaments */}
          <div className="cert-corner cert-corner-tl"><Ornament /></div>
          <div className="cert-corner cert-corner-tr"><Ornament /></div>
          <div className="cert-corner cert-corner-bl"><Ornament /></div>
          <div className="cert-corner cert-corner-br"><Ornament /></div>

          {/* Inner content */}
          <div className="cert-inner">

            {/* Header */}
            <div className="cert-header">
              <div className="cert-issuer">🥭 Artomango</div>
              <div className="cert-title-block">
                <div className="cert-title">ARTWORK PASSPORT</div>
                <div className="cert-subtitle">Certificate of Authenticity</div>
              </div>
              {isVerified && (
                <div className="cert-verified-seal">
                  <div className="cert-seal-inner">
                    <div className="cert-seal-icon">✦</div>
                    <div className="cert-seal-text">VERIFIED</div>
                  </div>
                </div>
              )}
            </div>

            <div className="cert-divider" />

            {/* Artwork name */}
            <div className="cert-artwork-name">
              "{artwork.title}"
            </div>
            {artwork.description && (
              <div className="cert-artwork-desc">{artwork.description}</div>
            )}

            <div className="cert-divider cert-divider-light" />

            {/* Main info grid */}
            <div className="cert-grid">
              <div className="cert-field">
                <div className="cert-field-label">Artist</div>
                <div className="cert-field-value">{artist?.full_name || "—"}</div>
              </div>
              <div className="cert-field">
                <div className="cert-field-label">Year</div>
                <div className="cert-field-value">{artwork.year || "—"}</div>
              </div>
              <div className="cert-field">
                <div className="cert-field-label">Medium</div>
                <div className="cert-field-value">{artwork.medium || "—"}</div>
              </div>
              <div className="cert-field">
                <div className="cert-field-label">Dimensions</div>
                <div className="cert-field-value">{dims.length ? dims.join(" × ") + " cm" : "—"}</div>
              </div>
              <div className="cert-field">
                <div className="cert-field-label">Status</div>
                <div className="cert-field-value">{artwork.status || "—"}</div>
              </div>
              <div className="cert-field">
                <div className="cert-field-label">Authentication</div>
                <div className="cert-field-value cert-field-auth" style={{ color: isVerified ? "#16593a" : "#8a9ab5" }}>
                  {authLabel}
                </div>
              </div>
              {artwork.framed && (
                <div className="cert-field">
                  <div className="cert-field-label">Framed</div>
                  <div className="cert-field-value">Yes</div>
                </div>
              )}
              {artwork.editions && (
                <div className="cert-field">
                  <div className="cert-field-label">Editions</div>
                  <div className="cert-field-value">{artwork.editions}</div>
                </div>
              )}
              <div className="cert-field">
                <div className="cert-field-label">Current Owner</div>
                <div className="cert-field-value">{ownerName}</div>
              </div>
              <div className="cert-field">
                <div className="cert-field-label">Provenance Entries</div>
                <div className="cert-field-value">{provenance.length}</div>
              </div>
            </div>

            <div className="cert-divider" />

            {/* Bottom row: authenticated by + QR + serial */}
            <div className="cert-bottom">
              {/* Auth signature block */}
              <div className="cert-auth-block">
                {artwork.authenticated_by ? (
                  <>
                    <div className="cert-signature">{artwork.authenticated_by}</div>
                    <div className="cert-auth-name">{artwork.authenticated_by}</div>
                    <div className="cert-auth-role">Authentication Specialist</div>
                    {artwork.authentication_date && (
                      <div className="cert-auth-date">Date: {fmt(artwork.authentication_date)}</div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="cert-signature cert-sig-pending">—</div>
                    <div className="cert-auth-name" style={{ color: "#b0bac8" }}>Pending Authentication</div>
                    <div className="cert-auth-role">Authentication Specialist</div>
                  </>
                )}
              </div>

              {/* Artwork thumbnail */}
              {mainImg && (
                <div className="cert-artwork-thumb">
                  <img src={mainImg} alt={artwork.title} />
                </div>
              )}

              {/* QR + serial */}
              <div className="cert-qr-block">
                {qrUrl && (
                  <img src={qrUrl} alt="QR Code" className="cert-qr" />
                )}
                <div className="cert-serial">
                  <div className="cert-field-label">Certificate ID</div>
                  <div className="cert-serial-value">{certId}</div>
                </div>
                {artwork.authentication_date && (
                  <div className="cert-serial">
                    <div className="cert-field-label">Date of Authentication</div>
                    <div className="cert-serial-value">{fmt(artwork.authentication_date)}</div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

// SVG ornament for corners
function Ornament() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 2 L20 2 L20 6 L6 6 L6 20 L2 20 Z" fill="#1a2744" opacity="0.15"/>
      <path d="M2 2 L14 2 L14 4 L4 4 L4 14 L2 14 Z" fill="#1a2744" opacity="0.4"/>
      <circle cx="6" cy="6" r="2" fill="#1a2744" opacity="0.3"/>
      <path d="M18 2 Q12 2 8 8 Q4 12 4 18" stroke="#1a2744" strokeWidth="0.8" opacity="0.2" fill="none"/>
    </svg>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400&family=EB+Garamond:wght@400;500;600&family=Darker+Grotesque:wght@500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    font-family: 'EB Garamond', Georgia, serif;
    background: #e8eaf0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @keyframes loaderSlide { from{transform:translateX(-100%)} to{transform:translateX(200%)} }
  @keyframes sealSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  /* ── LOADING ─────────────────────────────── */
  .cert-loading {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #e8eaf0; font-family: 'Darker Grotesque', sans-serif;
  }
  .cert-loading-box {
    background: #f4f6fb; border: 2px solid #c8d0e0;
    border-radius: 16px; padding: 48px 56px; text-align: center;
    position: relative; overflow: hidden;
    box-shadow: 0 8px 32px rgba(26,39,68,.1);
  }
  .cert-loading-shine {
    position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: linear-gradient(90deg, transparent, #1a2744, transparent);
    animation: loaderSlide 1.4s ease-in-out infinite;
  }
  .cert-loading-text { font-size: 16px; font-weight: 700; color: #1a2744; margin-bottom: 20px; font-family: 'Darker Grotesque', sans-serif; }
  .cert-loading-bar { height: 3px; background: #dde3ef; border-radius: 99px; overflow: hidden; width: 160px; margin: 0 auto; }
  .cert-loading-fill { height: 100%; background: #1a2744; border-radius: 99px; animation: loaderSlide 1.2s ease-in-out infinite; }

  /* ── CERT PAGE ───────────────────────────── */
  .cert-page {
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 32px 16px;
    background: #dde2ec;
    background-image:
      radial-gradient(ellipse at 20% 20%, rgba(26,39,68,.06) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 80%, rgba(26,39,68,.04) 0%, transparent 60%);
  }

  /* ── FRAME ───────────────────────────────── */
  .cert-frame {
    position: relative;
    width: 100%;
    max-width: 860px;
    background: #f4f6fb;
    border: 3px solid #1a2744;
    border-radius: 4px;
    padding: 6px;
    box-shadow:
      0 2px 0 #c8d0e0,
      0 4px 0 #b8c2d8,
      0 20px 60px rgba(26,39,68,.18),
      0 4px 16px rgba(26,39,68,.12);
  }

  /* Inner double border */
  .cert-frame::before {
    content: '';
    position: absolute;
    inset: 10px;
    border: 1px solid rgba(26,39,68,.2);
    pointer-events: none;
    z-index: 0;
  }
  /* Decorative border pattern */
  .cert-frame::after {
    content: '';
    position: absolute;
    inset: 13px;
    border: 1px solid rgba(26,39,68,.08);
    pointer-events: none;
    z-index: 0;
  }

  /* ── CORNERS ─────────────────────────────── */
  .cert-corner {
    position: absolute; z-index: 2; width: 48px; height: 48px;
  }
  .cert-corner-tl { top: 8px; left: 8px; }
  .cert-corner-tr { top: 8px; right: 8px; transform: scaleX(-1); }
  .cert-corner-bl { bottom: 8px; left: 8px; transform: scaleY(-1); }
  .cert-corner-br { bottom: 8px; right: 8px; transform: scale(-1); }

  /* ── INNER CONTENT ───────────────────────── */
  .cert-inner {
    position: relative; z-index: 1;
    padding: 40px 56px 36px;
    background: linear-gradient(160deg, #f9fafc 0%, #f2f4f9 100%);
    border-radius: 2px;
  }

  /* ── HEADER ──────────────────────────────── */
  .cert-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    margin-bottom: 18px; gap: 16px;
  }
  .cert-issuer {
    font-family: 'Darker Grotesque', sans-serif;
    font-size: 13px; font-weight: 700; color: #5a6a88;
    letter-spacing: .08em; padding-top: 4px;
  }
  .cert-title-block { text-align: center; flex: 1; }
  .cert-title {
    font-family: 'Playfair Display', serif;
    font-size: 32px; font-weight: 900; color: #1a2744;
    letter-spacing: .12em; line-height: 1;
  }
  .cert-subtitle {
    font-family: 'Darker Grotesque', sans-serif;
    font-size: 12px; font-weight: 600; color: #8a9ab5;
    letter-spacing: .22em; text-transform: uppercase; margin-top: 6px;
  }

  /* Verified seal */
  .cert-verified-seal {
    width: 60px; height: 60px; border-radius: 50%;
    border: 2px solid #16593a;
    display: flex; align-items: center; justify-content: center;
    background: rgba(22,89,58,.06); flex-shrink: 0;
    position: relative;
  }
  .cert-verified-seal::before {
    content: '';
    position: absolute; inset: 4px; border-radius: 50%;
    border: 1px dashed rgba(22,89,58,.3);
  }
  .cert-seal-inner { text-align: center; }
  .cert-seal-icon { font-size: 18px; color: #16593a; line-height: 1; }
  .cert-seal-text { font-size: 7px; font-weight: 800; color: #16593a; letter-spacing: .18em; font-family: 'Darker Grotesque', sans-serif; }

  /* ── DIVIDERS ────────────────────────────── */
  .cert-divider {
    height: 1px;
    background: linear-gradient(to right, transparent, #1a2744 20%, #1a2744 80%, transparent);
    margin: 18px 0; opacity: .2;
  }
  .cert-divider-light { opacity: .08; margin: 14px 0; }

  /* ── ARTWORK NAME ────────────────────────── */
  .cert-artwork-name {
    font-family: 'Playfair Display', serif;
    font-size: 26px; font-weight: 700; color: #1a2744;
    text-align: center; letter-spacing: -.3px; line-height: 1.2;
    margin-bottom: 8px;
  }
  .cert-artwork-desc {
    font-size: 13px; color: #6a7a95; text-align: center; line-height: 1.6;
    max-width: 500px; margin: 0 auto; font-style: italic;
  }

  /* ── GRID ────────────────────────────────── */
  .cert-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin: 4px 0;
  }
  .cert-field {
    text-align: center; padding: 14px 8px;
    border-right: 1px solid rgba(26,39,68,.08);
    border-bottom: 1px solid rgba(26,39,68,.08);
  }
  .cert-field:nth-child(4n) { border-right: none; }
  .cert-field:nth-last-child(-n+4) { border-bottom: none; }
  /* If last row has fewer than 4, remove bottom border from all in that row */
  .cert-field-label {
    font-family: 'Darker Grotesque', sans-serif;
    font-size: 9px; font-weight: 800; color: #8a9ab5;
    text-transform: uppercase; letter-spacing: .18em; margin-bottom: 5px;
  }
  .cert-field-value {
    font-size: 14px; font-weight: 600; color: #1a2744; line-height: 1.3;
  }
  .cert-field-auth { font-weight: 700; }

  /* ── BOTTOM ROW ──────────────────────────── */
  .cert-bottom {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: end;
    gap: 24px;
    margin-top: 4px;
  }

  /* Signature block */
  .cert-auth-block { text-align: center; }
  .cert-signature {
    font-family: 'Playfair Display', serif;
    font-size: 28px; font-style: italic; color: #1a2744;
    margin-bottom: 4px; line-height: 1; min-height: 36px;
    display: flex; align-items: center; justify-content: center;
  }
  .cert-sig-pending { color: #b0bac8; font-size: 20px; }
  .cert-auth-name {
    font-size: 13px; font-weight: 700; color: #1a2744;
    border-top: 1.5px solid #1a2744; padding-top: 6px; margin-top: 2px;
  }
  .cert-auth-role { font-size: 11px; color: #8a9ab5; font-family: 'Darker Grotesque', sans-serif; font-weight: 600; letter-spacing: .06em; margin-top: 2px; }
  .cert-auth-date { font-size: 11px; color: #8a9ab5; font-family: 'Darker Grotesque', sans-serif; margin-top: 2px; }

  /* Artwork thumbnail */
  .cert-artwork-thumb {
    width: 110px; height: 110px; border: 2px solid #1a2744;
    overflow: hidden; flex-shrink: 0;
    box-shadow: 3px 3px 0 rgba(26,39,68,.15);
  }
  .cert-artwork-thumb img { width: 100%; height: 100%; object-fit: cover; }

  /* QR block */
  .cert-qr-block { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  .cert-qr {
    width: 90px; height: 90px; border: 1.5px solid rgba(26,39,68,.2);
    display: block;
  }
  .cert-serial { text-align: right; }
  .cert-serial-value {
    font-family: 'Darker Grotesque', sans-serif;
    font-size: 12px; font-weight: 700; color: #1a2744;
    letter-spacing: .08em; margin-top: 2px;
  }

  /* ── RESPONSIVE ──────────────────────────── */
  @media (max-width: 700px) {
    .cert-inner { padding: 28px 20px 24px; }
    .cert-title { font-size: 22px; }
    .cert-artwork-name { font-size: 20px; }
    .cert-grid { grid-template-columns: repeat(2, 1fr); }
    .cert-field:nth-child(2n) { border-right: none; }
    .cert-field:nth-child(4n) { border-right: 1px solid rgba(26,39,68,.08); }
    .cert-bottom { grid-template-columns: 1fr; gap: 20px; align-items: center; }
    .cert-artwork-thumb { display: none; }
    .cert-qr-block { align-items: center; }
    .cert-serial { text-align: center; }
    .cert-auth-block { border-bottom: 1px solid rgba(26,39,68,.1); padding-bottom: 20px; }
  }

  @media print {
    .cert-page { background: white; padding: 0; }
    .cert-frame { box-shadow: none; max-width: 100%; border: 2px solid #1a2744; }
  }
`;
