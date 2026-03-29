"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Palette, Building2, Compass, ArrowRight,
  Sparkles, Users, TrendingUp,
  ArrowLeft, AtSign, Mail, Lock, MapPin, Upload, Brush, Calendar, Tag, Check
} from "lucide-react";

type RoleChoice = "artist" | "venue" | "explorer" | null;
type Step = 1 | 2;

interface ArtistStep1 { name: string; style: string; yearsActive: string }
interface ArtistStep2 { username: string; city: string; country: string; email: string; password: string; avatarFile: File | null; avatarPreview: string }
interface VenueStep1  { venueName: string; venueType: string; artTypes: string[] }
interface VenueStep2  { username: string; city: string; country: string; email: string; password: string; avatarFile: File | null; avatarPreview: string }

const VENUE_TYPES = ["Gallery", "Café", "Bar", "Restaurant", "Studio", "Museum", "Event Space", "Shop", "Hotel", "Other"];
const ART_TYPES   = ["Painting", "Sculpture", "Photography", "Digital Art", "Installation", "Illustration", "Ceramics", "Textile", "Printmaking", "Mixed Media"];

const OPTIONS = [
  {
    id: "artist" as const,
    icon: Palette,
    title: "Artist",
    bubble: "I make art!",
    tagline: "Your gallery awaits",
    description: "Showcase your portfolio. Connect with venues eager for your work. Track sales and build your reputation.",
    features: [
      { icon: Sparkles, text: "Beautiful portfolio" },
      { icon: Users,    text: "Venue connections"  },
      { icon: TrendingUp, text: "Sales dashboard"  },
    ],
    accentColor: "bg-[#FF6B6B]",
  },
  {
    id: "venue" as const,
    icon: Building2,
    title: "Venue Owner",
    bubble: "I need art!",
    tagline: "Fill those walls",
    description: "Browse local talent. Book artists directly. Transform your space into a gallery that tells stories.",
    features: [
      { icon: Compass,    text: "Discover artists" },
      { icon: Users,      text: "Easy booking"     },
      { icon: Sparkles,   text: "Curate shows"     },
    ],
    accentColor: "bg-[#4ECDC4]",
  },
  {
    id: "explorer" as const,
    icon: Compass,
    title: "Art Lover",
    bubble: "Show me!",
    tagline: "The adventure begins",
    description: "Discover emerging artists. Find local exhibitions. Be part of a creative community that's shaping culture.",
    features: [
      { icon: Sparkles,   text: "Find new art"     },
      { icon: Users,      text: "Meet artists"     },
      { icon: TrendingUp, text: "Track favorites"  },
    ],
    accentColor: "bg-[#95E1D3]",
  },
];

