import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, ImageIcon } from "lucide-react";

const SALE_METHOD_INFO: Record<string, { label: string; icon: string; desc: string; cta: string; ctaStyle: "yellow" | "black" | "outline" }> = {
  direct:           { label: "Direct Purchase",   icon: "🛒", desc: "This artwork is available to purchase directly.", cta: "Inquire to Purchase",  ctaStyle: "yellow" },
  inquiry:          { label: "Inquiry Only",       icon: "✉️", desc: "Please get in touch to discuss acquiring this work.", cta: "Send Inquiry",        ctaStyle: "black"  },
  price_on_request: { label: "Price on Request",   icon: "💬", desc: "Price available upon request — contact the artist.", cta: "Request Price",       ctaStyle: "black"  },
  auction:          { label: "Auction",            icon: "🔨", desc: "This work will be available at auction.", cta: "Learn More",          ctaStyle: "outline"},
  not_for_sale:     { label: "Not for Sale",       icon: "🚫", desc: "This artwork is not currently available for purchase.", cta: "",                   ctaStyle: "outline"},
};

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  available: { label: "Available", bg: "#DCFCE7", color: "#166534" },
  Available: { label: "Available", bg: "#DCFCE7", color: "#166534" },
  sold:      { label: "Sold",      bg: "#111110", color: "#FFD400" },
  Sold:      { label: "Sold",      bg: "#111110", color: "#FFD400" },
  reserved:  { label: "Reserved",  bg: "#FEF9C3", color: "#854D0E" },
  Reserved:  { label: "Reserved",  bg: "#FEF9C3", color: "#854D0E" },
};

