"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight } from "lucide-react";

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
    <div className="min-h-screen bg-yellow-400 flex">
      {/* Left: brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 border-r-2 border-stone-900">
        <Link href="/" className="text-xl font-black tracking-tight text-stone-900">Artfolio</Link>
        <div>
          <div className="inline-block bg-white border-2 border-stone-900 px-5 py-3 mb-4">
            <span className="font-black text-5xl text-stone-900 leading-none">welcome</span>
          </div>
          <div className="inline-block bg-white border-2 border-stone-900 px-5 py-3 ml-3">
            <span className="font-black text-5xl text-stone-900 leading-none">back.</span>
          </div>
          <p className="text-stone-700 font-semibold mt-6 max-w-xs">Art · Community · Discovery</p>
        </div>
        <p className="text-xs font-bold text-stone-600 tracking-wider uppercase">artfolio.com</p>
      </div>

      {/* Right: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <Link href="/" className="text-xl font-black tracking-tight text-stone-900">Artfolio</Link>
          </div>
          <h1 className="font-black text-3xl text-stone-900 mb-1">Sign in</h1>
          <p className="text-stone-700 font-semibold mb-8">Enter your credentials to continue</p>

          <div className="bg-white border-2 border-stone-900 p-6 shadow-yellow">
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-3 bg-stone-900 text-yellow-400 text-sm font-bold">{error}</div>
              )}
              <div>
                <label className="label">Email</label>
                <input type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-stone-900 text-yellow-400 font-black border-2 border-stone-900 hover:bg-stone-800 transition-colors disabled:opacity-50">
                {loading ? "Signing in..." : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
            <p className="text-center text-sm font-semibold text-stone-600 mt-4">
              No account?{" "}
              <Link href="/register" className="text-stone-900 font-black underline">Join Artfolio</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
