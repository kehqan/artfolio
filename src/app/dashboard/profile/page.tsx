"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import {
  Save, Upload, ExternalLink, LogOut, ShoppingBag,
  Copy, Check, Users, Link as LinkIcon, Gift,
  Instagram, Globe, Palette, Linkedin,
  ChevronDown, X, Camera, Eye, Settings,
  TrendingUp, ImageIcon, Handshake,
} from "lucide-react";

type Tab = "account" | "social" | "store" | "referrals";

type Profile = {
  id: string; full_name: string; username: string; bio: string;
  location: string; website: string; role: string; avatar_url?: string;
  instagram?: string; behance?: string; linkedin?: string;
  referral_code?: string;
};

const ROLE_OPTIONS = [
  { key: "artist",  label: "Artist",  emoji: "🎨", desc: "Painter, sculptor, photographer…" },
  { key: "gallery", label: "Venue",   emoji: "🏛️", desc: "Gallery, café, studio, hotel…" },
];

// ── Stat mini card ──────────────────────────────────────────────
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: "#fff", border: "2px solid #E8E0D0", borderRadius: 12, padding: "10px 14px", textAlign: "center", minWidth: 70 }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Social input row ─────────────────────────────────────────────
function SocialRow({
  icon, label, placeholder, value, onChange, prefix, accent,
}: {
  icon: React.ReactNode; label: string; placeholder: string;
  value: string; onChange: (v: string) => void; prefix?: string; accent?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#fff", border: `2px solid ${focused ? (accent || "#FFD400") : "#E8E0D0"}`, borderRadius: 14, transition: "border-color .15s, box-shadow .15s", boxShadow: focused ? `0 0 0 3px ${accent || "#FFD400"}33` : "none" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: focused ? (accent || "#FFD400") : "#F5F0E8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background .15s", border: `1.5px solid ${focused ? "#111110" : "#E8E0D0"}` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 2 }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {prefix && <span style={{ fontSize: 13, fontWeight: 600, color: "#C0B8A8", flexShrink: 0 }}>{prefix}</span>}
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ flex: 1, border: "none", outline: "none", fontSize: 14, fontWeight: 600, color: "#111110", fontFamily: "inherit", background: "transparent", minWidth: 0 }}
          />
        </div>
      </div>
      {value && (
        <button type="button" onClick={() => onChange("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#C0B8A8", padding: 0, display: "flex" }}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>("account");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm]       = useState({
    full_name: "", username: "", bio: "", location: "",
    website: "", role: "artist",
    instagram: "", behance: "", linkedin: "",
  });
  const [avatar, setAvatar]       = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveErr, setSaveErr]     = useState("");
  const [uploading, setUploading] = useState(false);
  const [stats, setStats]         = useState({ artworks: 0, followers: 0, exhibitions: 0, sales: 0 });
  const [actionsOpen, setActionsOpen] = useState(false);
  const [referralCopied, setReferralCopied] = useState(false);
  const [inviteCopied, setInviteCopied]     = useState(false);
  const [referralCount, setReferralCount]   = useState(0);
  const actionsRef = useRef<HTMLDivivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);

  const sb = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "https://artfolio-tawny.vercel.app";

  useEffect(() => {
    load();
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleClickOutside(e: MouseEvent) {
    if (actionsRef.current && !(actionsRef.current as any).contains(e.target)) {
      setActionsOpen(false);
    }
  }

  async function load() {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
    if (data) {
      setProfile(data);
      setForm({
        full_name:  data.full_name  || "",
        username:   data.username   || "",
        bio:        data.bio        || "",
        location:   data.location   || "",
        website:    data.website    || "",
        role:       data.role       || "artist",
        instagram:  data.instagram  || "",
        behance:    data.behance    || "",
        linkedin:   data.linkedin   || "",
      });
      setAvatar(data.avatar_url || null);
    }

    // Stats
    const [{ count: aw }, { count: fo }, { count: ex }, { count: sa }] = await Promise.all([
      sb.from("artworks").select("id",    { count: "exact", head: true }).eq("user_id", user.id),
      sb.from("follows").select("id",     { count: "exact", head: true }).eq("following_id", user.id),
      sb.from("exhibitions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      sb.from("sales").select("id",       { count: "exact", head: true }).eq("user_id", user.id),
    ]);
    setStats({ artworks: aw ?? 0, followers: fo ?? 0, exhibitions: ex ?? 0, sales: sa ?? 0 });

    // Referral count — profiles referred by this user
    const { count: rc } = await sb.from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", user.id);
    setReferralCount(rc ?? 0);
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    setSaving(true); setSaveErr("");
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await sb.from("profiles").update({
      full_name:  form.full_name,
      username:   form.username.toLowerCase().trim(),
      bio:        form.bio        || null,
      location:   form.location   || null,
      website:    form.website    || null,
      role:       form.role,
      instagram:  form.instagram  || null,
      behance:    form.behance    || null,
      linkedin:   form.linkedin   || null,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    if (error) {
      setSaveErr(error.message.includes("username") ? "That username is already taken." : error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setProfile(p => p ? { ...p, ...form } : p);
    }
    setSaving(false);
  }

  async function handleAvatarUpload(file: File) {
    setUploading(true);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) { setUploading(false); return; }
    const ext  = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = sb.storage.from("avatars").getPublicUrl(path);
      await sb.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setAvatar(publicUrl);
    }
    setUploading(false);
  }

  async function handleSignOut() {
    await sb.auth.signOut();
    router.push("/login");
  }

  const sf = (k: string) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const sfE = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const initials   = form.full_name ? form.full_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "A";
  const publicUrl  = form.username ? `${origin}/${form.username}` : null;
  const referralUrl = form.username ? `${origin}/register?ref=${form.username}` : null;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "account",  label: "Account",  icon: <Settings size={14} /> },
    { id: "social",   label: "Social",   icon: <Globe size={14} /> },
    { id: "store",    label: "My Store", icon: <ShoppingBag size={14} /> },
    { id: "referrals",label: "Referrals",icon: <Gift size={14} /> },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Darker+Grotesque:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        body{font-family:'Darker Grotesque',system-ui,sans-serif}

        .prf-input{
          width:100%;padding:11px 14px;
          border:2px solid #E8E0D0;border-radius:12px;
          font-size:14px;font-family:'Darker Grotesque',system-ui,sans-serif;
          font-weight:600;color:#111110;background:#fff;
          outline:none;transition:border-color .15s,box-shadow .15s;
        }
        .prf-input:focus{border-color:#FFD400;box-shadow:0 0 0 3px rgba(255,212,0,.2)}
        .prf-label{display:block;font-size:10px;font-weight:800;color:#9B8F7A;text-transform:uppercase;letter-spacing:.14em;margin-bottom:6px}
        .prf-hint{font-size:11px;font-weight:600;color:#C0B8A8;margin-top:5px}

        .prf-tab{
          display:flex;align-items:center;gap:7px;
          padding:10px 18px;border:none;
          font-family:inherit;font-size:13px;font-weight:700;
          cursor:pointer;transition:all .15s;white-space:nowrap;
          background:transparent;color:#9B8F7A;
          border-bottom:3px solid transparent;margin-bottom:-2px;
        }
        .prf-tab:hover{color:#111110}
        .prf-tab.active{color:#111110;border-bottom-color:#FFD400;background:transparent}

        .prf-section{background:#fff;border:2px solid #E8E0D0;border-radius:18px;padding:24px;margin-bottom:20px}
        .prf-section-title{font-size:13px;font-weight:900;color:#111110;text-transform:uppercase;letter-spacing:.1em;margin-bottom:20px;display:flex;align-items:center;gap:8px}
        .prf-section-title::after{content:'';flex:1;height:1.5px;background:#F0EBE3}

        .prf-save{
          display:flex;align-items:center;gap:8px;
          padding:12px 28px;border:2.5px solid #111110;border-radius:14px;
          font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;
          transition:all .2s cubic-bezier(.16,1,.3,1);
          box-shadow:4px 4px 0 #111110;
        }
        .prf-save:hover:not(:disabled){box-shadow:6px 6px 0 #111110;transform:translate(-1px,-1px)}
        .prf-save:disabled{opacity:.6;cursor:not-allowed}

        .role-card{
          display:flex;align-items:center;gap:12px;
          padding:14px 16px;border:2.5px solid #E8E0D0;border-radius:14px;
          cursor:pointer;transition:all .15s cubic-bezier(.16,1,.3,1);background:#fff;
          flex:1;
        }
        .role-card:hover{border-color:#111110}
        .role-card.active{border-color:#FFD400;background:#FFFBEA;box-shadow:3px 3px 0 #111110}

        .referral-box{
          background:linear-gradient(135deg,#111110 0%,#1a1a1a 100%);
          border:2.5px solid #111110;border-radius:18px;padding:28px;
          box-shadow:6px 6px 0 #FFD400;
        }

        .copy-btn{
          display:flex;align-items:center;gap:6px;
          padding:8px 14px;border:2px solid #333;border-radius:9999px;
          background:rgba(255,255,255,.08);color:#fff;
          font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;
          transition:all .15s;
        }
        .copy-btn:hover{background:rgba(255,255,255,.15);border-color:#FFD400}

        .store-preview{
          border:2.5px solid #111110;border-radius:18px;overflow:hidden;
          box-shadow:4px 4px 0 #D4C9A8;transition:all .2s cubic-bezier(.16,1,.3,1);
          text-decoration:none;display:block;background:#fff;
        }
        .store-preview:hover{box-shadow:6px 7px 0 #111110;transform:translate(-1px,-2px)}

        @keyframes savedBounce{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
        .saved-anim{animation:savedBounce .3s ease}
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* ── TOP HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: "#111110", letterSpacing: "-0.8px", margin: 0 }}>Profile Settings</h1>
            <p style={{ fontSize: 14, color: "#9B8F7A", margin: "4px 0 0", fontWeight: 600 }}>
              Manage your public profile and account preferences
            </p>
          </div>

          {/* Actions dropdown */}
          <div style={{ position: "relative" }} ref={actionsRef as any}>
            <div style={{ display: "flex", gap: 8 }}>
              {/* View public profile */}
              {publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", border: "2px solid #E8E0D0", borderRadius: 12, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all .15s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#111110"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#E8E0D0"; }}>
                    <Eye size={13} /> View Profile
                  </button>
                </a>
              )}

              {/* Actions menu */}
              <button
                onClick={() => setActionsOpen(p => !p)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", border: "2.5px solid #111110", borderRadius: 12, background: actionsOpen ? "#111110" : "#fff", color: actionsOpen ? "#FFD400" : "#111110", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", boxShadow: actionsOpen ? "3px 3px 0 #FFD400" : "2px 2px 0 #111110" }}
              >
                <Settings size={13} /> Options <ChevronDown size={12} style={{ transform: actionsOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
            </div>

            {/* Dropdown */}
            {actionsOpen && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "2.5px solid #111110", borderRadius: 16, boxShadow: "6px 6px 0 #111110", minWidth: 220, overflow: "hidden", zIndex: 50 }}>
                {[
                  { icon: <ShoppingBag size={14} />, label: "Go to MyStore",    action: () => { router.push("/dashboard/mystore"); setActionsOpen(false); } },
                  { icon: <Eye size={14} />,          label: "View public profile", action: () => { if (publicUrl) window.open(publicUrl, "_blank"); setActionsOpen(false); } },
                  { icon: <TrendingUp size={14} />,  label: "Analytics",        action: () => { router.push("/dashboard/analytics"); setActionsOpen(false); } },
                  { icon: <ImageIcon size={14} />,   label: "My Artworks",      action: () => { router.push("/dashboard/artworks"); setActionsOpen(false); } },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 16px", border: "none", borderBottom: "1px solid #F5F0E8", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#111110", textAlign: "left", fontFamily: "inherit" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FFFBEA")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    {item.icon}{item.label}
                  </button>
                ))}
                {/* Divider + Sign out */}
                <div style={{ borderTop: "2px solid #111110" }}>
                  <button onClick={handleSignOut}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#EF4444", textAlign: "left", fontFamily: "inherit" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#FEF2F2")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── AVATAR + STATS ROW ── */}
        <div style={{ display: "flex", gap: 20, alignItems: "center", marginBottom: 28, background: "#fff", border: "2.5px solid #111110", borderRadius: 22, padding: "20px 24px", boxShadow: "4px 4px 0 #D4C9A8" }}>
          {/* Avatar */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: 76, height: 76, borderRadius: 18, border: "3px solid #111110", background: "#FFD400", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 900, color: "#111110", boxShadow: "3px 3px 0 #111110", cursor: "pointer" }}
              onClick={() => fileRef.current?.click()}>
              {avatar
                ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials
              }
              {/* Hover overlay */}
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s", borderRadius: 16 }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "0")}>
                <Camera size={18} color="#FFD400" />
              </div>
            </div>
            {uploading && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,251,234,0.85)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 18, height: 18, border: "2px solid #FFD400", borderTop: "2px solid transparent", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
              </div>
            )}
            <button onClick={() => fileRef.current?.click()}
              style={{ position: "absolute", bottom: -4, right: -4, width: 24, height: 24, borderRadius: 8, background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Upload size={11} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
          </div>

          {/* Name + username */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#111110", letterSpacing: "-0.3px", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {form.full_name || "Your Name"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A" }}>@{form.username || "username"}</span>
              {form.role && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 9999, background: form.role === "gallery" ? "#E0F2FE" : "#FFD400", color: form.role === "gallery" ? "#0C4A6E" : "#111110", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", border: "1.5px solid #111110" }}>
                  {form.role === "gallery" ? "🏛️ Venue" : "🎨 Artist"}
                </span>
              )}
            </div>
            {publicUrl && (
              <div style={{ fontSize: 11, fontWeight: 600, color: "#C0B8A8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {publicUrl}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <StatPill label="Works"     value={stats.artworks}    color="#111110" />
            <StatPill label="Followers" value={stats.followers}   color="#FF6B6B" />
            <StatPill label="Shows"     value={stats.exhibitions} color="#4ECDC4" />
            <StatPill label="Sales"     value={stats.sales}       color="#16A34A" />
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* ── TAB BAR ── */}
        <div style={{ display: "flex", borderBottom: "2px solid #E8E0D0", marginBottom: 24, gap: 0, overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} className={`prf-tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════
            TAB: ACCOUNT
        ════════════════════════════ */}
        {tab === "account" && (
          <form onSubmit={handleSave}>
            {/* Identity */}
            <div className="prf-section">
              <div className="prf-section-title"><Settings size={14} /> Identity</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 }}>
                <div>
                  <label className="prf-label">Full name *</label>
                  <input className="prf-input" required value={form.full_name} onChange={sfE("full_name")} placeholder="Your name" />
                </div>
                <div>
                  <label className="prf-label">Username *</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: "#C0B8A8", pointerEvents: "none" }}>@</span>
                    <input className="prf-input" required value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} placeholder="yourname" style={{ paddingLeft: 28 }} />
                  </div>
                  <div className="prf-hint">Only lowercase letters, numbers, underscores</div>
                </div>
              </div>

              {/* Role picker */}
              <div style={{ marginBottom: 18 }}>
                <label className="prf-label">I am a…</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {ROLE_OPTIONS.map(r => (
                    <div key={r.key} className={`role-card${form.role === r.key ? " active" : ""}`} onClick={() => setForm(p => ({ ...p, role: r.key }))}>
                      <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>{r.emoji}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#111110" }}>{r.label}</div>
                        <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 500 }}>{r.desc}</div>
                      </div>
                      {form.role === r.key && (
                        <div style={{ marginLeft: "auto", width: 20, height: 20, borderRadius: "50%", background: "#FFD400", border: "2px solid #111110", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div style={{ marginBottom: 18 }}>
                <label className="prf-label">Bio</label>
                <textarea className="prf-input" rows={3} value={form.bio} onChange={sfE("bio")} placeholder="A few words about your work and practice…" style={{ resize: "vertical" }} />
                <div className="prf-hint" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Shown on your public profile</span>
                  <span>{form.bio.length}/300</span>
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="prf-label">Location</label>
                <PlacesAutocomplete
                  value={form.location}
                  placeholder="Search your city…"
                  onChange={(result, raw) => setForm(p => ({ ...p, location: raw }))}
                />
                <div className="prf-hint">Just your city is fine — no full address needed</div>
              </div>
            </div>

            {/* Save bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              {saveErr && (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#EF4444", display: "flex", alignItems: "center", gap: 6 }}>
                  ✕ {saveErr}
                </div>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                {saved && <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>✓ Saved!</span>}
                <button type="submit" className={`prf-save${saved ? " saved-anim" : ""}`} disabled={saving}
                  style={{ background: saved ? "#16A34A" : "#FFD400", color: saved ? "#fff" : "#111110" }}>
                  <Save size={14} /> {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ════════════════════════════
            TAB: SOCIAL
        ════════════════════════════ */}
        {tab === "social" && (
          <div>
            <div className="prf-section">
              <div className="prf-section-title"><Globe size={14} /> Links & Social Media</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#9B8F7A", marginBottom: 20 }}>
                Add your social links so collectors, galleries and collaborators can find you everywhere.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                <SocialRow
                  icon={<Globe size={15} color="#111110" />}
                  label="Website"
                  placeholder="yoursite.com"
                  prefix="https://"
                  value={form.website.replace(/^https?:\/\//, "")}
                  onChange={v => setForm(p => ({ ...p, website: v ? `https://${v}` : "" }))}
                  accent="#4ECDC4"
                />
                <SocialRow
                  icon={<Instagram size={15} color="#E1306C" />}
                  label="Instagram"
                  placeholder="yourhandle"
                  prefix="@"
                  value={form.instagram.replace(/^@/, "")}
                  onChange={v => setForm(p => ({ ...p, instagram: v }))}
                  accent="#E1306C"
                />
                <SocialRow
                  icon={<Palette size={15} color="#1769ff" />}
                  label="Behance"
                  placeholder="your-name"
                  prefix="behance.net/"
                  value={form.behance}
                  onChange={sf("behance")}
                  accent="#1769ff"
                />
                <SocialRow
                  icon={<Linkedin size={15} color="#0A66C2" />}
                  label="LinkedIn"
                  placeholder="your-name"
                  prefix="linkedin.com/in/"
                  value={form.linkedin}
                  onChange={sf("linkedin")}
                  accent="#0A66C2"
                />
              </div>

              {/* Public profile link */}
              {publicUrl && (
                <div style={{ background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Your public Artomango profile</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#111110", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{publicUrl}</div>
                    <button onClick={() => { navigator.clipboard.writeText(publicUrl); }}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "2px solid #E8E0D0", borderRadius: 9999, background: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", flexShrink: 0 }}>
                      <Copy size={11} /> Copy
                    </button>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                      <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: "2px solid #111110", borderRadius: 9999, background: "#FFD400", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110", flexShrink: 0 }}>
                        <ExternalLink size={11} /> Open
                      </button>
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="prf-save" disabled={saving} onClick={handleSave}
                style={{ background: saved ? "#16A34A" : "#FFD400", color: saved ? "#fff" : "#111110" }}>
                <Save size={14} /> {saving ? "Saving…" : saved ? "Saved!" : "Save Social Links"}
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════
            TAB: MY STORE
        ════════════════════════════ */}
        {tab === "store" && (
          <div>
            {/* Store preview card */}
            <a href="/dashboard/mystore" className="store-preview" style={{ marginBottom: 20 }}>
              <div style={{ background: "#111110", padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FFD400", border: "2px solid #FFD400", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShoppingBag size={20} color="#111110" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#FFD400" }}>MyStore</div>
                    <div style={{ fontSize: 11, color: "#666" }}>Your public storefront on Artomango</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ padding: "3px 10px", borderRadius: 9999, background: "#1a1a1a", border: "1px solid #333", fontSize: 10, fontWeight: 800, color: "#4ECDC4" }}>
                    Manage →
                  </div>
                </div>
              </div>
              <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { label: "Artworks in store", icon: <ImageIcon size={16} color="#FFD400" />, desc: "Curate what buyers see" },
                  { label: "Collab & events",   icon: <Handshake size={16} color="#4ECDC4" />, desc: "Showcase partnerships" },
                  { label: "Accent & layout",   icon: <Palette size={16} color="#FF6B6B" />,  desc: "Brand your page" },
                ].map(item => (
                  <div key={item.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "#F5F0E8", border: "1.5px solid #E8E0D0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#111110" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "#9B8F7A", fontWeight: 500 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </a>

            {/* Public URL */}
            {publicUrl && (
              <div className="prf-section">
                <div className="prf-section-title"><LinkIcon size={14} /> Your public URL</div>
                <p style={{ fontSize: 13, color: "#9B8F7A", fontWeight: 600, marginBottom: 16 }}>
                  This is your unified public page — it shows your store, artworks, collabs and events all in one place.
                </p>
                <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 12, padding: "12px 16px" }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111110", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{publicUrl}</div>
                  <button onClick={() => { navigator.clipboard.writeText(publicUrl); }}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "2px solid #E8E0D0", borderRadius: 10, background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", flexShrink: 0 }}>
                    <Copy size={12} /> Copy link
                  </button>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flexShrink: 0 }}>
                    <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "2.5px solid #111110", borderRadius: 10, background: "#FFD400", fontSize: 12, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", color: "#111110" }}>
                      <ExternalLink size={12} /> Open
                    </button>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════
            TAB: REFERRALS
        ════════════════════════════ */}
        {tab === "referrals" && (
          <div>
            {/* Hero referral card */}
            <div className="referral-box" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 12px", borderRadius: 9999, background: "rgba(255,212,0,.12)", border: "1px solid rgba(255,212,0,.25)", fontSize: 10, fontWeight: 800, color: "#FFD400", textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 10 }}>
                    🥭 Artomango Referrals
                  </div>
                  <h3 style={{ fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: "-0.5px", margin: 0, lineHeight: 1.1, marginBottom: 6 }}>
                    Invite your artist friends
                  </h3>
                  <p style={{ fontSize: 14, color: "#666", fontWeight: 600, maxWidth: 440, lineHeight: 1.6, margin: 0 }}>
                    Share your personal invite link. When someone signs up through it, they join with your name attached — and you build your network on Artomango.
                  </p>
                </div>
                <div style={{ textAlign: "center", background: "rgba(255,212,0,.08)", border: "1.5px solid rgba(255,212,0,.2)", borderRadius: 16, padding: "16px 24px", flexShrink: 0 }}>
                  <div style={{ fontSize: 42, fontWeight: 900, color: "#FFD400", letterSpacing: "-2px" }}>{referralCount}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.12em" }}>Artists invited</div>
                </div>
              </div>

              {/* Referral link */}
              {referralUrl ? (
                <div style={{ background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "14px 16px" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Your invite link</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{referralUrl}</div>
                    <button className="copy-btn"
                      onClick={() => { navigator.clipboard.writeText(referralUrl); setReferralCopied(true); setTimeout(() => setReferralCopied(false), 2000); }}>
                      {referralCopied ? <><Check size={12} color="#FFD400" /> Copied!</> : <><Copy size={12} /> Copy link</>}
                    </button>
                    <button className="copy-btn"
                      onClick={() => {
                        const text = `Hey! I'm using Artomango to manage my art practice and thought you'd love it. Join with my invite link: ${referralUrl}`;
                        navigator.clipboard.writeText(text);
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2000);
                      }}>
                      {inviteCopied ? <><Check size={12} color="#FFD400" /> Copied!</> : <><Users size={12} /> Copy invite message</>}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ background: "rgba(255,255,255,.06)", border: "1.5px solid rgba(255,212,0,.2)", borderRadius: 14, padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "#FFD400" }}>
                  ⚠ Set a username in Account tab to get your invite link.
                </div>
              )}
            </div>

            {/* How it works */}
            <div className="prf-section">
              <div className="prf-section-title"><Gift size={14} /> How referrals work</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { n: "01", emoji: "🔗", title: "Share your link", desc: "Send your unique invite link to artist friends, galleries, or post it on your social media." },
                  { n: "02", emoji: "✍️", title: "They sign up", desc: "When someone joins Artomango through your link, they're connected to you as the referrer." },
                  { n: "03", emoji: "🥭", title: "Your network grows", desc: "Your referral count goes up, and you build a genuine network on the platform." },
                ].map(step => (
                  <div key={step.n} style={{ padding: "18px", background: "#FAF7F3", border: "2px solid #E8E0D0", borderRadius: 16 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: "#C0B8A8", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      {step.n} <div style={{ flex: 1, height: 1, background: "#E8E0D0" }} />
                    </div>
                    <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 10 }}>{step.emoji}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#111110", marginBottom: 6 }}>{step.title}</div>
                    <div style={{ fontSize: 12, color: "#9B8F7A", fontWeight: 500, lineHeight: 1.6 }}>{step.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Share via platforms */}
            {referralUrl && (
              <div className="prf-section">
                <div className="prf-section-title"><Users size={14} /> Share via</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    {
                      label: "WhatsApp",
                      icon: "💬",
                      color: "#25D366",
                      href: `https://wa.me/?text=${encodeURIComponent(`I'm on Artomango — the platform for artists to manage work, find venues and grow. Join with my link: ${referralUrl}`)}`,
                    },
                    {
                      label: "Instagram DM",
                      icon: "📸",
                      color: "#E1306C",
                      action: () => { navigator.clipboard.writeText(referralUrl); alert("Link copied! Paste it in your Instagram DM or bio."); },
                    },
                    {
                      label: "Email",
                      icon: "✉️",
                      color: "#EA4335",
                      href: `mailto:?subject=Join me on Artomango&body=${encodeURIComponent(`Hey!\n\nI've been using Artomango to manage my art practice — it's great for inventory, exhibitions, and finding venues to collaborate with.\n\nJoin with my invite link: ${referralUrl}\n\nSee you there!`)}`,
                    },
                    {
                      label: "Copy message",
                      icon: "📋",
                      color: "#111110",
                      action: () => {
                        navigator.clipboard.writeText(`Hey! Join me on Artomango — a platform for artists to manage work, exhibit and collaborate. Use my invite link: ${referralUrl}`);
                        setInviteCopied(true);
                        setTimeout(() => setInviteCopied(false), 2000);
                      },
                    },
                  ].map(item => (
                    item.href ? (
                      <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "2px solid #E8E0D0", borderRadius: 12, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all .15s" }}
                          onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = item.color; el.style.background = item.color + "10"; }}
                          onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "#E8E0D0"; el.style.background = "#fff"; }}>
                          <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
                        </button>
                      </a>
                    ) : (
                      <button key={item.label} onClick={item.action}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", border: "2px solid #E8E0D0", borderRadius: 12, background: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", color: "#111110", transition: "all .15s" }}
                        onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = item.color; el.style.background = item.color + "10"; }}
                        onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = "#E8E0D0"; el.style.background = "#fff"; }}>
                        <span style={{ fontSize: 16 }}>{item.icon}</span> {item.label}
                      </button>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