export default async function PublicArtworkPage({
  params,
}: {
  params: { username: string; id: string };
}) {
  const supabase = createClient();

  // Verify the artist exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, username, role")
    .eq("username", params.username)
    .single();

  if (!profile) notFound();

  // Get the artwork — must belong to this artist
  const { data: artwork } = await supabase
    .from("artworks")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", profile.id)
    .single();

  if (!artwork) notFound();

  // Get a few more works by same artist
  const { data: moreWorks } = await supabase
    .from("artworks")
    .select("id, title, images, status, price")
    .eq("user_id", profile.id)
    .neq("id", params.id)
    .limit(4);

  const statusCfg = STATUS_CFG[artwork.status as string ?? ""] ?? { label: artwork.status, bg: "#F5F0E8", color: "#5C5346" };
  const saleMethod = artwork.sale_method as string | null;
  const saleInfo   = saleMethod ? SALE_METHOD_INFO[saleMethod] : null;

  const images = Array.isArray(artwork.images) ? artwork.images as string[] : [];

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

        {/* Back breadcrumb */}
        <div style={{ paddingTop: 28, marginBottom: 28 }}>
          <Link href={`/portfolio/${params.username}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>
            <ArrowLeft size={13} />
            Back to {profile.full_name as string}&apos;s portfolio
          </Link>
        </div>

        {/* Main layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 48, alignItems: "flex-start" }}>

          {/* LEFT — Image */}
          <div>
            {/* Main image */}
            <div style={{ border: "3px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "6px 6px 0 #111110", background: "#F5F0E8", marginBottom: 14, aspectRatio: "4/3" }}>
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[0]} alt={artwork.title as string} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImageIcon size={48} color="#9B8F7A" />
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: 8 }}>
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img} alt="" style={{ width: 64, height: 64, objectFit: "cover", border: "2px solid #111110", borderRadius: 4 }} />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — Info */}
          <div>
            {/* Artist */}
            <Link href={`/portfolio/${params.username}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url as string} alt={profile.full_name as string} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", border: "2px solid #111110" }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#111110" }}>
                  {(profile.full_name as string)?.[0]?.toUpperCase() ?? "A"}
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: "#5C5346" }}>{profile.full_name as string}</span>
            </Link>

            {/* Title */}
            <h1 style={{ fontSize: 30, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 8, lineHeight: 1.2 }}>
              {artwork.title as string}
            </h1>

            {/* Year + medium */}
            {(artwork.year || artwork.medium) && (
              <p style={{ fontSize: 14, color: "#9B8F7A", marginBottom: 18 }}>
                {[artwork.year, artwork.medium].filter(Boolean).join(" · ")}
              </p>
            )}

            {/* Status badge */}
            <div style={{ marginBottom: 20 }}>
              <span style={{ background: statusCfg.bg, color: statusCfg.color, border: "2px solid #111110", padding: "4px 14px", borderRadius: 4, fontSize: 11, fontWeight: 800, textTransform: "uppercase" }}>
                {statusCfg.label}
              </span>
            </div>

            {/* Price */}
            {typeof artwork.price === "number" && (
              <div style={{ fontSize: 28, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-0.5px", marginBottom: 24 }}>
                ${(artwork.price as number).toLocaleString()}
              </div>
            )}

            {/* Details table */}
            <div style={{ border: "2px solid #111110", borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
              {[
                artwork.dimensions && { label: "Dimensions", value: artwork.dimensions as string },
                artwork.location   && { label: "Location",   value: artwork.location as string },
                artwork.year       && { label: "Year",       value: String(artwork.year) },
              ].filter(Boolean).map((row, i, arr) => row && (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", background: i % 2 === 0 ? "#fff" : "#F5F0E8", borderBottom: i < arr.length - 1 ? "1px solid #E0D8CA" : "none" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.06em" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111110" }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* ── SALE METHOD BLOCK ── */}
            {saleInfo && (
              <div style={{ border: "2px solid #111110", borderRadius: 8, overflow: "hidden", marginBottom: 24, background: "#fff" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #E0D8CA", background: "#F5F0E8" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{saleInfo.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#111110" }}>{saleInfo.label}</div>
                      <div style={{ fontSize: 11, color: "#9B8F7A", marginTop: 1 }}>{saleInfo.desc}</div>
                    </div>
                  </div>
                </div>
                {saleInfo.cta && (
                  <div style={{ padding: "14px 16px" }}>
                    {profile.username && (
                      <a href={`mailto:?subject=Inquiry about "${artwork.title}" by ${profile.full_name}`} style={{ textDecoration: "none" }}>
                        <button style={{
                          width: "100%", padding: "13px 24px",
                          border: "2px solid #111110", borderRadius: 6,
                          background: saleInfo.ctaStyle === "yellow" ? "#FFD400"
                            : saleInfo.ctaStyle === "black" ? "#111110" : "#fff",
                          color: saleInfo.ctaStyle === "black" ? "#FFD400" : "#111110",
                          fontWeight: 800, fontSize: 14, cursor: "pointer",
                          boxShadow: "3px 3px 0 #111110",
                        }}>
                          {saleInfo.cta} →
                        </button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No sale method set — generic contact */}
            {!saleInfo && (artwork.status as string)?.toLowerCase() === "available" && (
              <div style={{ marginBottom: 24 }}>
                <a href={`mailto:?subject=Inquiry about "${artwork.title}" by ${profile.full_name}`} style={{ textDecoration: "none" }}>
                  <button style={{ width: "100%", padding: "13px 24px", border: "2px solid #111110", borderRadius: 6, background: "#FFD400", color: "#111110", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "3px 3px 0 #111110" }}>
                    Inquire about this work →
                  </button>
                </a>
              </div>
            )}

            {/* Description */}
            {artwork.description && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>About this work</div>
                <p style={{ fontSize: 14, color: "#5C5346", lineHeight: 1.75 }}>{artwork.description as string}</p>
              </div>
            )}
          </div>
        </div>

        {/* MORE WORKS */}
        {(moreWorks ?? []).length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: "#111110" }}>More by {profile.full_name as string}</h2>
              <Link href={`/portfolio/${params.username}`} style={{ textDecoration: "none" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>View all →</span>
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {(moreWorks ?? []).map(w => {
                const imgs = Array.isArray(w.images) ? w.images as string[] : [];
                const cfg  = STATUS_CFG[w.status as string ?? ""] ?? { label: w.status, bg: "#F5F0E8", color: "#5C5346" };
                return (
                  <Link key={w.id} href={`/portfolio/${params.username}/artwork/${w.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fff", border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "3px 3px 0 #111110", transition: "transform 0.1s, box-shadow 0.1s" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translate(-2px,-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "5px 5px 0 #111110"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "3px 3px 0 #111110"; }}
                    >
                      <div style={{ aspectRatio: "1/1", background: "#F5F0E8" }}>
                        {imgs[0]
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={imgs[0]} alt={w.title as string} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={24} color="#9B8F7A" /></div>
                        }
                      </div>
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#111110", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.title as string}</div>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", border: "1.5px solid #111110", borderRadius: 3, background: cfg.bg, color: cfg.color, textTransform: "uppercase" }}>{cfg.label}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #E0D8CA", paddingTop: 20, marginTop: 48, display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9B8F7A", fontWeight: 600 }}>
          <span>Artfolio ✦ {new Date().getFullYear()}</span>
          <Link href="/register" style={{ textDecoration: "none" }}>
            <span style={{ color: "#111110", fontWeight: 800 }}>Join Artfolio →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
