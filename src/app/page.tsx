import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Palette, Image, FolderOpen, Globe, MessageSquare, BarChart3, ArrowRight } from "lucide-react";

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-stone-900 text-lg">Artfolio</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost">Sign in</Link>
            <Link href="/register" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <div className="max-w-7xl mx-auto px-6 py-24 text-center">
          <span className="section-label">For Artists & Galleries</span>
          <h1 className="heading-xl mt-4 mb-6">
            Your Art, Beautifully<br />
            <span className="text-emerald-600">Managed & Shared</span>
          </h1>
          <p className="body-lg max-w-xl mx-auto mb-10">
            Artfolio is the professional platform for artists and galleries to manage their inventory, build stunning portfolios, and connect with the art community.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register" className="btn-primary px-7 py-3 text-base">
              Start for Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-secondary px-7 py-3 text-base">Sign In</Link>
          </div>
        </div>

        {/* Features */}
        <div className="max-w-7xl mx-auto px-6 pb-24">
          <div className="text-center mb-12">
            <span className="section-label">Features</span>
            <h2 className="heading-lg mt-3">Everything You Need</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Image, title: "Artwork Inventory", desc: "Track every work with details, images, status, pricing, and location. Your complete art database.", color: "bg-emerald-50 text-emerald-600" },
              { icon: FolderOpen, title: "Collections", desc: "Group works into series, exhibitions, or themed sets. Organize exactly the way you think.", color: "bg-sky-50 text-sky-600" },
              { icon: Globe, title: "Public Portfolio", desc: "A gallery-quality portfolio page at artfolio.com/yourname. Stunning on every device.", color: "bg-amber-50 text-amber-600" },
              { icon: MessageSquare, title: "Social Feed", desc: "Share studio updates, works in progress, and connect with the art world community.", color: "bg-rose-50 text-rose-600" },
              { icon: BarChart3, title: "Sales Tracking", desc: "Record sales, track revenue and commissions. Stay on top of your art business.", color: "bg-purple-50 text-purple-600" },
              { icon: FolderOpen, title: "Exhibitions", desc: "Plan and manage shows with timelines, venue details, and artwork selection.", color: "bg-stone-100 text-stone-600" },
            ].map((f) => (
              <div key={f.title} className="card-hover p-6">
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-stone-900 mb-2">{f.title}</h3>
                <p className="text-sm text-stone-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border-t border-stone-200 bg-stone-900 py-20 text-center">
          <h2 className="font-display text-3xl font-semibold text-white mb-4">Ready to showcase your work?</h2>
          <p className="text-stone-400 mb-8 max-w-md mx-auto">Join artists and galleries already using Artfolio to manage and share their work.</p>
          <Link href="/register" className="btn-accent px-8 py-3 text-base">
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
