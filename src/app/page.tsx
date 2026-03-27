"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Palette, ShoppingBag, Users, BarChart3, Star, Instagram, Twitter, Facebook } from "lucide-react";

interface DesignSettings {
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  carouselImages: string[];
  primaryColor: string;
  accentColor: string;
  artistName: string;
  tagline: string;
}

const DEFAULT_SETTINGS: DesignSettings = {
  heroTitle: "Welcome to My Art Portfolio",
  heroSubtitle: "Discover original artwork, prints, and commissions from an independent artist.",
  heroImageUrl: "",
  carouselImages: [],
  primaryColor: "#1a1a2e",
  accentColor: "#e94560",
  artistName: "Artfolio",
  tagline: "Art that speaks.",
};

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&q=80",
  "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=1200&q=80",
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80",
  "https://images.unsplash.com/photo-1501472312651-726afe119ff1?w=1200&q=80",
];

export default function LandingPage() {
  const [settings, setSettings] = useState<DesignSettings>(DEFAULT_SETTINGS);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("artfolio_design");
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {
      // use defaults
    }
  }, []);

  const images = (settings.carouselImages && settings.carouselImages.length > 0)
    ? settings.carouselImages
    : (settings.heroImageUrl ? [settings.heroImageUrl] : FALLBACK_IMAGES);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [isTransitioning]);

  const prevSlide = useCallback(() => {
    goToSlide((currentSlide - 1 + images.length) % images.length);
  }, [currentSlide, images.length, goToSlide]);

  const nextSlide = useCallback(() => {
    goToSlide((currentSlide + 1) % images.length);
  }, [currentSlide, images.length, goToSlide]);

  // Auto-advance carousel
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [images.length, nextSlide]);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Palette className="w-6 h-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">
                {settings.artistName || "Artfolio"}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#gallery" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Gallery</a>
              <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">About</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-full hover:bg-indigo-700 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section with Carousel */}
      <section className="relative pt-16 min-h-screen flex flex-col">
        {/* Carousel */}
        <div className="relative flex-1 overflow-hidden" style={{ minHeight: "85vh" }}>
          {/* Slides */}
          {images.map((img, idx) => (
            <div
              key={idx}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: idx === currentSlide ? 1 : 0 }}
            >
              <img
                src={img}
                alt={"Artwork " + (idx + 1)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length];
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
            </div>
          ))}

          {/* Hero Text Overlay */}
          <div className="absolute inset-0 flex items-end pb-20 px-6 sm:px-12 lg:px-24">
            <div className="max-w-3xl">
              <p className="text-indigo-300 text-sm font-semibold tracking-widest uppercase mb-3">
                {settings.tagline || "Art that speaks."}
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
                {settings.heroTitle || DEFAULT_SETTINGS.heroTitle}
              </h1>
              <p className="text-lg text-gray-200 max-w-xl mb-8">
                {settings.heroSubtitle || DEFAULT_SETTINGS.heroSubtitle}
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Explore Gallery
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#about"
                  className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 px-6 py-3 rounded-full text-sm font-semibold hover:bg-white/30 transition-colors"
                >
                  Learn More
                </a>
              </div>
            </div>
          </div>

          {/* Carousel Controls */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                aria-label="Previous slide"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-colors"
                aria-label="Next slide"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToSlide(idx)}
                    className={"w-2 h-2 rounded-full transition-all duration-300 " + (idx === currentSlide ? "bg-white w-6" : "bg-white/50")}
                    aria-label={"Go to slide " + (idx + 1)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-indigo-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-indigo-200 text-sm mt-1">Artworks</div>
            </div>
            <div>
              <div className="text-3xl font-bold">200+</div>
              <div className="text-indigo-200 text-sm mt-1">Happy Clients</div>
            </div>
            <div>
              <div className="text-3xl font-bold">15+</div>
              <div className="text-indigo-200 text-sm mt-1">Exhibitions</div>
            </div>
            <div>
              <div className="text-3xl font-bold">8+</div>
              <div className="text-indigo-200 text-sm mt-1">Years of Art</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Gallery Preview */}
      <section id="gallery" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Featured Works</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              A curated selection of original pieces, prints, and commissions available for purchase.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FALLBACK_IMAGES.slice(0, 3).map((img, idx) => (
              <div key={idx} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300">
                <img
                  src={img}
                  alt={"Featured artwork " + (idx + 1)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                  <Link
                    href="/dashboard"
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-gray-900 px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-100"
                  >
                    View Details
                  </Link>
                </div>
                <div className="absolute bottom-3 left-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
            >
              View Full Gallery
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything You Need</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              A complete platform for artists to showcase, sell, and manage their creative work.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-300">
              <div className="w12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Palette className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Portfolio Showcase</h3>
              <p className="text-sm text-gray-500">
                Display your artwork in a stunning, customizable gallery that reflects your unique style.
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Sales Tracking</h3>
              <p className="text-sm text-gray-500">
                Manage your artwork sales, track revenue, and keep a full record of every transaction.
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Client CRM </h3>
              <p className="text-sm text-gray-500">
                Build lasting relationships with your collectors and clients with a built-in CRM system.
              </p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-500">
                Gain insights into your best-performing pieces, peak sales periods, and growth trends.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About / CTA Section */}
      <section id="about" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-indigo-400 text-sm font-semibold tracking-widest uppercase mb-4">About the Artist</p>
              <h2 className="text-3xl font-bold mb-6">
                {settings.artistName || "Artfolio"} — {settings.tagline || "Art that speaks."}
              </h2>
              <p className="text-gray-300 leading-relaxed mb-6">
                This platform is built for independent artists who want to take control of their creative business. Manage your portfolio, connect with clients, and track your art career — all in one place.
              </p>
              <p className="text-gray-400 leading-relaxed mb-8">
                Whether you create paintings, sculptures, digital art, or photography, Artfolio gives you the tools to share your vision with the world.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Start Your Portfolio
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="aspect-square rounded-2xl overflow-hidden">
                  <img
                    src={FALLBACK_IMAGES[0]}
                    alt="Artwork"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden mt-8">
                  <img
                    src={FALLBACK_IMAGES[1]}
                    alt="Artwork"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden -mt-8">
                  <img
                    src={FALLBACK_IMAGES[2]}
                    alt="Artwork"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="aspect-square rounded-2xl overflow-hidden">
                  <img
                    src={FALLBACK_IMAGES[3]}
                    alt="Artwork"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Quote */}
      <section className="py-16 bg-indigo-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <blockquote className="text-2xl font-medium text-gray-900 mb-6 italic">
            "Art enables us to find ourselves and lose ourselves at the same time."
          </blockquote>
          <p className="text-gray-500 text-sm">— Thomas Merton</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-400" />
              <span className="text-white font-semibold">{settings.artistName || "Artfolio"}</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#gallery" className="hover:text-white transition-colors">Gallery</a>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#about" className="hover:text-white transition-colors">About</a>
              <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            </div>
            <div className="flex gap-4">
              <a href="#" aria-label="Instagram" className="hover:text-white transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Twitter" className="hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" aria-label="Facebook" className="hover:text-white transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-xs text-gray-600">
            {"© " + new Date().getFullYear() + " " + (settings.artistName || "Artfolio") + ". All rights reserved."}
          </div>
        </div>
      </footer>
    </div>
  );
}
