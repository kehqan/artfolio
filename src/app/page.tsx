import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Image,
  LayoutGrid,
  FolderOpen,
  Globe,
  MessageSquare,
  Users,
  ArrowRight,
  Palette,
  Building2,
  Sparkles,
  Shield,
  Zap,
} from "lucide-react";

/* ───────────────────────────────── Hero ───────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-accent-500/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-[400px] h-[400px] bg-accent-500/[0.03] rounded-full blur-3xl" />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div
            className="w-full h-full"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
            }}
          />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-20 w-full">
        <div className="max-w-3xl">
          <div className="opacity-0 animate-fade-up">
            <span className="section-label">For Artists & Galleries</span>
          </div>

          <h1 className="heading-xl mt-6 opacity-0 animate-fade-up stagger-1">
            Your Art Deserves
            <br />
            <span className="text-accent-400">a Better Home</span>
          </h1>

          <p className="body-lg mt-7 max-w-xl opacity-0 animate-fade-up stagger-2">
            Manage your artwork inventory, build stunning portfolios, organize
            collections, and connect with the art world — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-10 opacity-0 animate-fade-up stagger-3">
            <Link href="/register" className="btn-primary">
              <Palette size={18} />
              Join as Artist
            </Link>
            <Link href="/register" className="btn-secondary">
              <Building2 size={18} />
              Join as Gallery
            </Link>
          </div>

          <p className="text-xs text-canvas-600 mt-5 opacity-0 animate-fade-up stagger-4">
            Free to start · No credit card required
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mt-20 pt-10 border-t border-canvas-800/40 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-0 animate-fade-up stagger-5">
          {[
            { value: "Free", label: "To Get Started" },
            { value: "∞", label: "Artworks Upload" },
            { value: "Public", label: "Portfolio Pages" },
            { value: "Secure", label: "Your Data" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl md:text-3xl text-canvas-50">
                {stat.value}
              </p>
              <p className="text-sm text-canvas-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── Platform Description ────────────────────── */
