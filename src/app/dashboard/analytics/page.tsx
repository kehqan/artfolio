"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp, DollarSign, ImageIcon, Users, ArrowRight,
  Star, Zap, Target, BarChart3, BookOpen, Award,
  ArrowUpRight, ArrowDownRight, Minus, ShoppingBag,
  Handshake, CalendarDays,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────
type Sale = {
  id: string; sale_price: number; commission_percentage?: number;
  sale_date?: string; status: string; artwork_id?: string;
  buyer_name?: string; buyer_email?: string; payment_method?: string;
};
type Artwork = { id: string; status: string; title: string; price?: number; medium?: string };
type Client  = { id: string; name: string; email?: string };

// ── Pure CSS animated bar chart ────────────────────────────────────
function BarChart({ data, color = "#FFD400", height = 160 }: {
  data: { label: string; value: number; sublabel?: string }[];
  color?: string;
  height?: number;
}) {
  const [rendered, setRendered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRendered(true), 80); return () => clearTimeout(t); }, []);
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height, width: "100%" }}>
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            {d.value > 0 && (
              <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", fontFamily: "monospace" }}>
                {d.value >= 1000 ? `${(d.value/1000).toFixed(1)}k` : d.value}
              </div>
            )}
            <div style={{ width: "100%", background: "#F5F0E8", borderRadius: "6px 6px 0 0", height: `${height - 32}px`, display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
              <div style={{
                width: "100%", background: color, borderRadius: "5px 5px 0 0",
                height: rendered ? `${pct}%` : "0%",
                minHeight: d.value > 0 ? 4 : 0,
                transition: `height .6s cubic-bezier(.16,1,.3,1) ${i * .05}s`,
              }} />
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#C0B8A8", textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
            {d.sublabel && <div style={{ fontSize: 8, color: "#D4C9A8", fontWeight: 600 }}>{d.sublabel}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── SVG Donut chart ────────────────────────────────────────────────
function DonutChart({ slices, size = 140 }: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const [rendered, setRendered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRendered(true), 150); return () => clearTimeout(t); }, []);

  const total = slices.reduce((s, d) => s + d.value, 0) || 1;
  const r = 46; const cx = 60; const cy = 60;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = slices.map(s => {
    const pct = s.value / total;
    const dash = pct * circumference;
    const seg = { ...s, dash, gap: circumference - dash, offset, pct };
    offset += dash;
    return seg;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
        {/* Background ring */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F5F0E8" strokeWidth={16} />
        {segments.map((seg, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={16}
            strokeDasharray={`${rendered ? seg.dash : 0} ${circumference - (rendered ? seg.dash : 0)}`}
            strokeDashoffset={-seg.offset + circumference * 0.25}
            strokeLinecap="butt"
            style={{ transition: `stroke-dasharray .7s cubic-bezier(.16,1,.3,1) ${i * .08}s` }}
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" style={{ fontSize: 18, fontWeight: 900, fill: "#111110", fontFamily: "monospace" }}>{total}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" style={{ fontSize: 7, fontWeight: 800, fill: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em", fontFamily: "sans-serif" }}>WORKS</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 100 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: "#111110" }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#111110", fontFamily: "monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>{Math.round(s.value / total * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal progress bar ────────────────────────────────────────
function HBar({ label, value, max, color, suffix = "" }: { label: string; value: number; max: number; color: string; suffix?: string }) {
  const [rendered, setRendered] = useState(false);
  useEffect(() => { const t = setTimeout(() => setRendered(true), 200); return () => clearTimeout(t); }, []);
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#111110" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 900, color: "#111110", fontFamily: "monospace" }}>{suffix}{value.toLocaleString()}</span>
      </div>
      <div style={{ height: 8, background: "#F5F0E8", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", background: color, borderRadius: 99, width: rendered ? `${pct}%` : "0%", transition: "width .7s cubic-bezier(.16,1,.3,1)" }} />
      </div>
    </div>
  );
}

// ── Trend indicator ────────────────────────────────────────────────
function Trend({ value, prev }: { value: number; prev: number }) {
  if (prev === 0 && value === 0) return <span style={{ fontSize: 10, color: "#9B8F7A" }}>—</span>;
  if (prev === 0) return <span style={{ fontSize: 10, color: "#16A34A", fontWeight: 800, display: "flex", alignItems: "center", gap: 2 }}><ArrowUpRight size={11} /> New</span>;
  const pct = Math.round(((value - prev) / prev) * 100);
  if (pct === 0) return <span style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 2 }}><Minus size={10} /> 0%</span>;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: pct > 0 ? "#16A34A" : "#EF4444", display: "inline-flex", alignItems: "center", gap: 2 }}>
      {pct > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct)}%
    </span>
  );
}

// ── Section card (Ripe standard) ───────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: "#fff", border: "2.5px solid #111110", borderRadius: 20, overflow: "hidden", boxShadow: "3px 4px 0 #D4C9A8", ...style }}>{children}</div>;
}
function CardHead({ title, emoji, sub, right }: { title: string; emoji?: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding: "13px 18px", borderBottom: "2px solid #E8E0D0", background: "#FAF7F3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {emoji && <span style={{ fontSize: 16 }}>{emoji}</span>}
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#111110" }}>{title}</div>
          {sub && <div style={{ fontSize: 10, color: "#9B8F7A", fontWeight: 600 }}>{sub}</div>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── Business insight card ──────────────────────────────────────────
function InsightCard({ emoji, title, value, desc, color }: { emoji: string; title: string; value: string; desc: string; color: string }) {
  return (
    <div style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, padding: "16px", overflow: "hidden", position: "relative", boxShadow: "2px 3px 0 #E0D8CA" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{emoji}</div>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-.5px", marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A", lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
  const [sales,    setSales]    = useState<Sale[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [followers, setFollowers] = useState(0);
  const [collabs,   setCollabs]  = useState(0);
  const [events,    setEvents]   = useState(0);
  const [profile,   setProfile]  = useState<{ full_name?: string } | null>(null);
  const [loading,   setLoading]  = useState(true);
  const [period,    setPeriod]   = useState<6 | 12>(12);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [
        { data: salesData },
        { data: awData },
        { data: clientData },
        { data: profData },
        { count: fc },
        { count: cc },
        { count: ec },
      ] = await Promise.all([
        sb.from("sales").select("*").eq("user_id", user.id).order("sale_date", { ascending: false }),
        sb.from("artworks").select("id,status,title,price,medium").eq("user_id", user.id),
        sb.from("clients").select("id,name,email").eq("user_id", user.id),
        sb.from("profiles").select("full_name").eq("id", user.id).single(),
        sb.from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        sb.from("collaborations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        sb.from("exhibitions").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setSales(salesData || []);
      setArtworks(awData || []);
      setClients(clientData || []);
      setProfile(profData);
      setFollowers(fc || 0);
      setCollabs(cc || 0);
      setEvents(ec || 0);
      setLoading(false);
    });
  }, []);

  // ── Computed metrics ───────────────────────────────────────────
  const completed  = sales.filter(s => s.status?.toLowerCase() === "completed");
  const totalRev   = completed.reduce((s, x) => s + (x.sale_price || 0), 0);
  const totalComm  = completed.reduce((s, x) => s + (x.sale_price * (x.commission_percentage || 0) / 100), 0);
  const netRev     = totalRev - totalComm;
  const avgSale    = completed.length ? totalRev / completed.length : 0;

  // Period revenue chart
  const now = new Date();
  const months = Array.from({ length: period }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (period - 1) + i, 1);
    return { label: d.toLocaleString("default", { month: "short" }), shortYear: `'${String(d.getFullYear()).slice(2)}`, year: d.getFullYear(), month: d.getMonth() };
  });
  const revenueByMonth = months.map(({ label, year, month }) => ({
    label,
    value: completed.filter(s => {
      if (!s.sale_date) return false;
      const d = new Date(s.sale_date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).reduce((sum, s) => sum + (s.sale_price || 0), 0),
  }));

  // Month-over-month trend
  const thisMonth = revenueByMonth[revenueByMonth.length - 1]?.value || 0;
  const lastMonth = revenueByMonth[revenueByMonth.length - 2]?.value || 0;

  // Best month
  const bestMonth = revenueByMonth.reduce((best, m) => m.value > best.value ? m : best, { label: "—", value: 0 });

  // Artwork status breakdown
  const statusGroups = artworks.reduce((acc, a) => {
    const k = String(a.status || "other").toLowerCase().replace(/ /g, "_");
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const donutSlices = [
    { label: "Available",   value: statusGroups["available"]   || 0, color: "#16A34A" },
    { label: "Sold",        value: statusGroups["sold"]        || 0, color: "#111110" },
    { label: "Reserved",    value: statusGroups["reserved"]    || 0, color: "#CA8A04" },
    { label: "In Progress", value: statusGroups["in_progress"] || 0, color: "#7C3AED" },
    { label: "Concept",     value: statusGroups["concept"]     || 0, color: "#9B8F7A" },
    { label: "Complete",    value: statusGroups["complete"]    || 0, color: "#0EA5E9" },
  ].filter(s => s.value > 0);

  // Top buyers by spend
  const buyerMap: Record<string, number> = {};
  completed.forEach(s => {
    if (s.buyer_name) buyerMap[s.buyer_name] = (buyerMap[s.buyer_name] || 0) + (s.sale_price || 0);
  });
  const topBuyers = Object.entries(buyerMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxBuyer  = topBuyers[0]?.[1] || 1;

  // Sales by method
  const methodMap: Record<string, number> = {};
  completed.forEach(s => {
    const m = s.payment_method || "Other";
    methodMap[m] = (methodMap[m] || 0) + (s.sale_price || 0);
  });
  const methodData = Object.entries(methodMap).sort((a, b) => b[1] - a[1]);
  const maxMethod  = methodData[0]?.[1] || 1;

  // Sell-through rate
  const soldCount       = statusGroups["sold"] || 0;
  const availableCount  = statusGroups["available"] || 0;
  const sellThrough     = artworks.length ? Math.round((soldCount / artworks.length) * 100) : 0;

  // Avg price of available works
  const availableWorks  = artworks.filter(a => a.status?.toLowerCase() === "available" && a.price);
  const avgAvailPrice   = availableWorks.length ? availableWorks.reduce((s, a) => s + (a.price || 0), 0) / availableWorks.length : 0;

  // Most common medium
  const mediumMap: Record<string, number> = {};
  artworks.forEach(a => { if (a.medium) mediumMap[a.medium] = (mediumMap[a.medium] || 0) + 1; });
  const topMedium = Object.entries(mediumMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const fname = profile?.full_name?.split(" ")[0] || "Artist";

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #FFD400", borderTopColor: "transparent", animation: "spin .7s linear infinite" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9B8F7A" }}>Loading your analytics…</div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: "#FFD400", border: "2.5px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 0 #111110" }}>
            <BarChart3 size={16} color="#111110" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#111110", letterSpacing: "-.6px", margin: 0 }}>Analytics</h1>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", margin: 0 }}>
          Your business performance, {fname} — all the numbers that matter for your art practice
        </p>
      </div>

      {/* ── KPI STAT CARDS ── */}
      <div className="an-stats">
        {[
          { label: "Total Revenue",   value: `€${totalRev.toLocaleString()}`,    icon: DollarSign,  color: "#16A34A", bg: "#DCFCE7", grad: "135deg,#14532D,#16A34A",  trend: <Trend value={thisMonth} prev={lastMonth} /> },
          { label: "Net Revenue",     value: `€${netRev.toLocaleString()}`,       icon: TrendingUp,  color: "#0EA5E9", bg: "#E0F2FE", grad: "135deg,#075985,#0EA5E9",  trend: null },
          { label: "Avg Sale Price",  value: `€${Math.round(avgSale).toLocaleString()}`, icon: Target, color: "#8B5CF6", bg: "#EDE9FE", grad: "135deg,#4C1D95,#7C3AED", trend: null },
          { label: "Sales Completed", value: completed.length,                    icon: ShoppingBag, color: "#CA8A04", bg: "#FEF9C3", grad: "135deg,#713F12,#CA8A04",  trend: null },
          { label: "Followers",       value: followers,                           icon: Users,       color: "#EC4899", bg: "#FCE7F3", grad: "135deg,#9D174D,#EC4899",  trend: null },
          { label: "Clients / CRM",   value: clients.length,                      icon: Award,       color: "#FF6B6B", bg: "#FFE4E6", grad: "135deg,#7F1D1D,#FF6B6B",  trend: null },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 16, overflow: "hidden", boxShadow: "2px 3px 0 #E0D8CA" }}>
            <div style={{ height: 4, background: `linear-gradient(${s.grad})` }} />
            <div style={{ padding: "14px 15px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={15} color={s.color} />
                </div>
                {s.trend}
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#111110", fontFamily: "monospace", letterSpacing: "-.5px", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#9B8F7A", marginTop: 4 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── REVENUE CHART ── */}
      <Card style={{ marginBottom: 20 }}>
        <CardHead title="Revenue Over Time" emoji="📈"
          sub={`${period}-month view`}
          right={
            <div style={{ display: "flex", border: "2px solid #E8E0D0", borderRadius: 9, overflow: "hidden" }}>
              {([6, 12] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  style={{ padding: "5px 12px", border: "none", background: period === p ? "#111110" : "#fff", color: period === p ? "#FFD400" : "#9B8F7A", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                  {p}M
                </button>
              ))}
            </div>
          }
        />
        <div style={{ padding: "20px 18px 14px" }}>
          {totalRev === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#C0B8A8" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No completed sales yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Record your first sale to see revenue trends</div>
            </div>
          ) : (
            <BarChart data={revenueByMonth} color="#FFD400" height={180} />
          )}
        </div>
        {totalRev > 0 && (
          <div style={{ padding: "0 18px 16px", display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
              Best month: <span style={{ color: "#111110", fontWeight: 900 }}>{bestMonth.label} — €{bestMonth.value.toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
              This month vs last: <Trend value={thisMonth} prev={lastMonth} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A" }}>
              Commission paid: <span style={{ color: "#EF4444", fontWeight: 900 }}>€{Math.round(totalComm).toLocaleString()}</span>
            </div>
          </div>
        )}
      </Card>

      {/* ── 2-COL: Inventory + Top Buyers ── */}
      <div className="an-grid-2" style={{ marginBottom: 20 }}>

        {/* Inventory donut */}
        <Card>
          <CardHead title="Inventory Breakdown" emoji="🖼️"
            right={
              <Link href="/dashboard/artworks" style={{ textDecoration: "none", fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "flex", alignItems: "center", gap: 3 }}>
                Manage <ArrowRight size={11} />
              </Link>
            }
          />
          <div style={{ padding: "18px" }}>
            {artworks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#C0B8A8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>No artworks yet</div>
              </div>
            ) : (
              <DonutChart slices={donutSlices} size={140} />
            )}
          </div>
          {artworks.length > 0 && (
            <div style={{ padding: "0 18px 16px", display: "flex", gap: 10 }}>
              <div style={{ flex: 1, padding: "10px 12px", background: "#DCFCE7", borderRadius: 11, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#16A34A", fontFamily: "monospace" }}>{availableCount}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#16A34A", textTransform: "uppercase", letterSpacing: ".1em" }}>For sale</div>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", background: "#E5E5E5", borderRadius: 11, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#111110", fontFamily: "monospace" }}>{soldCount}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#111110", textTransform: "uppercase", letterSpacing: ".1em" }}>Sold</div>
              </div>
              <div style={{ flex: 1, padding: "10px 12px", background: "#F5F0E8", borderRadius: 11, textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#9B8F7A", fontFamily: "monospace" }}>{artworks.length}</div>
                <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: ".1em" }}>Total</div>
              </div>
            </div>
          )}
        </Card>

        {/* Top buyers */}
        <Card>
          <CardHead title="Top Collectors" emoji="👑"
            right={
              <Link href="/dashboard/clients" style={{ textDecoration: "none", fontSize: 11, fontWeight: 700, color: "#9B8F7A", display: "flex", alignItems: "center", gap: 3 }}>
                CRM <ArrowRight size={11} />
              </Link>
            }
          />
          <div style={{ padding: "16px 18px" }}>
            {topBuyers.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#C0B8A8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>No buyer data yet</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Add buyer names when recording sales</div>
              </div>
            ) : (
              topBuyers.map(([name, spend], i) => (
                <HBar key={name} label={`${i === 0 ? "👑 " : ""}${name}`} value={spend} max={maxBuyer} color={i === 0 ? "#FFD400" : i === 1 ? "#D4C9A8" : "#F5F0E8"} suffix="€" />
              ))
            )}
          </div>
          {clients.length > 0 && (
            <div style={{ padding: "0 18px 16px" }}>
              <Link href="/dashboard/clients" style={{ textDecoration: "none" }}>
                <div style={{ padding: "10px 13px", background: "#FAF7F3", border: "1.5px solid #E8E0D0", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#111110" }}>
                    {clients.length} collector{clients.length > 1 ? "s" : ""} in your CRM
                  </span>
                  <ArrowRight size={13} color="#9B8F7A" />
                </div>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* ── 2-COL: Payment methods + Scene stats ── */}
      <div className="an-grid-2" style={{ marginBottom: 20 }}>

        {/* Payment methods */}
        <Card>
          <CardHead title="Sales by Payment Method" emoji="💳" />
          <div style={{ padding: "16px 18px" }}>
            {methodData.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#C0B8A8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>No data yet</div>
              </div>
            ) : methodData.map(([method, amount]) => (
              <HBar key={method} label={method} value={amount} max={maxMethod} color="#8B5CF6" suffix="€" />
            ))}
          </div>
        </Card>

        {/* Scene stats */}
        <Card>
          <CardHead title="Your Scene Activity" emoji="🎪" />
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: "Events & Exhibitions",  value: events,    icon: CalendarDays, color: "#4ECDC4", bg: "#F0FDF4", href: "/dashboard/exhibitions" },
              { label: "Active Collaborations", value: collabs,   icon: Handshake,    color: "#FF6B6B", bg: "#FFE4E6", href: "/dashboard/pool" },
              { label: "Followers",             value: followers, icon: Users,        color: "#EC4899", bg: "#FCE7F3", href: "/dashboard/analytics" },
              { label: "Artworks on the Map",   value: artworks.filter(a => a.status?.toLowerCase() === "available").length, icon: Target, color: "#FFD400", bg: "#FFFBEA", href: "/dashboard/map" },
            ].map(s => (
              <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "#FAF7F3", borderRadius: 12, border: "1.5px solid #E8E0D0", transition: "all .15s", cursor: "pointer" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="#111110"; (e.currentTarget as HTMLElement).style.background="#FFFBEA"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="#E8E0D0"; (e.currentTarget as HTMLElement).style.background="#FAF7F3"; }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <s.icon size={15} color={s.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#111110" }}>{s.label}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", fontFamily: "monospace" }}>{s.value}</div>
                </div>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* ── BUSINESS INSIGHTS ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 8, height: 8, borderRadius: 3, background: "#FFD400", border: "1.5px solid #111110" }} />
          <span style={{ fontSize: 13, fontWeight: 900, color: "#111110" }}>Business Insights</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#9B8F7A" }}>— what the numbers say about your practice</span>
        </div>
        <div className="an-insights">
          <InsightCard
            emoji="🎯" title="Sell-Through Rate" color="#16A34A"
            value={`${sellThrough}%`}
            desc={sellThrough >= 50 ? "More than half your works have sold — strong market presence." : sellThrough > 20 ? "Room to grow. Consider pricing strategy or more visibility." : "Early stage — keep adding works and building your collector base."}
          />
          <InsightCard
            emoji="💰" title="Avg. Available Price" color="#CA8A04"
            value={avgAvailPrice > 0 ? `€${Math.round(avgAvailPrice).toLocaleString()}` : "—"}
            desc={avgAvailPrice > 2000 ? "Premium positioning. Focus on collectors and galleries." : avgAvailPrice > 500 ? "Mid-market sweet spot. Great for building a collector base." : "Entry-level pricing. Good for volume and new collector relationships."}
          />
          <InsightCard
            emoji="🖌️" title="Primary Medium" color="#7C3AED"
            value={topMedium}
            desc={`This is your most-used medium across ${artworks.length} work${artworks.length !== 1 ? "s" : ""}. Consistency builds your artistic identity.`}
          />
          <InsightCard
            emoji="🏆" title="Best Sales Month" color="#0EA5E9"
            value={bestMonth.value > 0 ? bestMonth.label : "—"}
            desc={bestMonth.value > 0 ? `€${bestMonth.value.toLocaleString()} in ${bestMonth.label}. Study what made this month special and repeat it.` : "No completed sales yet. Your best month is still ahead of you."}
          />
          <InsightCard
            emoji="📡" title="Commission Impact" color="#FF6B6B"
            value={totalComm > 0 ? `€${Math.round(totalComm).toLocaleString()}` : "€0"}
            desc={totalComm > 0 ? `${Math.round((totalComm / totalRev) * 100)}% of your revenue goes to commissions. Factor this into your pricing.` : "No commission costs yet — pure revenue for now."}
          />
          <InsightCard
            emoji="👥" title="Collector Network" color="#EC4899"
            value={clients.length > 0 ? `${clients.length} CRM` : "Start now"}
            desc={clients.length >= 10 ? "Strong collector network. Focus on nurturing these relationships." : clients.length > 0 ? `${clients.length} collectors tracked. Aim for 10+ to build a sustainable practice.` : "Add buyers to your CRM — relationships are your most valuable asset."}
          />
        </div>
      </div>

      {/* ── EDUCATION BANNER ── */}
      <div style={{ background: "#111110", border: "2.5px solid #111110", borderRadius: 24, overflow: "hidden", boxShadow: "5px 5px 0 #D4C9A8", marginBottom: 8, position: "relative" }}>
        {/* Decorative background shapes */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,212,0,.04)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -30, left: 100, width: 140, height: 140, borderRadius: "50%", background: "rgba(236,72,153,.04)", pointerEvents: "none" }} />

        <div style={{ padding: "28px 28px 24px", display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* Left: message */}
          <div style={{ flex: "1 1 340px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <BookOpen size={15} color="#111110" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#FFD400", textTransform: "uppercase", letterSpacing: ".18em" }}>Education Hub</span>
            </div>

            <h2 style={{ fontSize: "clamp(18px,2.5vw,26px)", fontWeight: 900, color: "#fff", letterSpacing: "-.6px", lineHeight: 1.15, marginBottom: 10 }}>
              The business of art is<br />
              <span style={{ color: "#FFD400" }}>a learnable skill.</span>
            </h2>

            <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.55)", lineHeight: 1.7, marginBottom: 18, maxWidth: 480 }}>
              Most artists are brilliant creators — but the pricing strategies, collector relationships, and gallery negotiations that fund a career take practice. You don't need an MFA in business. You just need the right knowledge, at the right time.
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/dashboard/exhibitions" style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "#FFD400", border: "2.5px solid #FFD400", borderRadius: 12, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all .15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="#FFC900"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="#FFD400"; }}>
                  <BookOpen size={13} /> Go to Education Hub <ArrowRight size={13} />
                </button>
              </Link>
              <Link href="/dashboard/sales" style={{ textDecoration: "none" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "transparent", border: "2px solid rgba(255,255,255,.2)", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "rgba(255,255,255,.6)", transition: "all .15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.4)"; (e.currentTarget as HTMLElement).style.color="rgba(255,255,255,.9)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.2)"; (e.currentTarget as HTMLElement).style.color="rgba(255,255,255,.6)"; }}>
                  <DollarSign size={13} /> View Sales
                </button>
              </Link>
            </div>
          </div>

          {/* Right: topic cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: "0 0 auto", minWidth: 220 }}>
            {[
              { emoji: "💰", title: "Pricing your artwork",    desc: "Know your worth, set the right number" },
              { emoji: "🤝", title: "Working with galleries",   desc: "Consignment, commission & contracts" },
              { emoji: "📣", title: "Self-promotion online",    desc: "Build an audience that buys" },
              { emoji: "📋", title: "Collector relationships",  desc: "Turn one-time buyers into patrons" },
            ].map(t => (
              <Link key={t.title} href="/dashboard/exhibitions" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", background: "rgba(255,255,255,.05)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 12, cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.1)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,212,0,.3)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background="rgba(255,255,255,.05)"; (e.currentTarget as HTMLElement).style.borderColor="rgba(255,255,255,.1)"; }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{t.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.4)" }}>{t.desc}</div>
                  </div>
                  <ArrowRight size={11} color="rgba(255,212,0,.4)" style={{ flexShrink: 0, marginLeft: "auto" }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom quote strip */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,.07)", padding: "14px 28px", display: "flex", alignItems: "center", gap: 10 }}>
          <Zap size={13} color="#FFD400" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.35)", fontStyle: "italic" }}>
            "Art is not what you see, but what you make others see." — Edgar Degas. And selling it is what lets you keep making it.
          </span>
        </div>
      </div>
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: 'Darker Grotesque', system-ui, sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .an-stats {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .an-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .an-insights {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  @media (max-width: 1100px) {
    .an-stats { grid-template-columns: repeat(3, 1fr) !important; }
  }
  @media (max-width: 820px) {
    .an-stats    { grid-template-columns: repeat(2, 1fr) !important; }
    .an-grid-2   { grid-template-columns: 1fr !important; }
    .an-insights { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 500px) {
    .an-stats    { grid-template-columns: 1fr 1fr !important; }
    .an-insights { grid-template-columns: 1fr !important; }
  }
`;
