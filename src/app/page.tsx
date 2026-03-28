import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-yellow-400 flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-syne), sans-serif" }}>

      {/* ── Nav ────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 md:px-14 py-6 z-10">
        <span className="text-xl font-black tracking-tight text-stone-900">Artfolio</span>

        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-stone-700">
          <Link href="/explore#about" className="hover:text-stone-900 transition-colors">About</Link>
          <Link href="/explore" className="hover:text-stone-900 transition-colors">Explore</Link>
          <Link href="/explore#features" className="hover:text-stone-900 transition-colors">Features</Link>
          <Link href="mailto:hello@artfolio.com" className="hover:text-stone-900 transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-yellow-400 text-sm font-black border-2 border-stone-900 hover:bg-stone-800 transition-colors">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-bold text-stone-700 hover:text-stone-900 transition-colors">
                Sign in
              </Link>
              <Link href="/register"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-stone-900 text-yellow-400 text-sm font-black border-2 border-stone-900 hover:bg-stone-800 transition-colors shadow-yellow-sm">
                Join free <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── Hero — single screen, no scroll ────────────────── */}
      <main className="flex-1 flex items-center px-8 md:px-14 relative">

        {/* Decorative geometric shapes (top-right, like reference) */}
        <div className="absolute right-0 top-0 h-full w-1/3 hidden lg:flex flex-col justify-center gap-4 pr-14 pointer-events-none">
          <div className="w-28 h-40 bg-white border-2 border-stone-900 self-end" />
          <div className="w-40 h-20 bg-yellow-300 border-2 border-stone-900 self-start ml-8" />
          <div className="w-20 h-28 bg-white border-2 border-stone-900 self-end" />
        </div>

        <div className="max-w-2xl relative z-10">
          {/* Tagline */}
          <p className="text-xs font-black tracking-[0.25em] uppercase text-stone-600 mb-8">
            Art · Community · Discovery
          </p>

          {/* Main headline — white knockout boxes like the reference image */}
          <div className="space-y-3 mb-10">
            <div className="inline-block bg-white border-2 border-stone-900 px-4 py-2">
              <h1 className="text-5xl md:text-7xl font-black text-stone-900 leading-none tracking-tight">
                artist
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-block bg-white border-2 border-stone-900 px-4 py-2">
                <h1 className="text-5xl md:text-7xl font-black text-stone-900 leading-none tracking-tight">
                  + venue
                </h1>
              </div>
            </div>
          </div>

          <p className="text-stone-800 text-lg font-semibold leading-relaxed mb-10 max-w-md">
            A platform where Iranian artists meet venues. Showcase work. Fill walls. Build community.
          </p>

          {/* Single CTA */}
          <Link
            href="/register"
            className="inline-flex items-center gap-3 px-8 py-4 bg-stone-900 text-yellow-400 font-black text-base border-2 border-stone-900 hover:bg-stone-800 transition-colors group shadow-yellow"
          >
            Get started — it's free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>

          <p className="mt-4 text-xs font-bold text-stone-600">
            Or{" "}
            <Link href="/explore" className="underline hover:text-stone-900">
              explore without signing up →
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
