"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Palette } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "artist" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: form.name, role: form.role, email: form.email });
    }
    router.push("/dashboard");
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
          </Link>
          <h1 className="font-display text-2xl font-semibold text-stone-900">Create account</h1>
          <p className="text-stone-500 text-sm mt-1">Join the Artfolio community</p>
        </div>
        <div className="card p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">{error}</div>}
            <div>
              <label className="label">Full Name</label>
              <input required className="input" value={form.name} onChange={set("name")} placeholder="Your name" />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" required className="input" value={form.email} onChange={set("email")} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" required className="input" value={form.password} onChange={set("password")} placeholder="Min 8 characters" minLength={8} />
            </div>
            <div>
              <label className="label">I am a...</label>
              <select className="select" value={form.role} onChange={set("role")}>
                <option value="artist">Artist</option>
                <option value="gallery">Gallery</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p className="text-center text-sm text-stone-500 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
