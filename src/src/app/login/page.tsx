"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Palette } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
          </Link>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Welcome back</h1>
          <p className="text-stone-500 text-sm mt-1">Sign in to your Artfolio account</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="text-center text-sm text-stone-500 mt-4">
            Don't have an account?{" "}
            <Link href="/register" className="text-emerald-600 font-semibold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
