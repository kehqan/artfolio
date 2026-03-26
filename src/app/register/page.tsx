"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Palette, Building2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"artist" | "gallery" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!role) {
      setError("Please select your role (Artist or Gallery).");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    // Step 1: Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        },
      },
    });

    if (authError) {
      if (authError.message.includes("already registered")) {
        setError("This email is already registered. Try logging in instead.");
      } else {
        setError(authError.message);
      }
      setLoading(false);
      return;
    }

    // Step 2: Create profile in profiles table
    if (authData.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email: email,
        full_name: name,
        role: role,
        username: email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") +
          Math.floor(Math.random() * 1000),
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        // Profile will be created via trigger as fallback
      }
    }

    // If email confirmation is disabled, go straight to dashboard
    if (authData.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      // Email confirmation is enabled — show success and redirect to login
      router.push("/login?registered=true");
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-50 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-slate-900/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-slate-900/[0.03] rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>
        <div className="relative z-10 max-w-md px-12">
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-slate-900 flex items-center justify-center">
              <span className="font-display text-white text-xl leading-none">
                A
              </span>
            </div>
            <span className="font-display text-2xl text-slate-900">
              Artfolio
            </span>
          </Link>
          <h2 className="font-display text-3xl text-slate-900 leading-tight">
            Start your
            <br />
            <span className="text-brand-600">art journey.</span>
          </h2>
          <p className="text-slate-9000 mt-4 leading-relaxed">
            Join artists and galleries who are managing their work, building
            portfolios, and connecting with the art world.
          </p>
        </div>
      </div>

      {/* Right Side — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
                <span className="font-display text-white text-lg leading-none">
                  A
                </span>
              </div>
              <span className="font-display text-xl text-slate-900">
                Artfolio
              </span>
            </Link>
          </div>

          <h1 className="font-display text-2xl text-slate-900">
            Create Account
          </h1>
          <p className="text-sm text-slate-9000 mt-2">
            Choose your role and get started in minutes.
          </p>

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleRegister}>
            {/* Role Selection */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-400 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("artist")}
                  className={`flex flex-col items-center gap-2 p-4 border transition-all duration-300 ${
                    role === "artist"
                      ? "border-brand-500 bg-slate-900/10 text-brand-600"
                      : "border-slate-200 bg-slate-50 text-slate-9000 hover:border-canvas-600"
                  }`}
                >
                  <Palette size={22} />
                  <span className="text-sm font-medium">Artist</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("gallery")}
                  className={`flex flex-col items-center gap-2 p-4 border transition-all duration-300 ${
                    role === "gallery"
                      ? "border-brand-500 bg-slate-900/10 text-brand-600"
                      : "border-slate-200 bg-slate-50 text-slate-9000 hover:border-canvas-600"
                  }`}
                >
                  <Building2 size={22} />
                  <span className="text-sm font-medium">Gallery</span>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-400 mb-2">
                {role === "gallery" ? "Gallery Name" : "Full Name"}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  role === "gallery" ? "Gallery name" : "Your full name"
                }
                className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-500 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-400 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-500 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium uppercase tracking-[0.15em] text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-4 py-3 bg-white border border-slate-200 text-slate-800 placeholder:text-slate-500 text-sm focus:outline-none focus:border-brand-500/50 focus:bg-slate-50 transition-all pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-5">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy.
          </p>

          <p className="text-sm text-slate-9000 mt-6 text-center">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-brand-600 hover:text-brand-600 transition-colors"
            >
              Log in
            </Link>
          </p>

          <Link
            href="/"
            className="block text-center text-xs text-slate-500 hover:text-slate-400 transition-colors mt-6"
          >
            &larr; Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