function PlatformDescription() {
  return (
    <section className="py-24 md:py-32 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-canvas-950 via-canvas-950/95 to-canvas-950 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="section-label">The Platform</span>
            <h2 className="heading-lg mt-4">
              Everything an Artist
              <br />
              Needs in One Place
            </h2>
            <p className="body-lg mt-6">
              Artfolio replaces scattered spreadsheets, social accounts, and
              outdated websites with a single platform designed specifically for
              the art world.
            </p>
            <div className="mt-8 flex flex-col gap-4">
              {[
                "Inventory management built for artworks",
                "Portfolio pages that look gallery-quality",
                "Collections for exhibitions, series, and more",
                "A creative community feed",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-500 mt-2.5 shrink-0" />
                  <span className="text-canvas-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Element */}
          <div className="relative">
            <div className="aspect-[4/3] bg-canvas-900/50 border border-canvas-800/40 p-6 md:p-8">
              <div className="h-full flex flex-col">
                <div className="flex gap-2 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-canvas-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-canvas-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-canvas-700" />
                </div>
                <div className="flex-1 grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-canvas-800/50 border border-canvas-700/30 flex items-center justify-center"
                    >
                      <Image
                        size={20}
                        className="text-canvas-600"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-3">
                  <div className="h-2 bg-accent-500/20 flex-1 rounded-full" />
                  <div className="h-2 bg-canvas-800 w-1/4 rounded-full" />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-full h-full border border-accent-500/10 -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── Features Grid ───────────────────────────── */
const features = [
  {
    icon: Image,
    title: "Artwork Inventory",
    description:
      "Catalog every piece with images, dimensions, medium, price, status, and notes. Your complete artwork database.",
  },
  {
    icon: FolderOpen,
    title: "Collections",
    description:
      "Group artworks into collections for exhibitions, series, portfolios, or any way you organize your work.",
  },
  {
    icon: Globe,
    title: "Public Portfolio",
    description:
      "A beautiful, shareable portfolio page at artfolio.com/your-name. Show the world your best work.",
  },
  {
    icon: MessageSquare,
    title: "Social Feed",
    description:
      "Share updates, studio shots, works in progress, and connect with the art community.",
  },
  {
    icon: LayoutGrid,
    title: "Exhibition Management",
    description:
      "Plan and manage exhibitions with timelines, artwork selection, and venue details.",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "Follow artists and galleries, discover new work, and build meaningful connections.",
  },
];

function FeaturesGrid() {
  return (
    <section className="py-24 md:py-32 bg-canvas-900/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">Features</span>
          <h2 className="heading-lg mt-4">
            Built for the
            <br />
            Art World
          </h2>
          <p className="body-lg mt-5">
            Every feature designed with artists and galleries in mind.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-canvas-800/30">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-canvas-950 p-8 md:p-10 group hover:bg-canvas-900/30 transition-colors duration-500"
            >
              <feature.icon
                size={24}
                className="text-accent-500 mb-5"
                strokeWidth={1.5}
              />
              <h3 className="font-display text-xl text-canvas-50 mb-3">
                {feature.title}
              </h3>
              <p className="text-sm text-canvas-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── For Artists / For Galleries ──────────────────── */
function Audiences() {
  return (
    <section className="py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-px bg-canvas-800/30">
          {/* Artists */}
          <div className="bg-canvas-950 p-10 md:p-14">
            <div className="w-12 h-12 bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mb-6">
              <Palette size={22} className="text-accent-500" />
            </div>
            <h3 className="heading-md">For Artists</h3>
            <p className="text-canvas-400 mt-4 leading-relaxed">
              Whether you&#39;re an emerging artist or an established name,
              Artfolio gives you the tools to professionally manage and
              showcase your work.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {[
                "Catalog your entire body of work",
                "Build a professional portfolio",
                "Track sales and availability",
                "Share your creative journey",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <Sparkles size={14} className="text-accent-500 shrink-0" />
                  <span className="text-canvas-300">{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/register"
              className="btn-primary mt-10 inline-flex"
            >
              Start as Artist
              <ArrowRight size={16} />
            </Link>
          </div>

          {/* Galleries */}
          <div className="bg-canvas-950 p-10 md:p-14">
            <div className="w-12 h-12 bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mb-6">
              <Building2 size={22} className="text-accent-500" />
            </div>
            <h3 className="heading-md">For Galleries</h3>
            <p className="text-canvas-400 mt-4 leading-relaxed">
              Manage your roster of artists, organize exhibitions, track
              inventory across your gallery, and build your online presence.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              {[
                "Manage artist rosters and artworks",
                "Plan and promote exhibitions",
                "Track sales and consignment",
                "Showcase your gallery program",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <Sparkles size={14} className="text-accent-500 shrink-0" />
                  <span className="text-canvas-300">{item}</span>
                </div>
              ))}
            </div>
            <Link
              href="/register"
              className="btn-primary mt-10 inline-flex"
            >
              Start as Gallery
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Why Artfolio ─────────────────────────────── */
function WhyArtfolio() {
  const reasons = [
    {
      icon: Zap,
      title: "Purpose-Built",
      text: "Not another generic website builder. Every feature is designed specifically for art professionals.",
    },
    {
      icon: Shield,
      title: "Your Work, Your Data",
      text: "You own your data. Export anytime. No lock-in. Your artwork information stays yours.",
    },
    {
      icon: Globe,
      title: "Professional Presence",
      text: "A portfolio that looks like it was designed by a top agency, ready in minutes.",
    },
  ];

  return (
    <section className="py-24 md:py-32 bg-canvas-900/20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="section-label">Why Artfolio</span>
          <h2 className="heading-lg mt-4">
            Made by Art People,
            <br />
            for Art People
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reasons.map((reason) => (
            <div key={reason.title} className="text-center">
              <div className="w-14 h-14 mx-auto bg-canvas-900 border border-canvas-800 flex items-center justify-center mb-5">
                <reason.icon
                  size={22}
                  className="text-accent-500"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="font-display text-xl text-canvas-50 mb-3">
                {reason.title}
              </h3>
              <p className="text-sm text-canvas-500 leading-relaxed max-w-xs mx-auto">
                {reason.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── Final CTA ───────────────────────────────── */
function FinalCTA() {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-500/[0.04] rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-6 text-center">
        <span className="section-label">Get Started</span>
        <h2 className="heading-lg mt-4">
          Your Art Career
          <br />
          <span className="text-accent-400">Starts Here</span>
        </h2>
        <p className="body-lg mt-6 max-w-lg mx-auto">
          Join Artfolio today and give your artwork the professional home it
          deserves. Free to start, powerful as you grow.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
          <Link href="/register" className="btn-primary">
            Create Your Account
            <ArrowRight size={16} />
          </Link>
          <Link href="/features" className="btn-secondary">
            Explore Features
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────── Page ────────────────────────────────────── */
export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <PlatformDescription />
        <FeaturesGrid />
        <Audiences />
        <WhyArtfolio />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
