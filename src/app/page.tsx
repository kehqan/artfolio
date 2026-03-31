import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight } from "lucide-react";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#FFD400] relative overflow-hidden">

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="text-2xl font-bold text-black tracking-tight">Artfolio</div>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/explore#about" className="text-black hover:opacity-70 transition-opacity font-medium">
            About
          </Link>
          <Link href="/explore" className="text-black hover:opacity-70 transition-opacity font-medium">
            Explore
          </Link>
          <Link href="/explore#features" className="text-black hover:opacity-70 transition-opacity font-medium">
            Features
          </Link>
          <Link href="mailto:hello@artfolio.com" className="text-black hover:opacity-70 transition-opacity font-medium">
            Contact
          </Link>
        </div>

        {user ? (
          <Link
            href="/dashboard"
            className="bg-black text-[#FFD400] hover:bg-black/90 px-6 py-2.5 font-semibold transition-colors rounded-sm"
          >
            Dashboard
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-black font-medium hover:opacity-70 transition-opacity">
              Sign in
            </Link>
            <Link
              href="/register"
              className="bg-black text-[#FFD400] hover:bg-black/90 px-6 py-2.5 font-semibold transition-colors rounded-sm"
            >
              Join free
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left — Content */}
          <div className="space-y-8">
            {/* Eyebrow */}
            <div className="flex items-center gap-2 text-black/70 tracking-wider text-sm font-medium">
              <span>ART</span>
              <span>·</span>
              <span>COMMUNITY</span>
              <span>·</span>
              <span>DISCOVERY</span>
            </div>

            {/* Headline — white knockout boxes */}
            <div className="space-y-4">
              <div className="inline-block border-4 border-black bg-white px-8 py-4">
                <h1 className="text-6xl lg:text-7xl font-bold text-black tracking-tight leading-none">
                  artist
                </h1>
              </div>
              <div className="block">
                <div className="inline-block border-4 border-black bg-white px-8 py-4">
                  <h1 className="text-6xl lg:text-7xl font-bold text-black tracking-tight leading-none">
                    + venue
                  </h1>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-black text-lg lg:text-xl max-w-md leading-relaxed">
              A platform where local artists meet venues. Showcase work. Fill walls. Build community.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-black text-[#FFD400] hover:bg-black/90 px-8 py-4 text-lg font-semibold transition-colors group rounded-sm"
              >
                Get started – it's free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div>
              <Link
                href="/explore"
                className="text-black hover:opacity-70 transition-opacity inline-flex items-center gap-2 group font-medium"
              >
                Or explore without signing up
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Right — Geometric blocks */}
          <div className="hidden lg:block relative">
            <div className="space-y-6">
              <div className="ml-auto w-3/4 h-48 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
              <div className="w-2/3 h-40 border-4 border-black bg-[#FFF9E6] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
              <div className="ml-auto w-1/2 h-32 border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Decorative elements ─────────────────────────────── */}
      <div className="absolute top-1/2 right-0 w-32 h-32 border-4 border-black/10 rounded-full -translate-y-1/2 translate-x-16" />
      <div className="absolute bottom-10 left-10 w-24 h-24 border-4 border-black/10" />
    </div>
  );
}
