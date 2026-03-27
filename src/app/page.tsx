"use client";
import { useRouter } from "next/navigation";
import { Palette, Building2, Compass } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
        <span className="text-2xl font-bold tracking-tight">Artfolio</span>
        <Link
          href="/login"
          className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
        >
          Sign in
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="text-center mb-14 max-w-lg">
          <h1 className="text-5xl font-bold tracking-tight mb-4">Why are you here?</h1>
          <p className="text-gray-400 text-lg">
            Tell us what brings you to Artfolio and we&apos;ll shape the experience around you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-3xl">
          {/* Artist */}
          <button
            onClick={() => router.push("/register?type=artist")}
            className="group flex flex-col items-start p-8 rounded-2xl border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-200 text-left cursor-pointer bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-5 group-hover:bg-black transition-colors duration-200">
              <Palette className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors duration-200" />
            </div>
            <h2 className="text-lg font-semibold mb-2">I&apos;m an Artist</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Showcase your work, connect with venues and collectors.
            </p>
          </button>

          {/* Venue */}
          <button
            onClick={() => router.push("/register?type=venue")}
            className="group flex flex-col items-start p-8 rounded-2xl border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-200 text-left cursor-pointer bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-5 group-hover:bg-black transition-colors duration-200">
              <Building2 className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors duration-200" />
            </div>
            <h2 className="text-lg font-semibold mb-2">I have a venue</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              A gallery, café, studio, or any space where art lives.
            </p>
          </button>

          {/* Explorer */}
          <button
            onClick={() => router.push("/explore")}
            className="group flex flex-col items-start p-8 rounded-2xl border border-gray-200 hover:border-black hover:shadow-xl transition-all duration-200 text-left cursor-pointer bg-white"
          >
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-5 group-hover:bg-black transition-colors duration-200">
              <Compass className="w-6 h-6 text-gray-500 group-hover:text-white transition-colors duration-200" />
            </div>
            <h2 className="text-lg font-semibold mb-2">I&apos;m here to explore</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Browse artworks, venues and artists — no signup needed.
            </p>
          </button>
        </div>
      </main>
    </div>
  );
}
