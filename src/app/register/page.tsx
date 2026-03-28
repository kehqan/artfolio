"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, ArrowRight, Loader2, Palette, Building2 } from "lucide-react";
import Link from "next/link";

const ART_STYLES = [
  "Abstract", "Realism", "Impressionism", "Contemporary", "Minimalism",
  "Expressionism", "Surrealism", "Street Art", "Photography", "Digital",
  "Sculpture", "Mixed Media", "Illustration", "Conceptual", "Other",
];

const VENUE_TYPES = [
  "Gallery", "Café", "Restaurant", "Studio", "Museum",
  "Hotel", "Co-working Space", "Shop", "Outdoor Space", "Other",
];

const VENUE_STYLES = [
  "Modern / Minimal", "Industrial", "Classical / Traditional", "Bohemian",
  "Scandinavian", "Rustic", "Eclectic", "Luxe / High-end", "Street / Urban", "Other",
];

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const type = params.get("type") as "artist" | "venue" | null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [artistData, setArtistData] = useState({
    name: "", medium: "", years_active: "", style_tags: [] as string[],
    username: "", city: "", country: "", email: "", password: "",
  });

  const [venueData, setVenueData] = useState({
    name: "", type: "", description: "", style: "",
    owner_name: "", city: "", country: "", email: "", password: "",
  });

  const toggleStyle = (style: string) => {
    setArtistData(d => ({
      ...d,
      style_tags: d.style_tags.includes(style)
        ? d.style_tags.filter(s => s !== style)
        : d.style_tags.length < 5 ? [...d.style_tags, style] : d.style_tags,
    }));
  };

  const handleArtistSubmit = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: artistData.email,
      password: artistData.password,
    });
    if (authError || !authData.user) {
      setError(authError?.message || "Signup failed. Please try again.");
      setLoading(false);
      return;
    }
    const { error: insertError } = await supabase.from("artists").insert({
      id: authData.user.id,
      name: artistData.name,
      username: artistData.username.toLowerCase(),
      city: artistData.city,
      country: artistData.country,
      medium: artistData.medium || null,
      style_tags: artistData.style_tags.length > 0 ? artistData.style_tags : null,
      contact_email: artistData.email,
    });
    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const handleVenueSubmit = async () => {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: venueData.email,
      password: venueData.password,
    });
    if (authError || !authData.user) {
      setError(authError?.message || "Signup failed. Please try again.");
      setLoading(false);
      return;
    }
    const descFull = [venueData.description, venueData.style ? `Style: ${venueData.style}` : ""].filter(Boolean).join("\n");
    const { error: insertError } = await supabase.from("venues").insert({
      id: authData.user.id,
      name: venueData.name,
      type: venueData.type,
      city: venueData.city,
      country: venueData.country,
      description: descFull || null,
      owner_name: venueData.owner_name || null,
      contact_email: venueData.email,
    });
    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  if (!type) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <Link href="/" className="text-2xl font-bold tracking-tight">Artfolio</Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-black">Sign in</Link>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
          <h1 className="text-3xl font-bold mb-3">Create your account</h1>
          <p className="text-gray-400 mb-12">Choose how you&apos;ll use Artfolio</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-lg">
            <button onClick={() => router.push("/register?type=artist")}
              className="group border border-gray-200 rounded-2xl p-8 text-left hover:border-black hover:shadow-lg transition-all">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-black transition-colors">
                <Palette className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </div>
              <h2 className="font-semibold mb-1">I&apos;m an Artist</h2>
              <p className="text-sm text-gray-400">Share your portfolio</p>
            </button>
            <button onClick={() => router.push("/register?type=venue")}
              className="group border border-gray-200 rounded-2xl p-8 text-left hover:border-black hover:shadow-lg transition-all">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-black transition-colors">
                <Building2 className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </div>
              <h2 className="font-semibold mb-1">I have a venue</h2>
              <p className="text-sm text-gray-400">List your space</p>
            </button>
          </div>
        </main>
      </div>
    );
  }

  const isArtist = type === "artist";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
        <Link href="/" className="text-2xl font-bold tracking-tight">Artfolio</Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Step {step} of 2</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Progress bar */}
          <div className="flex gap-2 mb-10">
            <div className="h-1 rounded-full flex-1 bg-black" />
            <div className={`h-1 rounded-full flex-1 transition-all duration-300 ${step === 2 ? "bg-black" : "bg-gray-200"}`} />
      2   </div>

          {/* ── ARTIST STEP 1 ── */}
          {isArtist && step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Tell us about your art</h1>
                <p className="text-gray-400">We&apos;ll use this to personalize your profile.</p>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your full name <span className="text-red-400">*</span></label>
                  <input className="input w-full" placeholder="e.g. Sarah Kline" value={artistData.name}
                    onChange={e => setArtistData(d => ({ ...d, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Primary medium</label>
                  <input className="input w-full" placeholder="e.g. Oil painting, Photography, Sculpture" value={artistData.medium}
                    onChange={e => setArtistData(d => ({ ...d, medium: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Years of activity</label>
                  <input className="input w-full" type="number" min="0" max="80" placeholder="e.g. 8" value={artistData.years_active}
                    onChange={e => setArtistData(d => ({ ...d, years_active: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Style tags <span className="text-gray-400 font-normal text-xs">(pick up to 5)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ART_STYLES.map(s => (
                      <button key={s} type="button" onClick={() => toggleStyle(s)}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${artistData.style_tags.includes(s) ? "bg-black text-white border-black" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={() => {
                  if (!artistData.name.trim()) { setError("Please enter your name."); return; }
                  setError("");
                  setStep(2);
                }}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── ARTIST STEP 2 ── */}
          {isArtist && step === 2 && (
            <div className="space-y-6">
              <div>
                <button onClick={() => { setStep(1); setError(""); }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-black mb-5 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h1 className="text-3xl font-bold mb-2">Set up your account</h1>
                <p className="text-gray-400">Almost there{artistData.name ? `, ${artistData.name.split(" ")[0]}` : ""}.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Username <span className="text-red-400">*</span></label>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-black transition-colors">
                    <span className="px-3 text-gray-400 text-sm bg-gray-50 border-r border-gray-200 h-10 flex items-center select-none">@</span>
                    <input className="flex-1 px-3 py-2 text-sm outline-none" placeholder="yourusername"
                      value={artistData.username}
                      onChange={e => setArtistData(d => ({ ...d, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">City <span className="text-red-400">*</span></label>
                    <input className="input w-full" placeholder="e.g. Paris" value={artistData.city}
                      onChange={e => setArtistData(d => ({ ...d, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Country <span className="text-red-400">*</span></label>
                    <input className="input w-full" placeholder="e.g. France" value={artistData.country}
                      onChange={e => setArtistData(d => ({ ...d, country: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input className="input w-full" type="email" placeholder="you@example.com" value={artistData.email}
                    onChange={e => setArtistData(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password <span className="text-red-400">*</span></label>
                  <input className="input w-full" type="password" placeholder="Min. 6 characters" value={artistData.password}
                    onChange={e => setArtistData(d => ({ ...d, password: e.target.value }))} />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleArtistSubmit}
                disabled={loading || !artistData.username || !artistData.city || !artistData.country || !artistData.email || !artistData.password}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account&hellip;</> : "Create Artist Profile"}
              </button>
            </div>
          )}

          {/* ── VENUE STEP 1 ── */}
          {!isArtist && step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Tell us about your venue</h1>
                <p className="text-gray-400">Help artists understand your space.</p>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Venue name <span className="text-red-400">*</span></label>
                  <input className="input w-full" placeholder="e.g. The Frame Gallery" value={venueData.name}
                    onChange={e => setVenueData(d => ({ ...d, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type of venue <span className="text-red-400">*</span></label>
                  <div className="flex flex-wrap gap-2">
      2             {VENUE_TYPES.map(t => (
                      <button key={t} type="button" onClick={() => setVenueData(d => ({ ...d, type: t }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${venueData.type === t ? "bg-black text-white border-black" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Design style / aesthetic</label>
                  <div className="flex flex-wrap gap-2">
                    {VENUE_STYLES.map(s => (
                      <button key={s} type="button" onClick={() => setVenueData(d => ({ ...d, style: s }))}
                        className={`px-3 py-1.5 rounded-full text-sm border transition-all ${venueData.style === s ? "bg-black text-white border-black" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                        {s}
                      </button>
                    ))}
        2         </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Brief description</label>
                  <textarea className="textarea w-full" rows={3}
                    placeholder="What kind of art do you showcase? What&apos;s the vibe?"
                    value={venueData.description}
            2       onChange={e => setVenueData(d => ({ ...d, description: e.target.value }))} />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={() => {
                  if (!venueData.name.trim() || !venueData.type) { setError("Please fill in venue name and select a type."); return; }
                  setError("");
                  setStep(2);
                }}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── VENUE STEP 2 ── */}
          {!isArtist && step === 2 && (
            <div className="space-y-6">
              <div>
                <button onClick={() => { setStep(1); setError(""); }}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-black mb-5 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h1 className="text-3xl font-bold mb-2">Set up your account</h1>
                <p className="text-gray-400">One last step for {venueData.name || "your venue"}.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Your name <span className="text-red-400">*</span></label>
 2                <input className="input w-full" placeholder="Owner / manager name" value={venueData.owner_name}
                    onChange={e => setVenueData(d => ({ ...d, owner_name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">City <span className="text-red-400">*</span></label>
                    <input className="input w-full" placeholder="e.g. London" value={venueData.city}
                      onChange={e => setVenueData(d => ({ ...d, city: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Country <span className="text-red-400">*</span></label>
                    <input className="input w-full" placeholder="e.g. UK" value={venueData.country}
                      onChange={e => setVenueData(d => ({ ...d, country: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email <span className="text-red-400">*</span></label>
                  <input className="input w-full" type="email" placeholder="contact@myvenue.com" value={venueData.email}
                    onChange={e => setVenueData(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password <span className="text-red-400">*</span></label>
                  <input className="input w-full" type="password" placeholder="Min. 6 characters" value={venueData.password}
                    onChange={e => setVenueData(d => ({ ...d, password: e.target.value }))} />
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                onClick={handleVenueSubmit}
                disabled={loading || !venueData.owner_name || !venueData.city || !venueData.country || !venueData.email || !venueData.password}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account&hellip;</> : "Create Venue Profile"}
              </button>
            </div>
          )}

          <p className="text-center text-sm text-gray-400 mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-black font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
