"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Loader2, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          setFullName(profile.full_name || "");
          setUsername(profile.username || "");
          setBio(profile.bio || "");
          setWebsite(profile.website || "");
          setLocation(profile.location || "");
          setRole(profile.role || "artist");
        }
      }
      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Check username uniqueness
    if (username) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", user.id)
        .single();

      if (existing) {
        setError("This username is already taken. Please choose another.");
        setSaving(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        username: username.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        bio,
        website,
        location,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError("Failed to save. Please try again.");
      console.error(updateError);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-9000" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <span className="section-label">Settings</span>
        <h1 className="heading-md mt-2">Profile Settings</h1>
        <p className="text-slate-9000 mt-1 text-sm">
          Update your profile information. This will appear on your public
          portfolio.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} />
          Profile saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Role Display */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">
            Account Type
          </label>
          <div className="px-4 py-3 bg-slate-50 border border-slate-150 text-slate-500 text-sm capitalize">
            {role}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Account type cannot be changed.
          </p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">
            {role === "gallery" ? "Gallery Name" : "Full Name"}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">
            Username
          </label>
          <div className="flex items-center gap-0">
            <span className="px-3 py-3 bg-slate-100 border border-r-0 border-slate-200 text-slate-9000 text-sm">
              artfolio.com/portfolio/
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                )
              }
              placeholder="yourname"
              className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Only letters, numbers, hyphens, and underscores.
          </p>
        </div>

        {/* Bio */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Tell the world about yourself or your gallery..."
            className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all resize-none"
          />
          <p className="text-xs text-slate-400 mt-1">
            {bio.length}/500 characters
          </p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-500 mb-2">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City, Country"
            className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all"
          />
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-150">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
