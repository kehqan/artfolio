import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #f0f0ee 0%, transparent 60%)" }}>
      {/* Minimal nav */}
      <header className="flex items-center justify-between px-8 md:px-16 py-6">
        <span className="font-display text-xl font-bold tracking-tight text-stone-900">Artfolio</span>
        <nav className="hidden md:flex items-center gap-8 text-sm text-stone-500">
          <Link href="/about" className="hover:text-stone-900 transition-colors">About</Link>
          <Link href="/explore" className="hover:text-stone-900 transition-colors">Explore</Link>
          <Link href="#features" className="hover:text-stone-900 transition-colors">Features</Link>
          <Link href="#contact" className="hover:text-stone-900 transition-colors">Contact</Link>
        </nav>
        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard" className="btn-primary text-sm py-2">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium">Sign in</Link>
              <Link href="/register" className="btn-primary text-sm py-2">Join free</Link>
            </>
          )}
        </div>
      </header>

      {/* Single-screen hero — no scroll needed */}
      <main className="flex-1 flex items-center px-8 md:px-16">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-widest uppercase text-stone-400 mb-6">Art · Community · Discovery</p>
          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight text-stone-900 mb-6">
            Where art finds<br />
            its audience.
          </h1>
          <p className="text-stone-500 text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
            A platform for artists and venues to connect, showcase work, and grow together in the Iranian art scene.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 text-white font-semibold rounded-2xl hover:bg-stone-800 transition-colors text-base group"
          >
            Get started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </main>
    </div>
  );
}
