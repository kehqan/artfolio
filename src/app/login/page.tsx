"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Wrong email or password. Please try again."
          : authError.message
      );
      setLoading(false);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      {/* Mobile logo */}
      <div className="lg:hidden mb-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent-500 flex items-center justify-center">
            <span className="font-display text-canvas-950 text-lg leading-none">
              A
            </span>
          </div>
          <span className="font-display text-xl text-canvas-50">
            Artfolio
          </span>
        </Link>
      </div>

      <h1 className="font-display text-2xl text-canvas-50">Log In</h1>
      <p className="text-sm text-canvas-500 mt-2">
        Enter your credentials to access your account.
      </p>

      {/* Success message from registration */}
      {searchParams.get("registered") === "true" && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          Account created successfully! Please log in.
        </div>
      )}

      {/* Auth error from callback */}
      {searchParams.get("error") === "auth" && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Authentication failed. Please try again.
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form className="mt-8 flex flex-col gap-5" onSubmit={handleLogin}>
        {/* Email */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-canvas-400 mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-4 py-3 bg-canvas-900/50 border border-canvas-800/60 text-canvas-100 placeholder:text-canvas-600 text-sm focus:outline-none focus:border-accent-500/50 focus:bg-canvas-900/80 transition-all"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium uppercase tracking-[0.15em] text-canvas-400 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-canvas-900/50 border border-canvas-800/60 text-canvas-100 placeholder:text-canvas-600 text-sm focus:outline-none focus:border-accent-500/50 focus:bg-canvas-900/80 transition-all pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-canvas-600 hover:text-canvas-400 transition-colors"
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
              Logging in...
            </>
          ) : (
            <>
              Log In
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-sm text-canvas-500 mt-8 text-center">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-accent-500 hover:text-accent-400 transition-colors"
        >
          Create one free
        </Link>
      </p>

      <Link
        href="/"
        className="block text-center text-xs text-canvas-600 hover:text-canvas-400 transition-colors mt-6"
      >
        &larr; Back to homepage
      </Link>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-canvas-900/30 items-center justify-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-accent-500/[0.04] rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-accent-500/[0.03] rounded-full blur-3xl" />
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
            <div className="w-9 h-9 bg-accent-500 flex items-center justify-center">
              <span className="font-display text-canvas-950 text-xl leading-none">
                A
              </span>
            </div>
            <span className="font-display text-2xl text-canvas-50">
              Artfolio
            </span>
          </Link>
          <h2 className="font-display text-3xl text-canvas-50 leading-tight">
            Welcome back to
            <br />
            <span className="text-accent-400">your studio.</span>
          </h2>
          <p className="text-canvas-500 mt-4 leading-relaxed">
            Pick up where you left off. Your artworks, collections, and
            portfolio are waiting for you.
          </p>
        </div>
      </div>

      {/* Right Side — Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-canvas-500" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