// ─── Step-2 form shared between artist & venue ───────────────────
function AccountStep({
  title, subtitle, isVenue,
  username, setUsername,
  city, setCity,
  country, setCountry,
  email, setEmail,
  password, setPassword,
  avatarPreview, onAvatarChange,
  onBack, onSubmit, loading, error,
}: {
  title: string; subtitle: string; isVenue: boolean;
  username: string; setUsername: (v: string) => void;
  city: string; setCity: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  avatarPreview: string; onAvatarChange: (f: File) => void;
  onBack: () => void; onSubmit: (e: React.FormEvent) => void;
  loading: boolean; error: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="min-h-screen bg-[#FFD400] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)", backgroundSize: "8px 8px" }} />
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <Link href="/" className="text-2xl font-bold text-black">Artfolio</Link>
        <Link href="/login" className="text-black font-medium border-2 border-black px-4 py-2 bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">Sign in</Link>
      </nav>
      <div className="container mx-auto px-6 pb-12 relative z-10 max-w-lg">
        <button onClick={onBack} className="flex items-center gap-2 text-black font-bold mb-6 hover:opacity-70 transition-opacity">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
          <h1 className="text-3xl font-bold text-black mb-1">{title}</h1>
          <p className="text-black/60 font-medium mb-6">{subtitle}</p>
          {error && <div className="p-3 bg-black text-[#FFD400] font-bold text-sm mb-4">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Avatar */}
            <div>
              <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5">{isVenue ? "Logo / photo" : "Profile photo"}</label>
              <div className="flex items-center gap-4">
                <div onClick={() => ref.current?.click()}
                  className="w-16 h-16 border-2 border-dashed border-black cursor-pointer flex items-center justify-center overflow-hidden hover:bg-black/5 transition-colors">
                  {avatarPreview ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-black/30" />}
                </div>
                <button type="button" onClick={() => ref.current?.click()} className="text-sm font-bold border-2 border-black px-3 py-1.5 hover:bg-black/5 transition-colors">Upload</button>
                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatarChange(e.target.files[0])} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5"><AtSign className="w-3 h-3 inline mr-1" />Username</label>
              <input className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="yourname" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5"><MapPin className="w-3 h-3 inline mr-1" />City</label>
                <input className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tehran" />
              </div>
              <div>
                <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5">Country</label>
                <input className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Iran" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5"><Mail className="w-3 h-3 inline mr-1" />Email *</label>
              <input required type="email" className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5"><Lock className="w-3 h-3 inline mr-1" />Password *</label>
              <input required type="password" minLength={8} className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" />
            </div>
            <button type="submit" disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-4 bg-black text-[#FFD400] font-black text-lg border-2 border-black hover:bg-black/80 transition-colors disabled:opacity-40 group mt-2">
              {loading ? "Creating..." : <>{isVenue ? "Register Venue" : "Join Artfolio"} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
            </button>
            <p className="text-center text-sm font-semibold text-black/60">Already have an account? <Link href="/login" className="text-black font-black underline">Sign in</Link></p>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<RoleChoice>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Artist
  const [a1, setA1] = useState<ArtistStep1>({ name: "", style: "", yearsActive: "" });
  const [a2, setA2] = useState<ArtistStep2>({ username: "", city: "", country: "", email: "", password: "", avatarFile: null, avatarPreview: "" });
  // Venue
  const [v1, setV1] = useState<VenueStep1>({ venueName: "", venueType: "", artTypes: [] });
  const [v2, setV2] = useState<VenueStep2>({ username: "", city: "", country: "", email: "", password: "", avatarFile: null, avatarPreview: "" });

  function setAvatar(file: File, isArtist: boolean) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      if (isArtist) setA2((p) => ({ ...p, avatarFile: file, avatarPreview: preview }));
      else setV2((p) => ({ ...p, avatarFile: file, avatarPreview: preview }));
    };
    reader.readAsDataURL(file);
  }

  async function uploadAvatar(file: File, userId: string) {
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `avatars/${userId}.${ext}`;
    await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    return publicUrl;
  }

  async function registerArtist(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
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
    await supabase.from("artists").insert({ name: a1.name, username, city: a2.city, country: a2.country, medium: a1.style, contact_email: a2.email, avatar_url: avatarUrl });
    await supabase.from("profiles").upsert({ id: userId, email: a2.email, full_name: a1.name, role: "artist", username, avatar_url: avatarUrl, location: [a2.city, a2.country].filter(Boolean).join(", ") });
    router.push("/dashboard");
  }

  async function registerVenue(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
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
    await supabase.from("venues").insert({ name: v1.venueName, type: v1.venueType.toLowerCase(), city: v2.city, country: v2.country, contact_email: v2.email, logo_url: avatarUrl, owner_name: v1.venueName, description: v1.artTypes.length ? `Specialising in: ${v1.artTypes.join(", ")}` : null });
    await supabase.from("profiles").upsert({ id: userId, email: v2.email, full_name: v1.venueName, role: "gallery", username, avatar_url: avatarUrl, location: [v2.city, v2.country].filter(Boolean).join(", ") });
    router.push("/dashboard");
  }

  // ── Step 2: Artist ───────────────────────────────────────────────
  if (selected === "artist" && step === 2) {
    return (
      <AccountStep
        title={`Welcome, ${a1.name || "artist"} 👋`} subtitle="Set up your account"
        isVenue={false}
        username={a2.username} setUsername={(v) => setA2((p) => ({ ...p, username: v }))}
        city={a2.city} setCity={(v) => setA2((p) => ({ ...p, city: v }))}
        country={a2.country} setCountry={(v) => setA2((p) => ({ ...p, country: v }))}
        email={a2.email} setEmail={(v) => setA2((p) => ({ ...p, email: v }))}
        password={a2.password} setPassword={(v) => setA2((p) => ({ ...p, password: v }))}
        avatarPreview={a2.avatarPreview} onAvatarChange={(f) => setAvatar(f, true)}
        onBack={() => setStep(1)} onSubmit={registerArtist}
        loading={loading} error={error}
      />
    );
  }

  // ── Step 1: Artist ───────────────────────────────────────────────
  if (selected === "artist" && step === 1) {
    const valid = a1.name.trim() && a1.style.trim();
    return (
      <div className="min-h-screen bg-[#FFD400] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)", backgroundSize: "8px 8px" }} />
        <nav className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
          <Link href="/" className="text-2xl font-bold text-black">Artfolio</Link>
          <Link href="/login" className="text-black font-medium border-2 border-black px-4 py-2 bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">Sign in</Link>
        </nav>
        <div className="container mx-auto px-6 pb-12 relative z-10 max-w-lg">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-black font-bold mb-6 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-[#FF6B6B] border-b-4 border-black p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center">
                <Palette className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-black">Artist</span>
            </div>
            <div className="p-8 space-y-5">
              <div className="bg-black text-[#FFD400] px-4 py-2 inline-block font-bold text-lg relative">
                Tell us about your practice!
                <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black" />
              </div>
              <div className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5">Full name *</label>
                  <input required className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={a1.name} onChange={(e) => setA1((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Neda Rahimi" />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5"><Brush className="w-3 h-3 inline mr-1" />Style / medium *</label>
                  <input required className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={a1.style} onChange={(e) => setA1((p) => ({ ...p, style: e.target.value }))} placeholder="e.g. Abstract oil painting, photography..." />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5"><Calendar className="w-3 h-3 inline mr-1" />Years active</label>
                  <div className="grid grid-cols-5 gap-2">
                    {["< 1", "1–3", "3–7", "7–15", "15+"].map((y) => (
                      <button key={y} type="button" onClick={() => setA1((p) => ({ ...p, yearsActive: y }))}
                        className={`py-2 text-sm font-bold border-2 transition-colors ${a1.yearsActive === y ? "bg-black text-[#FFD400] border-black" : "bg-white text-black border-black hover:bg-black/5"}`}>
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button disabled={!valid} onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-black text-[#FFD400] font-black text-lg border-2 border-black hover:bg-black/80 transition-colors disabled:opacity-40 group">
                Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Venue ────────────────────────────────────────────────
  if (selected === "venue" && step === 2) {
    return (
      <AccountStep
        title={`Welcome, ${v1.venueName || "venue"} 👋`} subtitle="Set up your account"
        isVenue={true}
        username={v2.username} setUsername={(v) => setV2((p) => ({ ...p, username: v }))}
        city={v2.city} setCity={(v) => setV2((p) => ({ ...p, city: v }))}
        country={v2.country} setCountry={(v) => setV2((p) => ({ ...p, country: v }))}
        email={v2.email} setEmail={(v) => setV2((p) => ({ ...p, email: v }))}
        password={v2.password} setPassword={(v) => setV2((p) => ({ ...p, password: v }))}
        avatarPreview={v2.avatarPreview} onAvatarChange={(f) => setAvatar(f, false)}
        onBack={() => setStep(1)} onSubmit={registerVenue}
        loading={loading} error={error}
      />
    );
  }

  // ── Step 1: Venue ────────────────────────────────────────────────
  if (selected === "venue" && step === 1) {
    const valid = v1.venueName.trim() && v1.venueType;
    return (
      <div className="min-h-screen bg-[#FFD400] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)", backgroundSize: "8px 8px" }} />
        <nav className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
          <Link href="/" className="text-2xl font-bold text-black">Artfolio</Link>
          <Link href="/login" className="text-black font-medium border-2 border-black px-4 py-2 bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">Sign in</Link>
        </nav>
        <div className="container mx-auto px-6 pb-12 relative z-10 max-w-lg">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-black font-bold mb-6 hover:opacity-70 transition-opacity">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="bg-[#4ECDC4] border-b-4 border-black p-4 flex items-center gap-3">
              <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center">
                <Building2 className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-black">Venue Owner</span>
            </div>
            <div className="p-8 space-y-5">
              <div className="bg-black text-[#FFD400] px-4 py-2 inline-block font-bold text-lg relative">
                Tell us about your venue!
                <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black" />
              </div>
              <div className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5">Venue name *</label>
                  <input required className="w-full px-3.5 py-2.5 text-sm bg-white border-2 border-black text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]" value={v1.venueName} onChange={(e) => setV1((p) => ({ ...p, venueName: e.target.value }))} placeholder="e.g. Azad Art Gallery" />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5">Type of venue *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {VENUE_TYPES.map((t) => (
                      <button key={t} type="button" onClick={() => setV1((p) => ({ ...p, venueType: t }))}
                        className={`py-2 px-3 text-sm font-bold border-2 transition-colors text-left ${v1.venueType === t ? "bg-black text-[#FFD400] border-black" : "bg-white text-black border-black hover:bg-black/5"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black tracking-wider uppercase text-black/50 mb-1.5"><Tag className="w-3 h-3 inline mr-1" />Art you collect</label>
                  <div className="flex flex-wrap gap-2">
                    {ART_TYPES.map((t) => (
                      <button key={t} type="button"
                        onClick={() => setV1((p) => ({ ...p, artTypes: p.artTypes.includes(t) ? p.artTypes.filter((x) => x !== t) : [...p.artTypes, t] }))}
                        className={`px-3 py-1.5 text-xs font-bold border-2 transition-colors flex items-center gap-1 ${v1.artTypes.includes(t) ? "bg-black text-[#FFD400] border-black" : "bg-white text-black border-black hover:bg-black/5"}`}>
                        {v1.artTypes.includes(t) && <Check className="w-3 h-3" />}{t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button disabled={!valid} onClick={() => setStep(2)}
                className="w-full flex items-center justify-center gap-2 py-4 bg-black text-[#FFD400] font-black text-lg border-2 border-black hover:bg-black/80 transition-colors disabled:opacity-40 group">
                Continue <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Role picker (default) ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FFD400] relative overflow-hidden">
      {/* Dot grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, black 1px, transparent 1px)", backgroundSize: "8px 8px" }} />

      {/* Nav */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="text-2xl font-bold text-black relative">
          Artfolio
          <div className="absolute -right-8 top-1 w-6 h-0.5 bg-black/30 -rotate-12" />
          <div className="absolute -right-8 top-3 w-4 h-0.5 bg-black/30 -rotate-12" />
        </div>
        <Link href="/login" className="text-black hover:opacity-70 transition-opacity font-medium border-2 border-black px-4 py-2 bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
          Sign in
        </Link>
      </nav>

      <div className="container mx-auto px-6 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto">

          {/* Speech-bubble header */}
          <div className="mb-12 lg:mb-16 relative">
            <div className="relative inline-block">
              <div className="bg-white border-4 border-black px-8 py-6 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h1 className="text-4xl lg:text-6xl font-bold text-black">Who are you?</h1>
                <div className="absolute -bottom-6 left-12 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[24px] border-t-white" />
                <div className="absolute -bottom-8 left-[52px] w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[24px] border-t-black" />
              </div>
            </div>
            <p className="text-black text-lg lg:text-xl max-w-2xl mt-12 ml-2 font-medium">
              Pick your adventure and let's get started!
              <span className="inline-block ml-2 text-2xl">→</span>
            </p>
          </div>

          {/* Cards */}
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            {OPTIONS.map((option) => {
              const isSelected = selected === option.id;
              const isHovered  = hoveredCard === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => setSelected(option.id)}
                  onMouseEnter={() => setHoveredCard(option.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`bg-white border-4 border-black text-left relative transition-all duration-200 ease-out ${
                    isSelected ? "shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] -translate-y-2"
                    : isHovered ? "shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -translate-y-1"
                    : "shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  {/* Selected checkmark burst */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-10 h-10 bg-black flex items-center justify-center z-10">
                      <Check className="w-5 h-5 text-[#FFD400]" strokeWidth={3} />
                    </div>
                  )}

                  {/* Colored header */}
                  <div className={`${option.accentColor} border-b-4 border-black p-4`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white border-2 border-black flex items-center justify-center">
                        <option.icon className="w-6 h-6 text-black" strokeWidth={2.5} />
                      </div>
                      <div className="text-xs font-black text-black uppercase tracking-wider">{option.title}</div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Speech bubble */}
                    <div className="relative">
                      <div className="bg-black text-[#FFD400] px-4 py-2 inline-block font-bold text-lg relative">
                        {option.bubble}
                        <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-black" />
                      </div>
                    </div>

                    <div className="text-2xl font-bold text-black leading-tight">{option.tagline}</div>

                    <p className="text-black/80 leading-relaxed text-sm">{option.description}</p>

                    <div className="space-y-3 pt-4 border-t-2 border-black/10">
                      {option.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-black flex items-center justify-center shrink-0">
                            <feature.icon className="w-3.5 h-3.5 text-[#FFD400]" strokeWidth={3} />
                          </div>
                          <span className="text-sm text-black font-medium">{feature.text}</span>
                        </div>
                      ))}
                    </div>

                    {(isSelected || isHovered) && (
                      <div className="pt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-black" />
                        <ArrowRight className="w-5 h-5 text-black" strokeWidth={3} />
                        <div className="flex-1 h-2 bg-black" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            {selected ? (
              <button
                onClick={() => {
                  if (selected === "explorer") { router.push("/explore"); return; }
                  setStep(1);
                }}
                className="group relative bg-black text-[#FFD400] border-4 border-black px-16 py-6 text-2xl font-bold shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200 flex items-center gap-4"
              >
                {/* Speed lines */}
                <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-50">
                  <div className="w-12 h-1 bg-black mb-2" />
                  <div className="w-8 h-1 bg-black mb-2" />
                  <div className="w-10 h-1 bg-black" />
                </div>
                LET'S GO!
                <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" strokeWidth={3} />
              </button>
            ) : (
              <div className="bg-white border-4 border-black px-8 py-4 text-black font-bold text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                ← Pick one above to continue!
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 right-20 text-6xl opacity-20 rotate-12 select-none">★</div>
      <div className="absolute bottom-32 left-16 text-5xl opacity-20 -rotate-12 select-none">✦</div>
      <div className="absolute top-1/3 left-10 w-32 h-32 border-4 border-black/10 rotate-45" />
      <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-black/10 rounded-full" />
      <div className="absolute top-10 left-0 space-y-2 opacity-10">
        <div className="w-32 h-1 bg-black -rotate-45" />
        <div className="w-24 h-1 bg-black -rotate-45" />
        <div className="w-28 h-1 bg-black -rotate-45" />
      </div>
    </div>
  );
}
