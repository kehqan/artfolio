"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Palette, Building2, Compass, ArrowLeft, ArrowRight,
  Upload, Check, Brush, Calendar, Tag, MapPin, AtSign, Mail, Lock, User
} from "lucide-react";

type RoleChoice = "artist" | "venue" | "viewer" | null;
type Step = 1 | 2;

// ─── Artist forms ───────────────────────────────────────────────
interface ArtistStep1 { name: string; style: string; yearsActive: string }
interface ArtistStep2 { username: string; city: string; country: string; email: string; password: string; avatarFile: File | null; avatarPreview: string }

// ─── Venue forms ────────────────────────────────────────────────
interface VenueStep1 { venueName: string; venueType: string; artTypes: string[] }
interface VenueStep2 { username: string; city: string; country: string; email: string; password: string; avatarFile: File | null; avatarPreview: string }

const ART_TYPES = ["Painting", "Sculpture", "Photography", "Digital Art", "Installation", "Illustration", "Ceramics", "Textile", "Printmaking", "Mixed Media"];
const VENUE_TYPES = ["Gallery", "Café", "Bar", "Restaurant", "Studio", "Museum", "Event Space", "Shop", "Hotel", "Other"];

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleChoice>(null);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const avatarRef = useRef<HTMLInputElement>(null);

  // Artist state
  const [a1, setA1] = useState<ArtistStep1>({ name: "", style: "", yearsActive: "" });
  const [a2, setA2] = useState<ArtistStep2>({ username: "", city: "", country: "", email: "", password: "", avatarFile: null, avatarPreview: "" });

  // Venue state
  const [v1, setV1] = useState<VenueStep1>({ venueName: "", venueType: "", artTypes: [] });
  const [v2, setV2] = useState<VenueStep2>({ username: "", city: "", country: "", email: "", password: "", avatarFile: null, avatarPreview: "" });

  function handleAvatar(file: File | null, isArtist: boolean) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (isArtist) setA2((p) => ({ ...p, avatarFile: file, avatarPreview: preview }));
      else setV2((p) => ({ ...p, avatarFile: file, avatarPreview: preview }));
    };
    reader.readAsDataURL(file);
  }

  function toggleArtType(t: string) {
    setV1((p) => ({
      ...p,
      artTypes: p.artTypes.includes(t) ? p.artTypes.filter((x) => x !== t) : [...p.artTypes, t],
    }));
  }

  async function uploadAvatar(file: File, userId: string): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    return publicUrl;
  }

  async function registerArtist() {
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signUp({
      email: a2.email, password: a2.password,
      options: { data: { full_name: a1.name, role: "artist" } },
    });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    if (!data.user) { setLoading(false); return; }

    const userId = data.user.id;
    let avatarUrl: string | null = null;
    if (a2.avatarFile) avatarUrl = await uploadAvatar(a2.avatarFile, userId);

    const username = a2.username || a1.name.toLowerCase().replace(/\s+/g, "") + Math.floor(Math.random() * 9999);

    await supabase.from("artists").insert({
      name: a1.name, username, city: a2.city, country: a2.country,
      medium: a1.style, bio: `${a1.yearsActive} years of practice`,
      contact_email: a2.email, avatar_url: avatarUrl,
    });

    await supabase.from("profiles").upsert({
      id: userId, email: a2.email, full_name: a1.name,
      role: "artist", username, avatar_url: avatarUrl,
      location: [a2.city, a2.country].filter(Boolean).join(", "),
    });

    router.push("/dashboard");
  }

  async function registerVenue() {
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signUp({
      email: v2.email, password: v2.password,
      options: { data: { full_name: v1.venueName, role: "gallery" } },
    });
    if (authErr) { setError(authErr.message); setLoading(false); return; }
    if (!data.user) { setLoading(false); return; }

    const userId = data.user.id;
    let avatarUrl: string | null = null;
    if (v2.avatarFile) avatarUrl = await uploadAvatar(v2.avatarFile, userId);

    const username = v2.username || v1.venueName.toLowerCase().replace(/\s+/g, "") + Math.floor(Math.random() * 9999);

    await supabase.from("venues").insert({
      name: v1.venueName, type: v1.venueType.toLowerCase(),
      city: v2.city, country: v2.country,
      contact_email: v2.email, logo_url: avatarUrl,
      owner_name: v1.venueName,
      description: v1.artTypes.length ? `Specialising in: ${v1.artTypes.join(", ")}` : null,
    });

    await supabase.from("profiles").upsert({
      id: userId, email: v2.email, full_name: v1.venueName,
      role: "gallery", username, avatar_url: avatarUrl,
      location: [v2.city, v2.country].filter(Boolean).join(", "),
    });

    router.push("/dashboard");
  }

  // ─── Step validation ────────────────────────────────────────────
  const artistStep1Valid = a1.name.trim() && a1.style.trim();
  const venueStep1Valid = v1.venueName.trim() && v1.venueType;

  // ─── Role picker ────────────────────────────────────────────────
  if (!role) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <Link href="/" className="text-2xl font-bold tracking-tight font-display">Artfolio</Link>
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">Sign in</Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <div className="text-center mb-14 max-w-lg">
            <h1 className="text-5xl font-bold tracking-tight mb-4 font-display">Why are you here?</h1>
            <p className="text-gray-400 text-lg">Tell us what brings you to Artfolio.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
            {[
              { key: "artist" as const, icon: Palette, label: "I'm an Artist", desc: "Showcase your work, connect with venues and collectors." },
              { key: "venue" as const, icon: Building2, label: "I have a venue", desc: "A gallery, café, studio, or any space where art lives." },
              { key: "viewer" as const, icon: Compass, label: "I'm here to explore", desc: "Browse art, venues and artists — discover what moves you." },
            ].map((r) => (
              <button key={r.key} onClick={() => {
                if (r.key === "viewer") { router.push("/explore"); return; }
                setRole(r.key); setStep(1);
              }}
                className="group flex flex-col items-start p-8 rounded-2xl border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-200 text-left bg-white">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-5 group-hover:bg-black transition-colors duration-200">
                  <r.icon className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors duration-200" />
                </div>
                <h2 className="text-lg font-semibold mb-2">{r.label}</h2>
                <p className="text-sm text-gray-400 leading-relaxed">{r.desc}</p>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ─── Shared step progress bar ───────────────────────────────────
  const StepIndicator = () => (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            s < step ? "bg-stone-900 text-white" :
            s === step ? "bg-emerald-500 text-white" :
            "bg-stone-100 text-stone-400"
          }`}>
            {s < step ? <Check className="w-4 h-4" /> : s}
          </div>
          <span className={`text-sm ${s === step ? "text-stone-900 font-medium" : "text-stone-400"}`}>
            {role === "artist"
              ? (s === 1 ? "Your practice" : "Account details")
              : (s === 1 ? "Your venue" : "Account details")}
          </span>
          {s < 2 && <div className={`w-8 h-0.5 ${step > s ? "bg-stone-900" : "bg-stone-200"}`} />}
        </div>
      ))}
    </div>
  );

  // ─── ARTIST STEP 1 ───────────────────────────────────────────────
  if (role === "artist" && step === 1) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setRole(null)} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <StepIndicator />
          <div className="card p-8">
            <h1 className="font-display text-2xl font-semibold text-stone-900 mb-1">Tell us about your practice</h1>
            <p className="text-stone-500 text-sm mb-6">Help venues and collectors discover you</p>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Your full name *</label>
                <input required className="input" value={a1.name} onChange={(e) => setA1((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Neda Rahimi" />
              </div>

              {/* Style */}
              <div>
                <label className="label flex items-center gap-1.5"><Brush className="w-3.5 h-3.5" /> Artistic style / medium *</label>
                <input required className="input" value={a1.style} onChange={(e) => setA1((p) => ({ ...p, style: e.target.value }))} placeholder="e.g. Abstract oil painting, sculpture, digital..." />
              </div>

              {/* Years */}
              <div>
                <label className="label flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Years of active practice</label>
                <div className="grid grid-cols-4 gap-2">
                  {["< 1", "1–3", "3–7", "7–15", "15+"].map((y) => (
                    <button key={y} type="button" onClick={() => setA1((p) => ({ ...p, yearsActive: y }))}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                        a1.yearsActive === y ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}>
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              disabled={!artistStep1Valid}
              onClick={() => setStep(2)}
              className="btn-primary w-full justify-center py-3 mt-6 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ARTIST STEP 2 ───────────────────────────────────────────────
  if (role === "artist" && step === 2) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <StepIndicator />
          <div className="card p-8">
            <h1 className="font-display text-2xl font-semibold text-stone-900 mb-1">Set up your account</h1>
            <p className="text-stone-500 text-sm mb-6">Welcome, {a1.name} 👋</p>

            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 mb-4">{error}</div>}

            <div className="space-y-4">
              {/* Avatar */}
              <div>
                <label className="label">Profile photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-stone-100 overflow-hidden shrink-0 cursor-pointer border-2 border-dashed border-stone-300 hover:border-stone-500 transition-colors flex items-center justify-center"
                    onClick={() => avatarRef.current?.click()}>
                    {a2.avatarPreview
                      ? <img src={a2.avatarPreview} alt="" className="w-full h-full object-cover" />
                      : <Upload className="w-6 h-6 text-stone-400" />}
                  </div>
                  <div>
                    <button type="button" onClick={() => avatarRef.current?.click()} className="btn-secondary text-sm py-1.5">Upload photo</button>
                    <p className="text-xs text-stone-400 mt-1">JPG or PNG, optional</p>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatar(e.target.files?.[0] || null, true)} />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="label flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5" /> Username</label>
                <input className="input" value={a2.username} onChange={(e) => setA2((p) => ({ ...p, username: e.target.value }))} placeholder={`e.g. ${a1.name.toLowerCase().replace(/\s+/g, "")}`} />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> City</label>
                  <input className="input" value={a2.city} onChange={(e) => setA2((p) => ({ ...p, city: e.target.value }))} placeholder="Tehran" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input className="input" value={a2.country} onChange={(e) => setA2((p) => ({ ...p, country: e.target.value }))} placeholder="Iran" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</label>
                <input required type="email" className="input" value={a2.email} onChange={(e) => setA2((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
              </div>

              {/* Password */}
              <div>
                <label className="label flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Password *</label>
                <input required type="password" className="input" value={a2.password} onChange={(e) => setA2((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" minLength={8} />
              </div>
            </div>

            <button
              disabled={loading || !a2.email || !a2.password}
              onClick={registerArtist}
              className="btn-primary w-full justify-center py-3 mt-6 disabled:opacity-40"
            >
              {loading ? "Creating your profile..." : "Join Artfolio"}
            </button>

            <p className="text-center text-sm text-stone-500 mt-4">
              Already have an account? <Link href="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── VENUE STEP 1 ───────────────────────────────────────────────
  if (role === "venue" && step === 1) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setRole(null)} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <StepIndicator />
          <div className="card p-8">
            <h1 className="font-display text-2xl font-semibold text-stone-900 mb-1">Tell us about your venue</h1>
            <p className="text-stone-500 text-sm mb-6">Help artists find the perfect home for their work</p>

            <div className="space-y-5">
              {/* Venue name */}
              <div>
                <label className="label flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Venue name *</label>
                <input required className="input" value={v1.venueName} onChange={(e) => setV1((p) => ({ ...p, venueName: e.target.value }))} placeholder="e.g. Azad Art Gallery" />
              </div>

              {/* Venue type */}
              <div>
                <label className="label">Type of venue *</label>
                <div className="grid grid-cols-3 gap-2">
                  {VENUE_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => setV1((p) => ({ ...p, venueType: t }))}
                      className={`py-2 px-3 rounded-xl text-sm font-medium border transition-colors text-left ${
                        v1.venueType === t ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Art types */}
              <div>
                <label className="label flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> What art do you collect / show? <span className="text-stone-400 font-normal">(select all that apply)</span></label>
                <div className="flex flex-wrap gap-2">
                  {ART_TYPES.map((t) => (
                    <button key={t} type="button" onClick={() => toggleArtType(t)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        v1.artTypes.includes(t) ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"
                      }`}>
                      {v1.artTypes.includes(t) && <Check className="w-3 h-3 inline mr-1" />}{t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              disabled={!venueStep1Valid}
              onClick={() => setStep(2)}
              className="btn-primary w-full justify-center py-3 mt-6 disabled:opacity-40"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── VENUE STEP 2 ───────────────────────────────────────────────
  if (role === "venue" && step === 2) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <button onClick={() => setStep(1)} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-6 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <StepIndicator />
          <div className="card p-8">
            <h1 className="font-display text-2xl font-semibold text-stone-900 mb-1">Set up your account</h1>
            <p className="text-stone-500 text-sm mb-6">Welcome, {v1.venueName} 👋</p>

            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 mb-4">{error}</div>}

            <div className="space-y-4">
              {/* Avatar / Logo */}
              <div>
                <label className="label">Venue logo / photo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden shrink-0 cursor-pointer border-2 border-dashed border-stone-300 hover:border-stone-500 transition-colors flex items-center justify-center"
                    onClick={() => avatarRef.current?.click()}>
                    {v2.avatarPreview
                      ? <img src={v2.avatarPreview} alt="" className="w-full h-full object-cover" />
                      : <Upload className="w-6 h-6 text-stone-400" />}
                  </div>
                  <div>
                    <button type="button" onClick={() => avatarRef.current?.click()} className="btn-secondary text-sm py-1.5">Upload logo</button>
                    <p className="text-xs text-stone-400 mt-1">JPG or PNG, optional</p>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatar(e.target.files?.[0] || null, false)} />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="label flex items-center gap-1.5"><AtSign className="w-3.5 h-3.5" /> Username</label>
                <input className="input" value={v2.username} onChange={(e) => setV2((p) => ({ ...p, username: e.target.value }))} placeholder={`e.g. ${v1.venueName.toLowerCase().replace(/\s+/g, "")}`} />
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> City</label>
                  <input className="input" value={v2.city} onChange={(e) => setV2((p) => ({ ...p, city: e.target.value }))} placeholder="Tehran" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input className="input" value={v2.country} onChange={(e) => setV2((p) => ({ ...p, country: e.target.value }))} placeholder="Iran" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email *</label>
                <input required type="email" className="input" value={v2.email} onChange={(e) => setV2((p) => ({ ...p, email: e.target.value }))} placeholder="venue@example.com" />
              </div>

              {/* Password */}
              <div>
                <label className="label flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Password *</label>
                <input required type="password" className="input" value={v2.password} onChange={(e) => setV2((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" minLength={8} />
              </div>
            </div>

            <button
              disabled={loading || !v2.email || !v2.password}
              onClick={registerVenue}
              className="btn-primary w-full justify-center py-3 mt-6 disabled:opacity-40"
            >
              {loading ? "Registering venue..." : "Register Venue"}
            </button>

            <p className="text-center text-sm text-stone-500 mt-4">
              Already have an account? <Link href="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
