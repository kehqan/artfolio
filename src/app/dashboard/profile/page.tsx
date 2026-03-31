"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Upload, ExternalLink, Globe } from "lucide-react";

const TABS = ["Account", "Portfolio", "Social", "Security"];

type Profile = {
  full_name: string; username: string; bio: string; location: string;
  website: string; role: string; avatar_url?: string;
  artworks_count?: number; followers_count?: number;
};

export default function ProfilePage() {
  const [tab, setTab]       = useState("Account");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm]     = useState({ full_name: "", username: "", bio: "", location: "", website: "", role: "artist" });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats]   = useState({ artworks: 0, followers: 0, exhibitions: 0 });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setForm({ full_name: data.full_name || "", username: data.username || "", bio: data.bio || "", location: data.location || "", website: data.website || "", role: data.role || "artist" });
        setAvatar(data.avatar_url || null);
      }

      const [{ count: aw }, { count: fo }, { count: ex }] = await Promise.all([
        supabase.from("artworks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("exhibitions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setStats({ artworks: aw ?? 0, followers: fo ?? 0, exhibitions: ex ?? 0 });
    });
  }, []);

  async function handleAvatarUpload(file: File) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setAvatar(publicUrl);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setMessage(error ? "Error saving — try again" : "Profile updated!");
    setTimeout(() => setMessage(""), 3000);
    setSaving(false);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const portfolioUrl = form.username ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://artfolio-tawny.vercel.app"}/portfolio/${form.username}` : null;

  const Label = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{children}</label>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement> & { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
    <input {...props} style={{
      width: "100%", padding: "10px 12px", border: "none",
      borderBottom: "2px solid #d4cfc4", borderRadius: 0,
      fontSize: 14, fontFamily: "inherit", fontWeight: 600,
      color: "#111110", background: "transparent", outline: "none",
      transition: "border-color 0.1s", boxSizing: "border-box",
    }}
    onFocus={e => (e.target.style.borderBottomColor = "#FFD400")}
    onBlur={e => (e.target.style.borderBottomColor = "#d4cfc4")}
    />
  );

  return (
    <>
      <style>{`
        .pt-tab:hover { background: #F5F0E8 !important; }
        .pt-input:focus { border-bottom-color: #FFD400 !important; }
      `}</style>

      <div>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#111110", letterSpacing: "-0.5px", marginBottom: 2 }}>Profile Settings</h1>
          <p style={{ fontSize: 13, color: "#9B8F7A" }}>Update your public profile and account information</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24 }}>

          {/* ── LEFT PANEL ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Avatar card */}
            <div style={{ border: "2px solid #111110", borderRadius: 8, overflow: "hidden", boxShadow: "4px 4px 0 #111110", marginBottom: 16, background: "#fff" }}>
              {/* Avatar */}
              <div style={{ padding: "20px", borderBottom: "1px solid #E0D8CA", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                {avatar
                  ? <img src={avatar} alt="" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "3px solid #111110", boxShadow: "3px 3px 0 #111110" }} />
                  : <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#FFD400", border: "3px solid #111110", boxShadow: "3px 3px 0 #111110", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: "#111110" }}>
                      {form.full_name?.[0]?.toUpperCase() || "A"}
                    </div>
                }
                <label style={{ cursor: "pointer" }}>
                  <button type="button" style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", border: "2px solid #111110", borderRadius: 6,
                    background: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    boxShadow: "2px 2px 0 #111110",
                  }} onClick={() => document.getElementById("avatar-input")?.click()}>
                    <Upload size={11} /> Change Photo
                  </button>
                  <input id="avatar-input" type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                </label>
              </div>

              {/* Identity */}
              <div style={{ padding: "14px 16px", borderBottom: "1px solid #E0D8CA" }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: "#111110", marginBottom: 2 }}>{form.full_name || "Your Name"}</div>
                <div style={{ fontSize: 11, color: "#9B8F7A", marginBottom: 6 }}>@{form.username || "username"}</div>
                {form.role && (
                  <span style={{ display: "inline-block", padding: "2px 10px", border: "1.5px solid #111110", borderRadius: 20, fontSize: 10, fontWeight: 800, background: "#FFD400", color: "#111110", textTransform: "capitalize" }}>
                    {form.role}
                  </span>
                )}
              </div>

              {/* Stats */}
              {[
                { label: "Artworks",    value: stats.artworks,    delta: null },
                { label: "Followers",   value: stats.followers,   delta: "+5", pos: true },
                { label: "Exhibitions", value: stats.exhibitions, delta: null },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: "1px dotted #E0D8CA" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#111110" }}>{s.value}</span>
                    {s.delta && (
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: s.pos ? "#DCFCE7" : "#FEE2E2", color: s.pos ? "#166534" : "#991B1B", border: "1.5px solid #111110" }}>
                        {s.delta}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#9B8F7A" }}>{s.label}</span>
                </div>
              ))}

              {/* Portfolio link */}
              {portfolioUrl && (
                <div style={{ padding: "12px 14px" }}>
                  <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                    <button style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", border: "2px solid #111110", borderRadius: 6, background: "#fff", color: "#111110", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                      <ExternalLink size={12} /> View Portfolio
                    </button>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div>
            {/* Tabs */}
            <div style={{ display: "flex", alignItems: "center", borderBottom: "2px solid #111110", marginBottom: 0 }}>
              {TABS.map(t => (
                <button key={t} className="pt-tab" onClick={() => setTab(t)} style={{
                  padding: "11px 20px", border: "none",
                  borderBottom: tab === t ? "3px solid #FFD400" : "none",
                  background: tab === t ? "#FFD400" : "transparent",
                  fontSize: 13, fontWeight: 700, color: "#111110",
                  cursor: "pointer", marginBottom: tab === t ? -2 : 0,
                  transition: "background 0.1s",
                }}>{t}</button>
              ))}
              <div style={{ marginLeft: "auto" }}>
                <button style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", border: "2px solid #111110", borderRadius: 6, background: "#fff", color: "#111110", fontWeight: 700, fontSize: 12, cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                  ··· Actions
                </button>
              </div>
            </div>

            {/* Tab body */}
            <div style={{ border: "2px solid #111110", borderTop: "none", borderRadius: "0 0 8px 8px", boxShadow: "4px 4px 0 #111110", background: "#fff", padding: "28px 28px 24px" }}>

              {tab === "Account" && (
                <form onSubmit={handleSave}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 24, paddingBottom: 14, borderBottom: "1px solid #E0D8CA" }}>
                    Public account details
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {/* Full name */}
                    <div style={{ paddingBottom: 20, borderBottom: "1px solid #F5F0E8", marginBottom: 20 }}>
                      <Label>Full Name</Label>
                      <Input value={form.full_name} onChange={set("full_name")} placeholder="Your full name" />
                    </div>

                    {/* Username + role in a grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, paddingBottom: 20, borderBottom: "1px solid #F5F0E8", marginBottom: 20 }}>
                      <div>
                        <Label>Username</Label>
                        <Input value={form.username} onChange={set("username")} placeholder="yourname" />
                        <div style={{ fontSize: 10, color: "#9B8F7A", marginTop: 4 }}>artfolio.com/portfolio/{form.username || "username"}</div>
                      </div>
                      <div>
                        <Label>Role</Label>
                        <select value={form.role} onChange={set("role")} style={{
                          width: "100%", padding: "10px 0", border: "none",
                          borderBottom: "2px solid #d4cfc4", fontSize: 14, fontFamily: "inherit",
                          fontWeight: 600, color: "#111110", background: "transparent", outline: "none",
                          cursor: "pointer",
                        }}>
                          <option value="artist">Artist</option>
                          <option value="gallery">Gallery</option>
                        </select>
                      </div>
                    </div>

                    {/* Location */}
                    <div style={{ paddingBottom: 20, borderBottom: "1px solid #F5F0E8", marginBottom: 20 }}>
                      <Label>Location</Label>
                      <Input value={form.location} onChange={set("location")} placeholder="City, Country" />
                    </div>

                    {/* Bio */}
                    <div style={{ paddingBottom: 20, borderBottom: "1px solid #F5F0E8", marginBottom: 20 }}>
                      <Label>Bio</Label>
                      <textarea
                        rows={4}
                        value={form.bio}
                        onChange={set("bio")}
                        placeholder="Tell the world about your work and practice…"
                        style={{
                          width: "100%", padding: "10px 0", border: "none",
                          borderBottom: "2px solid #d4cfc4", fontSize: 14, fontFamily: "inherit",
                          color: "#111110", background: "transparent", outline: "none",
                          resize: "vertical", lineHeight: 1.6, boxSizing: "border-box",
                        }}
                        onFocus={e => (e.target.style.borderBottomColor = "#FFD400")}
                        onBlur={e => (e.target.style.borderBottomColor = "#d4cfc4")}
                      />
                    </div>

                    {/* Website */}
                    <div style={{ marginBottom: 32 }}>
                      <Label>Website</Label>
                      <Input value={form.website} onChange={set("website")} placeholder="https://yoursite.com" type="url" />
                    </div>
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button type="button" onClick={() => window.location.reload()} style={{
                      padding: "11px 24px", border: "2px solid #111110", borderRadius: 6,
                      background: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
                    }}>
                      Reset Changes
                    </button>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      {message && <span style={{ fontSize: 13, fontWeight: 600, color: message.includes("Error") ? "#cc0000" : "#00874A" }}>{message}</span>}
                      <button type="submit" disabled={saving} style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "11px 28px", border: "2px solid #111110", borderRadius: 6,
                        background: "#FFD400", color: "#111110",
                        fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                        boxShadow: "3px 3px 0 #111110",
                      }}>
                        <Save size={14} /> {saving ? "Saving…" : "Update Settings"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {tab === "Portfolio" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 24, paddingBottom: 14, borderBottom: "1px solid #E0D8CA" }}>
                    Portfolio settings
                  </div>

                  {portfolioUrl ? (
                    <div style={{ padding: "18px", border: "2px solid #111110", borderRadius: 8, background: "#F5F0E8", marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Your Portfolio URL</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <code style={{ flex: 1, fontSize: 13, color: "#111110", fontWeight: 700, background: "#fff", padding: "8px 12px", border: "2px solid #111110", borderRadius: 6 }}>
                          {portfolioUrl}
                        </code>
                        <a href={portfolioUrl} target="_blank" rel="noopener noreferrer">
                          <button style={{ width: 36, height: 36, border: "2px solid #111110", borderRadius: 6, background: "#FFD400", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "2px 2px 0 #111110" }}>
                            <ExternalLink size={14} />
                          </button>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: "18px", border: "2px solid #FFD400", borderRadius: 8, background: "#FFFBEA", marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#856404" }}>Set a username in the Account tab to get your portfolio URL.</div>
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                    {[
                      { label: "Total Artworks",   value: stats.artworks,    note: "in your inventory"  },
                      { label: "Public Exhibitions",value: stats.exhibitions, note: "visible to visitors" },
                      { label: "Followers",         value: stats.followers,   note: "following you"      },
                    ].map(s => (
                      <div key={s.label} style={{ border: "2px solid #111110", borderRadius: 8, padding: "16px", background: "#fff", boxShadow: "2px 2px 0 #111110" }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: "#111110", marginBottom: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#9B8F7A", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: "#d4cfc4", marginTop: 2 }}>{s.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "Social" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 24, paddingBottom: 14, borderBottom: "1px solid #E0D8CA" }}>
                    Social networks
                  </div>
                  {[
                    { label: "Website",   icon: "🌐", placeholder: "https://yoursite.com",          key: "website" },
                    { label: "Instagram", icon: "📸", placeholder: "https://instagram.com/yourname", key: "website" },
                  ].map(item => (
                    <div key={item.label} style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid #F5F0E8" }}>
                      <Label>{item.icon} {item.label}</Label>
                      <input
                        defaultValue=""
                        placeholder={item.placeholder}
                        style={{ width: "100%", padding: "10px 0", border: "none", borderBottom: "2px solid #d4cfc4", fontSize: 14, fontFamily: "inherit", fontWeight: 600, color: "#111110", background: "transparent", outline: "none", boxSizing: "border-box" }}
                        onFocus={e => (e.target.style.borderBottomColor = "#FFD400")}
                        onBlur={e => (e.target.style.borderBottomColor = "#d4cfc4")}
                      />
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button style={{ padding: "11px 28px", border: "2px solid #111110", borderRadius: 6, background: "#FFD400", color: "#111110", fontWeight: 800, fontSize: 14, cursor: "pointer", boxShadow: "3px 3px 0 #111110" }}>
                      Update Settings
                    </button>
                  </div>
                </div>
              )}

              {tab === "Security" && (
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#111110", marginBottom: 24, paddingBottom: 14, borderBottom: "1px solid #E0D8CA" }}>
                    Security settings
                  </div>
                  <div style={{ padding: "20px", border: "2px solid #E0D8CA", borderRadius: 8, background: "#F5F0E8", marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#5C5346" }}>
                      To change your email or password, please use the Supabase auth settings or contact support.
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#9B8F7A" }}>
                    Your account is secured with Supabase Authentication. All passwords are encrypted and never stored in plain text.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
