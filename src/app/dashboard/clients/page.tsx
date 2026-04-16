"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus, Search, X, Users, TrendingUp, Star,
  Mail, Phone, Edit2, Trash2, MessageSquare,
  ChevronRight, SlidersHorizontal, Crown,
  DollarSign, ShoppingBag, Clock, Check,
  MoreHorizontal, ArrowUpRight, Sparkles,
  UserPlus, Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
type ClientStatus = "active" | "vip" | "inactive";

type Client = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  total_spent: number;
  purchases: number;
  status: ClientStatus;
  notes?: string;
  last_purchase?: string;
  user_id?: string;
  // enriched from sales
  artworks_bought?: { title: string; image?: string; price: number; date: string }[];
};

type Sale = {
  id: string;
  buyer_name?: string;
  buyer_email?: string;
  sale_price: number;
  sale_date?: string;
  status: string;
  artwork_title?: string;
  artwork_image?: string;
};

// ── Status config ─────────────────────────────────────────────────
const STATUS_CFG: Record<ClientStatus, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  active:   { label: "Active",   color: "#16A34A", bg: "#DCFCE7", border: "#86EFAC", icon: <Check size={10} /> },
  vip:      { label: "VIP",      color: "#CA8A04", bg: "#FEF9C3", border: "#FDE047", icon: <Crown size={10} /> },
  inactive: { label: "Inactive", color: "#9B8F7A", bg: "#F5F0E8", border: "#E8E0D0", icon: <Clock size={10} /> },
};

