"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Shield, CheckCircle2, Fingerprint, ArrowRight, Eye, Clock } from "lucide-react";

type PassportPreviewData = {
  certificate_id?: string;
  authentication_status?: string;
  authenticated_by?: string;
  authentication_date?: string;
  provenance_count: number;
  exhibition_count: number;
  view_count: number;
};

const AUTH_STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  original:        { label: "Original Work",   color: "#16A34A", bg: "#DCFCE7", icon: "✦" },
  limited_edition: { label: "Limited Edition", color: "#CA8A04", bg: "#FEF9C3", icon: "◈" },
  reproduction:    { label: "Reproduction",    color: "#9B8F7A", bg: "#F5F0E8", icon: "◇" },
  pending:         { label: "Not Verified",    color: "#9B8F7A", bg: "#F5F0E8", icon: "○" },
};

export default function PassportPreview({ artworkId }: { artworkId: string }) {
  const [data, setData] = useState<PassportPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!artworkId) return;
    const sb = createClient();
    Promise.all([
      sb.from("artworks")
        .select("certificate_id, authentication_status, authenticated_by, authentication_date")
        .eq("id", artworkId)
        .single(),
      sb.from("provenance_entries")
        .select("id", { count: "exact", head: true })
        .eq("artwork_id", artworkId),
      sb.from("exhibition_artworks")
        .select("id", { count: "exact", head: true })
        .eq("artwork_id", artworkId),
      sb.from("passport_views")
        .select("id", { count: "exact", head: true })
        .eq("artwork_id", artworkId),
    ]).then(([aw, prov, exh, views]) => {
      if (aw.data) {
        setData({
          certificate_id: aw.data.certificate_id,
          authentication_status: aw.data.authentication_status,
          authenticated_by: aw.data.authenticated_by,
          authentication_date: aw.data.authentication_date,
          provenance_count: prov.count || 0,
          exhibition_count: exh.count || 0,
          view_count: views.count || 0,
        });
      }
      setLoading(false);
    });
  }, [artworkId]);

  if (loading || !data) return null;

  const status = AUTH_STATUS_CFG[data.authentication_status || "pending"];
  const isVerified = data.authentication_status && data.authentication_status !== "pending";

  return (
    <Link href={`/artwork/${artworkId}/passport`} style={{ textDecoration: "none", display: "block" }}>
      <div style={{
        background: isVerified ? "#111110" : "#fff",
        border: `2.5px solid ${isVerified ? "#111110" : "#E8E0D0"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.16,1,0.3,1)",
        cursor: "pointer",
        boxShadow: isVerified ? "4px 4px 0 #16A34A" : "3px 3px 0 #D4C9A8",
      }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.boxShadow = isVerified ? "6px 6px 0 #FFD400" : "5px 6px 0 #111110";
          el.style.transform = "translate(-1px,-2px)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget;
          el.style.boxShadow = isVerified ? "4px 4px 0 #16A34A" : "3px 3px 0 #D4C9A8";
          el.style.transform = "none";
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          borderBottom: `1px solid ${isVerified ? "#222" : "#F5F0E8"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: isVerified ? "#16A34A" : "#F5F0E8",
              border: isVerified ? "2px solid #16A34A" : "2px solid #E8E0D0",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isVerified
                ? <CheckCircle2 size={14} color="#fff" />
                : <Shield size={14} color="#9B8F7A" />
              }
            </div>
            <div>
              <div style={{
                fontSize: 13, fontWeight: 800,
                color: isVerified ? "#FFD400" : "#111110",
                letterSpacing: "-0.2px",
              }}>
                {isVerified ? "Verified Artwork" : "Digital Passport"}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 600,
                color: isVerified ? "#666" : "#9B8F7A",
              }}>
                Certificate of Authenticity
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "3px 10px", borderRadius: 9999,
            background: isVerified ? status.color + "22" : status.bg,
            color: status.color,
            fontSize: 10, fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            border: `1.5px solid ${status.color}40`,
          }}>
            {status.icon} {status.label}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 18px" }}>
          {/* Stats row */}
          <div style={{
            display: "flex", gap: 16, marginBottom: 14,
          }}>
            {[
              { n: data.provenance_count, l: "Provenance", icon: <Clock size={11} /> },
              { n: data.exhibition_count, l: "Exhibitions", icon: <Eye size={11} /> },
              { n: data.view_count, l: "Views", icon: <Eye size={11} /> },
            ].map(s => (
              <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: isVerified ? "#555" : "#C0B8A8" }}>{s.icon}</span>
                <span style={{
                  fontSize: 12, fontWeight: 800,
                  color: isVerified ? "#FFD400" : "#111110",
                }}>{s.n}</span>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  color: isVerified ? "#555" : "#9B8F7A",
                }}>{s.l}</span>
              </div>
            ))}
          </div>

          {/* Certificate ID + CTA */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "monospace",
              fontSize: 11, fontWeight: 700,
              color: isVerified ? "#444" : "#C0B8A8",
              letterSpacing: "0.08em",
            }}>
              <Fingerprint size={12} />
              {data.certificate_id || "—"}
            </div>

            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 9999,
              background: isVerified ? "#FFD400" : "#FFD400",
              border: "1.5px solid #111110",
              fontSize: 11, fontWeight: 800, color: "#111110",
            }}>
              View Passport <ArrowRight size={11} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
