"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Palette, Building2, Compass, ArrowLeft } from "lucide-react";

type Role = "artist" | "venue" | "viewer" | null;

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [artistForm, setArtistForm] = useState({
    name: "", city: "", country: "Iran", medium: "", bio: "", email: "", password: "",
  });
  const [venueForm, setVenueForm] = useState({
    name: "", type: "gallery", city: "", country: "Iran", description: "", email: "", password: "",
  });
  const [viewerForm, setViewerForm] = useState({
    display_name: "", city: "", country: "", email: "", password: "",
  });

  function fieldSetter<T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setter((prev) => ({ ...prev, [key]: value }));
    };
  }

  async function handleArtistRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signUp({
      email: artistForm.email, password: artistForm.password,
      options: { data: { full_name: artistForm.name, role: "artist" } },
    });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    if (data.user) {
      const username = artistForm.name.toLowerCase().replace(/\s+/g, "") + Math.floor(Math.random() * 9999);
      await supabase.from("artists").insert({
        name: artistForm.name, username, city: artistForm.city,
        country: artistForm.country, medium: artistForm.medium,
        bio: artistForm.bio, contact_email: artistForm.email,
      });
      await supabase.from("profiles").upsert({
        id: data.user.id, email: artistForm.email,
        full_name: artistForm.name, role: "artist", username,
      });
    }
    router.push("/dashboard");
  }

  async function handleVenueRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signUp({
      email: venueForm.email, password: venueForm.password,
      options: { data: { full_name: venueForm.name, role: "gallery" } },
    });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    if (data.user) {
      const username = venueForm.name.toLowerCase().replace(/\s+/g, "") + Math.floor(Math.random() * 9999);
      await supabase.from("venues").insert({
        name: venueForm.name, type: venueForm.type, city: venueForm.city,
        country: venueForm.country, description: venueForm.description,
        contact_email: venueForm.email, owner_name: venueForm.name,
      });
      await supabase.from("profiles").upsert({
        id: data.user.id, email: venueForm.email,
        full_name: venueForm.name, role: "gallery", username,
      });
    }
    router.push("/dashboard");
  }

  async function handleViewerRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signUp({
      email: viewerForm.email, password: viewerForm.password,
      options: { data: { full_name: viewerForm.display_name, role: "artist" } },
    });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    if (data.user) {
      const username = viewerForm.display_name.toLowerCase().replace(/\s+/g, "") + Math.floor(Math.random() * 9999);
      await supabase.from("viewer_profiles").insert({
        username, display_name: viewerForm.display_name,
        city: viewerForm.city || null, country: viewerForm.country || null,
      });
      await supabase.from("profiles").upsert({
        id: data.user.id, email: viewerForm.email,
        full_name: viewerForm.display_name, role: "artist", username,
      });
    }
    router.push("/dashboard");
  }

  const ROLES = [
    { key: "artist" as Role, icon: Palette, label: "I'm an Artist", desc: "Showcase your work, connect with venues and collectors." },
    { key: "venue" as Role, icon: Building2, label: "I have a venue", desc: "A gallery, café, studio, or any space where art lives." },
    { key: "viewer" as Role, icon: Compass, label: "I'm here to explore", desc: "Browse artworks, venues and artists — no signup needed." },
  ];

  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <Link href="/" className="text-2xl font-bold tracking-tight">Artfolio</Link>
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Sign in</Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="text-center mb-14 max-w-lg">
            <h1 className="text-5xl font-bold tracking-tight mb-4">Why are you here?</h1>
            <p className="text-gray-400 text-lg">Tell us what brings you to Artfolio and we'll shape the experience around you.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
            {ROLES.map((role) => (
              <button key={String(role.key)} onClick={() => setSelectedRole(role.key)}
                className="group flex flex-col items-start p-8 rounded-2xl border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-200 text-left cursor-pointer bg-white">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-5 group-hover:bg-black transition-colors duration-200">
                  <role.icon className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors duration-200" />
                </div>
                <h2 className="text-lg font-semibold mb-2">{role.label}</h2>
                <p className="text-sm text-gray-400 leading-relaxed">{role.desc}</p>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button onClick={() => { setSelectedRole(null); setError(""); }}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-semibold text-stone-900">
            {selectedRole === "artist" && "Create your artist profile"}
            {selectedRole === "venue" && "Register your venue"}
            {selectedRole === "viewer" && "Join as an art lover"}
          </h1>
          <p className="text-stone-500 text-sm mt-1">Join the Artfolio community</p>
        </div>
        <div className="card p-6">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 mb-4">{error}</div>}

          {selectedRole === "artist" && (
            <form onSubmit={handleArtistRegister} className="space-y-4">
              <div><label className="label">Full Name *</label><input required className="input" value={artistForm.name} onChange={fieldSetter(setArtistForm, "name")} placeholder="Your name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">City *</label><input required className="input" value={artistForm.city} onChange={fieldSetter(setArtistForm, "city")} placeholder="Tehran" /></div>
                <div><label className="label">Country</label><input className="input" value={artistForm.country} onChange={fieldSetter(setArtistForm, "country")} /></div>
              </div>
              <div><label className="label">Medium / Style</label><input className="input" value={artistForm.medium} onChange={fieldSetter(setArtistForm, "medium")} placeholder="Oil painting, sculpture..." /></div>
              <div><label className="label">Short Bio</label><textarea rows={2} className="textarea" value={artistForm.bio} onChange={fieldSetter(setArtistForm, "bio")} placeholder="Tell us about your practice..." /></div>
              <div><label className="label">Email *</label><input required type="email" className="input" value={artistForm.email} onChange={fieldSetter(setArtistForm, "email")} placeholder="you@example.com" /></div>
              <div><label className="label">Password *</label><input required type="password" className="input" value={artistForm.password} onChange={fieldSetter(setArtistForm, "password")} placeholder="Min 8 characters" minLength={8} /></div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">{loading ? "Creating profile..." : "Create Artist Profile"}</button>
            </form>
          )}

          {selectedRole === "venue" && (
            <form onSubmit={handleVenueRegister} className="space-y-4">
              <div><label className="label">Venue Name *</label><input required className="input" value={venueForm.name} onChange={fieldSetter(setVenueForm, "name")} placeholder="Gallery or space name" /></div>
              <div><label className="label">Type</label>
                <select className="select" value={venueForm.type} onChange={fieldSetter(setVenueForm, "type")}>
                  <option value="gallery">Gallery</option><option value="cafe">Café</option>
                  <option value="studio">Studio</option><option value="museum">Museum</option><option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">City *</label><input required className="input" value={venueForm.city} onChange={fieldSetter(setVenueForm, "city")} placeholder="Tehran" /></div>
                <div><label className="label">Country</label><input className="input" value={venueForm.country} onChange={fieldSetter(setVenueForm, "country")} /></div>
              </div>
              <div><label className="label">Description</label><textarea rows={2} className="textarea" value={venueForm.description} onChange={fieldSetter(setVenueForm, "description")} placeholder="About your venue..." /></div>
              <div><label className="label">Email *</label><input required type="email" className="input" value={venueForm.email} onChange={fieldSetter(setVenueForm, "email")} placeholder="venue@example.com" /></div>
              <div><label className="label">Password *</label><input required type="password" className="input" value={venueForm.password} onChange={fieldSetter(setVenueForm, "password")} placeholder="Min 8 characters" minLength={8} /></div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">{loading ? "Registering..." : "Register Venue"}</button>
            </form>
          )}

          {selectedRole === "viewer" && (
            <form onSubmit={handleViewerRegister} className="space-y-4">
              <div><label className="label">Display Name *</label><input required className="input" value={viewerForm.display_name} onChange={fieldSetter(setViewerForm, "display_name")} placeholder="How you appear to others" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">City</label><input className="input" value={viewerForm.city} onChange={fieldSetter(setViewerForm, "city")} placeholder="Optional" /></div>
                <div><label className="label">Country</label><input className="input" value={viewerForm.country} onChange={fieldSetter(setViewerForm, "country")} placeholder="Optional" /></div>
              </div>
              <div><label className="label">Email *</label><input required type="email" className="input" value={viewerForm.email} onChange={fieldSetter(setViewerForm, "email")} placeholder="you@example.com" /></div>
              <div><label className="label">Password *</label><input required type="password" className="input" value={viewerForm.password} onChange={fieldSetter(setViewerForm, "password")} placeholder="Min 8 characters" minLength={8} /></div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">{loading ? "Creating account..." : "Join Artfolio"}</button>
            </form>
          )}

          <p className="text-center text-sm text-stone-500 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
