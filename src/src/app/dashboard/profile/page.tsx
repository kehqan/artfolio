"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Upload } from "lucide-react";

export default function ProfilePage() {
  const [form, setForm] = useState({
    full_name: "", username: "", bio: "", location: "", website: "", role: "artist",
  });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
        if (data) {
          setForm({ full_name: data.full_name || "", username: data.username || "", bio: data.bio || "", location: data.location || "", website: data.website || "", role: data.role || "artist" });
          setAvatar(data.avatar_url || null);
        }
      });
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
    setMessage(error ? "Error saving — try again" : "Profile saved successfully!");
    setTimeout(() => setMessage(""), 3000);
    setSaving(false);
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profile Settings</h1>
        <p className="page-subtitle">Update your public profile and account info</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl">
        <div className="card p-6 mb-5">
          <h2 className="heading-sm mb-4">Profile Photo</h2>
          <div className="flex items-center gap-5">
            {avatar ? (
              <img src={avatar} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-stone-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-400 text-2xl font-bold">
                {form.full_name?.[0] || "A"}
              </div>
            )}
            <div>
              <label className="btn-secondary cursor-pointer">
                <Upload className="w-4 h-4" /> Upload Photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
              </label>
              <p className="text-xs text-stone-400 mt-1.5">JPG or PNG, max 5MB</p>
            </div>
          </div>
        </div>

        <div className="card p-6 mb-5 space-y-4">
          <h2 className="heading-sm mb-2">Basic Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Full Name *</label>
              <input required className="input" value={form.full_name} onChange={set("full_name")} placeholder="Your name" />
            </div>
            <div>
              <label className="label">Username</label>
              <input className="input" value={form.username} onChange={set("username")} placeholder="yourname" />
              <p className="text-xs text-stone-400 mt-1">Used for your portfolio URL</p>
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <select className="select" value={form.role} onChange={set("role")}>
              <option value="artist">Artist</option>
              <option value="gallery">Gallery</option>
            </select>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea rows={4} className="textarea" value={form.bio} onChange={set("bio")} placeholder="Tell the world about your work and practice..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location} onChange={set("location")} placeholder="City, Country" />
            </div>
            <div>
              <label className="label">Website</label>
              <input type="url" className="input" value={form.website} onChange={set("website")} placeholder="https://yoursite.com" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
          {message && (
            <p className={`text-sm font-medium ${message.includes("Error") ? "text-rose-600" : "text-emerald-600"}`}>
              {message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