function fmtMoney(n: number) {
  if (n >= 1000) return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `$${n.toLocaleString()}`;
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  const colors = ["#FFD400","#95E1D3","#F38181","#A8E6CF","#FFD3B6","#C7CEEA","#FFDAC1"];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

// ── Label/input shared styles ─────────────────────────────────────
const LBL: React.CSSProperties = { display:"block", fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".14em", marginBottom:6 };
const INP: React.CSSProperties = { width:"100%", padding:"10px 13px", border:"2px solid #E8E0D0", borderRadius:12, fontSize:14, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"#fff", outline:"none", transition:"border-color .15s", boxSizing:"border-box" };

// ── Client Detail Modal ───────────────────────────────────────────
function ClientModal({ client, onClose, onEdit, onDelete }: {
  client: Client; onClose: () => void;
  onEdit: () => void; onDelete: () => void;
}) {
  const cfg = STATUS_CFG[client.status] || STATUS_CFG.active;
  const avgSpend = client.purchases > 0 ? client.total_spent / client.purchases : 0;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(17,17,16,0.75)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:24, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header gradient */}
        <div style={{ height:120, borderRadius:"22px 22px 0 0", background:`linear-gradient(135deg, #111110 0%, #2D2B29 60%, ${cfg.bg} 100%)`, position:"relative", display:"flex", alignItems:"flex-end", padding:"0 24px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-end", gap:14, flex:1 }}>
            {/* Avatar */}
            <div style={{ width:56, height:56, borderRadius:16, background:avatarColor(client.name), border:"3px solid #fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"#111110", flexShrink:0, boxShadow:"2px 3px 0 rgba(0,0,0,0.2)" }}>
              {initials(client.name)}
            </div>
            <div>
              <h2 style={{ fontSize:20, fontWeight:900, color:"#fff", letterSpacing:"-.5px", margin:0 }}>{client.name}</h2>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
                <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 8px", borderRadius:99, background:cfg.bg, border:`1px solid ${cfg.border}`, fontSize:9, fontWeight:900, color:cfg.color, textTransform:"uppercase", letterSpacing:".12em" }}>
                  {cfg.icon} {cfg.label}
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ position:"absolute", top:14, right:14, width:30, height:30, borderRadius:9, background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.25)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={14} color="#fff" />
          </button>
        </div>

        <div style={{ padding:"22px 24px 26px" }}>
          {/* Stats row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
            {[
              { label:"Total Spent", value: fmtMoney(client.total_spent), color:"#16A34A" },
              { label:"Purchases", value: client.purchases, color:"#8B5CF6" },
              { label:"Avg. Spend", value: fmtMoney(avgSpend), color:"#CA8A04" },
            ].map(s => (
              <div key={s.label} style={{ background:"#F5F0E8", border:"1.5px solid #E8E0D0", borderRadius:12, padding:"12px 14px" }}>
                <div style={{ fontSize:18, fontWeight:900, color:s.color, fontFamily:"monospace" }}>{s.value}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:18 }}>
            {client.email && (
              <a href={`mailto:${client.email}`} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fff", border:"1.5px solid #E8E0D0", borderRadius:12, textDecoration:"none", transition:"border-color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor="#111110")}
                onMouseLeave={e => (e.currentTarget.style.borderColor="#E8E0D0")}>
                <div style={{ width:28, height:28, borderRadius:8, background:"#E0F2FE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Mail size={13} color="#0EA5E9" />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>Email</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{client.email}</div>
                </div>
                <ArrowUpRight size={13} color="#9B8F7A" style={{ marginLeft:"auto" }} />
              </a>
            )}
            {client.phone && (
              <a href={`tel:${client.phone}`} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fff", border:"1.5px solid #E8E0D0", borderRadius:12, textDecoration:"none", transition:"border-color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor="#111110")}
                onMouseLeave={e => (e.currentTarget.style.borderColor="#E8E0D0")}>
                <div style={{ width:28, height:28, borderRadius:8, background:"#DCFCE7", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Phone size={13} color="#16A34A" />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>Phone</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{client.phone}</div>
                </div>
                <ArrowUpRight size={13} color="#9B8F7A" style={{ marginLeft:"auto" }} />
              </a>
            )}
            {client.last_purchase && (
              <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fff", border:"1.5px solid #E8E0D0", borderRadius:12 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:"#FEF9C3", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <Clock size={13} color="#CA8A04" />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#9B8F7A" }}>Last Purchase</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#111110" }}>{fmtDate(client.last_purchase)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Artworks bought */}
          {(client.artworks_bought || []).length > 0 && (
            <div style={{ marginBottom:18 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".14em", marginBottom:10 }}>Artworks Purchased</div>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {(client.artworks_bought || []).map((aw, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", background:"#F5F0E8", border:"1.5px solid #E8E0D0", borderRadius:10 }}>
                    {aw.image && (
                      <img src={aw.image} alt="" style={{ width:36, height:36, objectFit:"cover", borderRadius:8, border:"1.5px solid #E8E0D0", flexShrink:0 }} />
                    )}
                    {!aw.image && (
                      <div style={{ width:36, height:36, borderRadius:8, background:"#E8E0D0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        <ShoppingBag size={14} color="#9B8F7A" />
                      </div>
                    )}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:800, color:"#111110", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{aw.title}</div>
                      <div style={{ fontSize:10, color:"#9B8F7A", fontWeight:600 }}>{fmtDate(aw.date)}</div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:900, color:"#16A34A", fontFamily:"monospace", flexShrink:0 }}>${aw.price.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div style={{ padding:"12px 14px", background:"#FFFBEA", border:"1.5px solid #E8E0D0", borderRadius:12, marginBottom:18 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#9B8F7A", textTransform:"uppercase", letterSpacing:".12em", marginBottom:6 }}>Notes</div>
              <p style={{ fontSize:13, color:"#5C5346", fontWeight:500, lineHeight:1.6, margin:0 }}>{client.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => { onClose(); onEdit(); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:7, padding:"11px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:13, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110", boxShadow:"3px 3px 0 #111110", transition:"all .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
              <Edit2 size={13} /> Edit Client
            </button>
            {client.email && (
              <a href={`mailto:${client.email}`} style={{ textDecoration:"none" }}>
                <button style={{ padding:"11px 16px", background:"#fff", border:"2px solid #E8E0D0", borderRadius:13, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#111110", display:"flex", alignItems:"center", gap:6, transition:"border-color .15s" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor="#111110")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor="#E8E0D0")}>
                  <Mail size={13} /> Email
                </button>
              </a>
            )}
            <button onClick={() => { if (confirm("Delete this client?")) { onDelete(); onClose(); } }} style={{ padding:"11px 14px", background:"#fff", border:"2px solid #EF4444", borderRadius:13, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#EF4444", display:"flex", alignItems:"center", gap:6 }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Client Form Modal ─────────────────────────────────────────────
function ClientFormModal({ existing, onClose, onSaved, suggestFromSales }: {
  existing?: Client; onClose: () => void; onSaved: () => void;
  suggestFromSales?: { name: string; email: string }[];
}) {
  const sb = createClient();
  const isEdit = !!existing;
  const [form, setForm] = useState({
    name: existing?.name || "",
    email: existing?.email || "",
    phone: existing?.phone || "",
    status: (existing?.status || "active") as ClientStatus,
    notes: existing?.notes || "",
    total_spent: existing?.total_spent ?? 0,
    purchases: existing?.purchases ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const sf = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }
    const payload = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      status: form.status,
      notes: form.notes.trim() || null,
      total_spent: Number(form.total_spent) || 0,
      purchases: Number(form.purchases) || 0,
    };
    if (isEdit && existing) {
      await sb.from("clients").update(payload).eq("id", existing.id);
    } else {
      await sb.from("clients").insert({ ...payload, user_id: user.id });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  const filtered_suggestions = (suggestFromSales || []).filter(s =>
    !form.name || s.name.toLowerCase().includes(form.name.toLowerCase())
  ).slice(0, 5);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9000, background:"rgba(17,17,16,0.8)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#FFFBEA", border:"2.5px solid #111110", borderRadius:24, boxShadow:"8px 8px 0 #111110", width:"100%", maxWidth:500, maxHeight:"92vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 22px 14px", borderBottom:"2px solid #E8E0D0", background: isEdit ? "#FFD400" : "#111110", borderRadius:"22px 22px 0 0" }}>
          <div>
            <div style={{ fontSize:10, fontWeight:800, color: isEdit ? "#111110" : "#9B8F7A", textTransform:"uppercase", letterSpacing:".14em", marginBottom:2 }}>
              {isEdit ? "Edit Client" : "New Client"}
            </div>
            <h2 style={{ fontSize:17, fontWeight:900, color: isEdit ? "#111110" : "#FFD400", letterSpacing:"-.4px", margin:0 }}>
              {isEdit ? existing?.name : "Add to your CRM"}
            </h2>
          </div>
          <button onClick={onClose} style={{ width:30, height:30, borderRadius:9, background: isEdit ? "rgba(17,17,16,0.15)" : "rgba(255,255,255,0.1)", border:"none", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <X size={14} color={isEdit ? "#111110" : "#FFD400"} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding:"20px 22px 24px" }}>

          {/* Sales suggestions (new clients only) */}
          {!isEdit && filtered_suggestions.length > 0 && (
            <div style={{ marginBottom:18, padding:"12px 14px", background:"#F0FDF4", border:"1.5px solid #86EFAC", borderRadius:14 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#16A34A", textTransform:"uppercase", letterSpacing:".12em", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
                <Sparkles size={10} /> Import from past sales
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                {filtered_suggestions.map((s, i) => (
                  <button key={i} type="button"
                    onClick={() => setForm(p => ({ ...p, name: s.name, email: s.email }))}
                    style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 10px", background:"#fff", border:"1.5px solid #86EFAC", borderRadius:9, cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .12s" }}
                    onMouseEnter={e => (e.currentTarget.style.background="#DCFCE7")}
                    onMouseLeave={e => (e.currentTarget.style.background="#fff")}>
                    <div style={{ width:26, height:26, borderRadius:8, background:avatarColor(s.name), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#111110", flexShrink:0 }}>
                      {initials(s.name)}
                    </div>
                    <div>
                      <div style={{ fontSize:12, fontWeight:800, color:"#111110" }}>{s.name}</div>
                      {s.email && <div style={{ fontSize:10, color:"#9B8F7A", fontWeight:600 }}>{s.email}</div>}
                    </div>
                    <div style={{ marginLeft:"auto", fontSize:9, fontWeight:800, color:"#16A34A" }}>USE →</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Full Name *</label>
            <input required style={INP} value={form.name} onChange={sf("name")} placeholder="Collector or buyer name…"
              onFocus={e => (e.target.style.borderColor="#FFD400")}
              onBlur={e => (e.target.style.borderColor="#E8E0D0")} />
          </div>

          {/* Contact */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={LBL}>Email</label>
              <input type="email" style={INP} value={form.email} onChange={sf("email")} placeholder="email@…"
                onFocus={e => (e.target.style.borderColor="#FFD400")}
                onBlur={e => (e.target.style.borderColor="#E8E0D0")} />
            </div>
            <div>
              <label style={LBL}>Phone</label>
              <input type="tel" style={INP} value={form.phone} onChange={sf("phone")} placeholder="+1 555…"
                onFocus={e => (e.target.style.borderColor="#FFD400")}
                onBlur={e => (e.target.style.borderColor="#E8E0D0")} />
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom:14 }}>
            <label style={LBL}>Status</label>
            <div style={{ display:"flex", gap:8 }}>
              {(["active","vip","inactive"] as ClientStatus[]).map(s => {
                const cfg = STATUS_CFG[s];
                const sel = form.status === s;
                return (
                  <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s }))}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"9px 0", border:`2.5px solid ${sel ? "#111110" : "#E8E0D0"}`, borderRadius:12, background: sel ? cfg.bg : "#fff", fontSize:12, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color: sel ? cfg.color : "#9B8F7A", boxShadow: sel ? "2px 2px 0 #111110" : "none", transition:"all .15s" }}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Spend tracking */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={LBL}>Total Spent ($)</label>
              <input type="number" min="0" style={INP} value={form.total_spent} onChange={sf("total_spent")} placeholder="0"
                onFocus={e => (e.target.style.borderColor="#FFD400")}
                onBlur={e => (e.target.style.borderColor="#E8E0D0")} />
            </div>
            <div>
              <label style={LBL}>Purchases (#)</label>
              <input type="number" min="0" style={INP} value={form.purchases} onChange={sf("purchases")} placeholder="0"
                onFocus={e => (e.target.style.borderColor="#FFD400")}
                onBlur={e => (e.target.style.borderColor="#E8E0D0")} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom:22 }}>
            <label style={LBL}>Notes</label>
            <textarea rows={3} style={{ ...INP, resize:"vertical" as const, minHeight:80 }} value={form.notes} onChange={sf("notes")} placeholder="Preferences, relationship context, follow-up reminders…"
              onFocus={e => (e.target.style.borderColor="#FFD400")}
              onBlur={e => (e.target.style.borderColor="#E8E0D0")} />
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:"12px", border:"2px solid #E8E0D0", borderRadius:12, background:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#9B8F7A" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.name.trim()} style={{ flex:2, padding:"12px", border:"2.5px solid #111110", borderRadius:12, background: saving ? "#F5F0E8" : "#FFD400", fontSize:14, fontWeight:800, cursor: saving ? "not-allowed" : "pointer", fontFamily:"inherit", color:"#111110", boxShadow: saving ? "none" : "3px 3px 0 #111110", transition:"all .15s" }}>
              {saving ? "Saving…" : isEdit ? "Save Changes ✓" : "Add Client ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────
function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  const cfg = STATUS_CFG[client.status] || STATUS_CFG.active;
  const isVip = client.status === "vip";

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", border:`2.5px solid ${hov ? "#111110" : "#E8E0D0"}`,
        borderRadius:20, overflow:"hidden", cursor:"pointer", position:"relative",
        boxShadow: hov ? "5px 6px 0 #111110" : "3px 4px 0 #D4C9A8",
        transform: hov ? "translate(-2px,-3px)" : "none",
        transition:"all .25s cubic-bezier(.16,1,.3,1)",
      }}
    >
      {/* Hero */}
      <div style={{
        height:100, position:"relative", overflow:"hidden",
        background: isVip
          ? "linear-gradient(135deg, #713F12 0%, #CA8A04 60%, #FDE047 100%)"
          : client.status === "inactive"
          ? "linear-gradient(135deg, #292524 0%, #57534E 100%)"
          : "linear-gradient(135deg, #14532D 0%, #16A34A 60%, #4ADE80 100%)",
      }}>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.5) 100%)" }} />

        {/* VIP crown */}
        {isVip && (
          <div style={{ position:"absolute", top:10, left:12, display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, background:"rgba(255,255,255,0.15)", border:"1.5px solid rgba(255,255,255,0.3)", backdropFilter:"blur(8px)", fontSize:9, fontWeight:900, color:"#fff", textTransform:"uppercase", letterSpacing:".12em" }}>
            <Crown size={9} /> VIP
          </div>
        )}

        {/* Purchases badge */}
        {client.purchases > 0 && (
          <div style={{ position:"absolute", top:10, right:12, display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, background:"rgba(0,0,0,0.35)", border:"1px solid rgba(255,255,255,0.15)", backdropFilter:"blur(8px)", fontSize:9, fontWeight:800, color:"#fff" }}>
            <ShoppingBag size={8} /> {client.purchases} {client.purchases === 1 ? "purchase" : "purchases"}
          </div>
        )}

        {/* Avatar + name at bottom */}
        <div style={{ position:"absolute", bottom:10, left:12, right:12, display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:32, height:32, borderRadius:10, background:avatarColor(client.name), border:"2px solid rgba(255,255,255,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#111110", flexShrink:0 }}>
            {initials(client.name)}
          </div>
          <h3 style={{ fontSize:14, fontWeight:900, color:"#fff", margin:0, lineHeight:1.1, textShadow:"0 1px 6px rgba(0,0,0,0.4)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {client.name}
          </h3>
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding:"12px 14px 14px" }}>
        {/* Total spent — big number */}
        <div style={{ fontSize:22, fontWeight:900, color:"#111110", fontFamily:"monospace", letterSpacing:"-.5px", marginBottom:4 }}>
          {fmtMoney(client.total_spent)}
        </div>
        <div style={{ fontSize:10, fontWeight:700, color:"#9B8F7A", marginBottom:10 }}>total spent</div>

        {/* Contact chips */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
          {client.email && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:99, background:"#E0F2FE", fontSize:10, fontWeight:700, color:"#0EA5E9", overflow:"hidden", maxWidth:"100%" }}>
              <Mail size={9} />
              <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:130 }}>{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 8px", borderRadius:99, background:"#DCFCE7", fontSize:10, fontWeight:700, color:"#16A34A" }}>
              <Phone size={9} /> {client.phone}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:10, borderTop:"1px solid #F5F0E8" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, background:cfg.bg, border:`1px solid ${cfg.border}`, fontSize:9, fontWeight:800, color:cfg.color, textTransform:"uppercase", letterSpacing:".1em" }}>
            {cfg.icon} {cfg.label}
          </div>
          {client.last_purchase && (
            <span style={{ fontSize:10, fontWeight:600, color:"#9B8F7A" }}>
              Last: {fmtDate(client.last_purchase)}
            </span>
          )}
          <ChevronRight size={14} color="#C0B8A8" />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ClientsPage() {
  const sb = createClient();
  const [clients, setClients]         = useState<Client[]>([]);
  const [sales, setSales]             = useState<Sale[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ClientStatus>("all");
  const [sortBy, setSortBy]           = useState<"name" | "spent" | "purchases" | "recent">("spent");
  const [showForm, setShowForm]       = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>(undefined);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showImport, setShowImport]   = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: clientsData }, { data: salesData }] = await Promise.all([
      sb.from("clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      sb.from("sales").select("*, artworks(title, images)").eq("user_id", user.id).order("sale_date", { ascending: false }),
    ]);

    const rawSales: Sale[] = (salesData || []).map((s: any) => ({
      ...s,
      artwork_title: s.artworks?.title,
      artwork_image: s.artworks?.images?.[0] || null,
    }));
    setSales(rawSales);

    // Enrich clients with their purchase history from sales
    const enriched: Client[] = (clientsData || []).map((c: any) => {
      const clientSales = rawSales.filter(s =>
        (s.buyer_email && c.email && s.buyer_email.toLowerCase() === c.email.toLowerCase()) ||
        (s.buyer_name && s.buyer_name.toLowerCase() === c.name.toLowerCase())
      );
      const artworksBought = clientSales.filter(s => s.artwork_title).map(s => ({
        title: s.artwork_title!,
        image: s.artwork_image,
        price: s.sale_price,
        date: s.sale_date || "",
      }));
      return { ...c, artworks_bought: artworksBought };
    });
    setClients(enriched);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    await sb.from("clients").delete().eq("id", id);
    setClients(p => p.filter(c => c.id !== id));
  }

  // Sales buyers not yet in clients — for import suggestions
  const salesBuyersNotInClients = Array.from(
    new Map(
      sales
        .filter(s => s.buyer_name)
        .filter(s => !clients.some(c =>
          (s.buyer_email && c.email && s.buyer_email.toLowerCase() === c.email?.toLowerCase()) ||
          s.buyer_name?.toLowerCase() === c.name.toLowerCase()
        ))
        .map(s => [s.buyer_email || s.buyer_name, { name: s.buyer_name!, email: s.buyer_email || "" }])
    ).values()
  );

  // Import a buyer from sales as a client
  async function importBuyer(buyer: { name: string; email: string }) {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    const buyerSales = sales.filter(s => s.buyer_name === buyer.name || (buyer.email && s.buyer_email === buyer.email));
    const totalSpent = buyerSales.reduce((sum, s) => sum + s.sale_price, 0);
    const lastPurchase = buyerSales[0]?.sale_date || null;
    await sb.from("clients").insert({
      user_id: user.id, name: buyer.name, email: buyer.email || null,
      status: "active", total_spent: totalSpent, purchases: buyerSales.length,
      last_purchase: lastPurchase,
    });
    load();
  }

  // Derived stats
  const totalRevenue  = clients.reduce((s, c) => s + c.total_spent, 0);
  const vipCount      = clients.filter(c => c.status === "vip").length;
  const activeCount   = clients.filter(c => c.status === "active").length;
  const avgSpend      = clients.length ? totalRevenue / clients.length : 0;
  const topClient     = [...clients].sort((a, b) => b.total_spent - a.total_spent)[0];

  // Filter + sort
  const filtered = clients
    .filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "spent")     return b.total_spent - a.total_spent;
      if (sortBy === "purchases") return b.purchases - a.purchases;
      if (sortBy === "name")      return a.name.localeCompare(b.name);
      if (sortBy === "recent")    return (b.last_purchase || "").localeCompare(a.last_purchase || "");
      return 0;
    });

  return (
    <>
      <style>{CSS}</style>
      <div>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:4 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:"#FFD400", border:"2.5px solid #111110", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"2px 2px 0 #111110" }}>
                <Users size={16} color="#111110" />
              </div>
              <h1 style={{ fontSize:24, fontWeight:900, color:"#111110", letterSpacing:"-.6px", margin:0 }}>Clients</h1>
            </div>
            <p style={{ fontSize:13, fontWeight:600, color:"#9B8F7A", margin:0 }}>
              {clients.length} collectors · {fmtMoney(totalRevenue)} total revenue · {vipCount} VIP
            </p>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {salesBuyersNotInClients.length > 0 && (
              <button onClick={() => setShowImport(p => !p)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", border:"2px solid #86EFAC", borderRadius:12, background:"#DCFCE7", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#16A34A", transition:"all .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor="#16A34A")}
                onMouseLeave={e => (e.currentTarget.style.borderColor="#86EFAC")}>
                <Sparkles size={13} /> Import from Sales ({salesBuyersNotInClients.length})
              </button>
            )}
            <button onClick={() => { setEditingClient(undefined); setShowForm(true); }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110", boxShadow:"3px 3px 0 #111110", transition:"all .15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow="5px 5px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="translate(-1px,-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow="3px 3px 0 #111110"; (e.currentTarget as HTMLElement).style.transform="none"; }}>
              <Plus size={14} strokeWidth={3} /> Add Client
            </button>
          </div>
        </div>

        {/* ── IMPORT PANEL ── */}
        {showImport && salesBuyersNotInClients.length > 0 && (
          <div style={{ background:"#F0FDF4", border:"2px solid #86EFAC", borderRadius:18, padding:"16px 20px", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#16A34A", display:"flex", alignItems:"center", gap:6 }}>
                <Sparkles size={13} /> Buyers from your sales not yet in your CRM
              </div>
              <button onClick={() => setShowImport(false)} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A" }}><X size={14} /></button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {salesBuyersNotInClients.map((b, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:"#fff", border:"1.5px solid #86EFAC", borderRadius:11 }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:avatarColor(b.name), display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:"#111110", flexShrink:0 }}>
                    {initials(b.name)}
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:800, color:"#111110" }}>{b.name}</div>
                    {b.email && <div style={{ fontSize:10, color:"#9B8F7A" }}>{b.email}</div>}
                  </div>
                  <button onClick={() => importBuyer(b)}
                    style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 10px", background:"#16A34A", border:"none", borderRadius:8, fontSize:10, fontWeight:800, color:"#fff", cursor:"pointer", fontFamily:"inherit" }}>
                    <UserPlus size={10} /> Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
          {[
            { label:"Total Clients",   value: clients.length,       icon:<Users size={16}/>,      color:"#8B5CF6", bg:"#EDE9FE", gradient:"135deg, #4C1D95, #7C3AED" },
            { label:"Total Revenue",   value: fmtMoney(totalRevenue), icon:<DollarSign size={16}/>, color:"#16A34A", bg:"#DCFCE7", gradient:"135deg, #14532D, #16A34A" },
            { label:"VIP Clients",     value: vipCount,             icon:<Crown size={16}/>,      color:"#CA8A04", bg:"#FEF9C3", gradient:"135deg, #713F12, #CA8A04" },
            { label:"Avg. Spend",      value: fmtMoney(avgSpend),   icon:<TrendingUp size={16}/>, color:"#0EA5E9", bg:"#E0F2FE", gradient:"135deg, #0C4A6E, #0EA5E9" },
          ].map(stat => (
            <div key={stat.label} style={{ background:"#fff", border:"2.5px solid #E8E0D0", borderRadius:18, overflow:"hidden", boxShadow:"3px 4px 0 #D4C9A8" }}>
              <div style={{ height:6, background:`linear-gradient(${stat.gradient})` }} />
              <div style={{ padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                  <div style={{ width:32, height:32, borderRadius:10, background:stat.bg, display:"flex", alignItems:"center", justifyContent:"center", color:stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div style={{ fontSize:22, fontWeight:900, color:"#111110", fontFamily:"monospace", letterSpacing:"-.5px" }}>{stat.value}</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#9B8F7A", marginTop:2 }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TOP CLIENT HIGHLIGHT ── */}
        {topClient && (
          <div onClick={() => setSelectedClient(topClient)} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", background:"linear-gradient(135deg, #111110 0%, #2D2B29 100%)", border:"2.5px solid #111110", borderRadius:18, marginBottom:22, cursor:"pointer", boxShadow:"4px 5px 0 #D4C9A8", transition:"all .2s" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow="6px 7px 0 #111110")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow="4px 5px 0 #D4C9A8")}>
            <div style={{ width:44, height:44, borderRadius:13, background:avatarColor(topClient.name), border:"2px solid #FFD400", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:"#111110", flexShrink:0 }}>
              {initials(topClient.name)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"rgba(255,212,0,0.6)", textTransform:"uppercase", letterSpacing:".14em", marginBottom:2 }}>⭐ Top Client</div>
              <div style={{ fontSize:16, fontWeight:900, color:"#fff", letterSpacing:"-.3px" }}>{topClient.name}</div>
            </div>
            <div style={{ textAlign:"right", flexShrink:0 }}>
              <div style={{ fontSize:22, fontWeight:900, color:"#FFD400", fontFamily:"monospace" }}>{fmtMoney(topClient.total_spent)}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)" }}>{topClient.purchases} purchases</div>
            </div>
            <ChevronRight size={18} color="rgba(255,212,0,0.5)" />
          </div>
        )}

        {/* ── SEARCH + FILTERS ── */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18, flexWrap:"wrap" }}>
          {/* Search */}
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#fff", border:"2px solid #E8E0D0", borderRadius:11, padding:"0 12px", height:38, flex:1, minWidth:200, maxWidth:300, transition:"border-color .15s" }}
            onFocusCapture={e => (e.currentTarget.style.borderColor="#FFD400")}
            onBlurCapture={e => (e.currentTarget.style.borderColor="#E8E0D0")}>
            <Search size={13} color="#9B8F7A" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:"inherit", fontWeight:600, color:"#111110", background:"transparent" }} />
            {search && <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#9B8F7A", display:"flex", padding:0 }}><X size={12} /></button>}
          </div>

          {/* Status filters */}
          {(["all","active","vip","inactive"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"6px 13px", borderRadius:99, border:"2px solid", borderColor: statusFilter===s ? "#111110" : "#E8E0D0", background: statusFilter===s ? "#111110" : "#fff", fontSize:12, fontWeight:700, cursor:"pointer", color: statusFilter===s ? "#FFD400" : "#9B8F7A", fontFamily:"inherit", transition:"all .12s", textTransform:"capitalize" as const }}>
              {s === "vip" && <Crown size={10} />}
              {s === "all" ? "All" : STATUS_CFG[s as ClientStatus]?.label || s}
              <span style={{ fontSize:10, fontWeight:600, color: statusFilter===s ? "rgba(255,212,0,0.7)" : "#C0B8A8" }}>
                ({s === "all" ? clients.length : clients.filter(c => c.status === s).length})
              </span>
            </button>
          ))}

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            style={{ height:38, padding:"0 12px", border:"2px solid #E8E0D0", borderRadius:11, background:"#fff", fontSize:12, fontWeight:700, color:"#111110", cursor:"pointer", fontFamily:"inherit", outline:"none", marginLeft:"auto" }}>
            <option value="spent">Sort: Top Spenders</option>
            <option value="purchases">Sort: Most Purchases</option>
            <option value="name">Sort: A → Z</option>
            <option value="recent">Sort: Recent</option>
          </select>
        </div>

        {/* ── GRID ── */}
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"80px 0", gap:12 }}>
            <div style={{ width:30, height:30, border:"3px solid #FFD400", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
            <span style={{ fontSize:13, fontWeight:700, color:"#9B8F7A" }}>Loading clients…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding:"64px 24px", textAlign:"center", background:"#fff", border:"2.5px dashed #E0D8CA", borderRadius:20 }}>
            <div style={{ fontSize:48, marginBottom:12 }}>👥</div>
            <div style={{ fontSize:18, fontWeight:900, color:"#111110", marginBottom:6 }}>
              {search || statusFilter !== "all" ? "No clients match your filters" : "No clients yet"}
            </div>
            <div style={{ fontSize:13, fontWeight:600, color:"#9B8F7A", marginBottom:20, maxWidth:360, margin:"0 auto 20px" }}>
              {search || statusFilter !== "all"
                ? "Try clearing your filters"
                : "Start building your collector relationships. Add clients manually or import them from your sales history."}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
              <button onClick={() => { setEditingClient(undefined); setShowForm(true); }}
                style={{ padding:"10px 20px", background:"#FFD400", border:"2.5px solid #111110", borderRadius:12, fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", color:"#111110", boxShadow:"3px 3px 0 #111110" }}>
                <Plus size={13} style={{ display:"inline", marginRight:6 }} /> Add Client
              </button>
              {salesBuyersNotInClients.length > 0 && (
                <button onClick={() => setShowImport(true)}
                  style={{ padding:"10px 20px", background:"#DCFCE7", border:"2px solid #86EFAC", borderRadius:12, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"#16A34A" }}>
                  <Sparkles size={13} style={{ display:"inline", marginRight:6 }} /> Import from Sales
                </button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
            {filtered.map((c, i) => (
              <div key={c.id} style={{ animation:`fadeUp .3s cubic-bezier(.16,1,.3,1) ${Math.min(i * 0.04, 0.3)}s both` }}>
                <ClientCard client={c} onClick={() => setSelectedClient(c)} />
              </div>
            ))}
          </div>
        )}

        {/* ── LINK TO SALES ── */}
        {clients.length > 0 && (
          <div style={{ marginTop:28, display:"flex", gap:10, flexWrap:"wrap" }}>
            <Link href="/dashboard/sales" style={{ textDecoration:"none" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"9px 16px", background:"#fff", border:"2px solid #E8E0D0", borderRadius:12, fontSize:13, fontWeight:700, color:"#111110", cursor:"pointer", transition:"border-color .15s" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor="#111110")}
                onMouseLeave={e => (e.currentTarget.style.borderColor="#E8E0D0")}>
                <DollarSign size={13} color="#16A34A" /> View Sales Records <ChevronRight size={13} color="#9B8F7A" />
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      {selectedClient && (
        <ClientModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={() => { setEditingClient(selectedClient); setShowForm(true); setSelectedClient(null); }}
          onDelete={() => { handleDelete(selectedClient.id); setSelectedClient(null); }}
        />
      )}
      {showForm && (
        <ClientFormModal
          existing={editingClient}
          onClose={() => { setShowForm(false); setEditingClient(undefined); }}
          onSaved={load}
          suggestFromSales={salesBuyersNotInClients}
        />
      )}
    </>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@500;600;700;800;900&display=swap');
  *{box-sizing:border-box}
  body{font-family:'Darker Grotesque',system-ui,sans-serif}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
`;
